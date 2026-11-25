/*
  Push para a camareira quando a recepção marca "Quarto liberado" — 25/11/2026.
  marcar_quarto_liberado põe o aviso na fila e chama a edge function na hora
  (pg_net); o cron de 5 min reenvia o que tiver ficado para trás.
  Destinatários: quem está com a suíte em limpeza; se ainda não foi iniciada,
  as camareiras ativas com turno hoje na escala (sem escala também recebem).
*/

create table if not exists public.avisos_quarto_liberado (
  registro_id uuid primary key references public.registros_camararia(id) on delete cascade,
  empresa_id uuid not null,
  criado_em timestamptz not null default now(),
  enviado_em timestamptz
);
alter table public.avisos_quarto_liberado enable row level security;
revoke all on public.avisos_quarto_liberado from anon, authenticated;

create or replace function public.marcar_quarto_liberado(p_registro uuid, p_liberado boolean default true)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_empresa uuid;
  v_quando timestamptz := case when p_liberado then now() end;
begin
  select empresa_id into v_empresa from registros_camararia where id = p_registro;
  if v_empresa is null
     or not exists (select 1 from usuarios where id = (select auth.uid()) and active and empresa_id = v_empresa) then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  update registros_camararia
     set quarto_liberado_em = v_quando,
         quarto_liberado_por = case when p_liberado then (select auth.uid()) end
   where id = p_registro;

  if p_liberado then
    insert into avisos_quarto_liberado (registro_id, empresa_id) values (p_registro, v_empresa)
    on conflict (registro_id) do update set criado_em = now(), enviado_em = null;
    -- envia já (sem esperar o cron)
    perform net.http_post(
      url := 'https://znqwieiuilkqkugtatqg.supabase.co/functions/v1/avisar-tarefas-atrasadas',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Internal-Secret', (select valor from app_config_interna where chave = 'internal_secret')
      ),
      body := '{"apenas": "quartos_liberados"}'::jsonb,
      timeout_milliseconds := 15000
    );
  else
    delete from avisos_quarto_liberado where registro_id = p_registro and enviado_em is null;
  end if;
  return v_quando;
end;
$$;
revoke execute on function public.marcar_quarto_liberado(uuid, boolean) from public, anon;
grant execute on function public.marcar_quarto_liberado(uuid, boolean) to authenticated;

-- avisos pendentes com os destinatários (uso da edge function, service role)
create or replace function public.quartos_liberados_para_avisar()
returns table (registro_id uuid, empresa_id uuid, suite_nome text, tipo_servico text, destinatarios uuid[])
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a.registro_id, a.empresa_id,
         case when s.name ~ '^[0-9]' then 'Suíte ' || s.name else coalesce(s.name, 'Suíte') end::text,
         r.tipo_servico::text,
         case
           when r.status::text = 'em_andamento' then array[coalesce(r.usuario_executor_id, r.usuario_id)]
           else array(
             select u.id from usuarios u
              where u.empresa_id = a.empresa_id and u.active and u.profile::text = 'camararia'
                and (u.escala is null
                     or exists (select 1 from turnos_do_dia(u.id, u.escala, (now() at time zone 'America/Sao_Paulo')::date)))
           )
         end
    from avisos_quarto_liberado a
    join registros_camararia r on r.id = a.registro_id
    left join suites s on s.id = r.suite_id
   where a.enviado_em is null
     and a.criado_em > now() - interval '12 hours'
     and r.quarto_liberado_em is not null
     and r.status::text in ('programado', 'em_andamento');
$$;
revoke execute on function public.quartos_liberados_para_avisar() from public, anon, authenticated;
