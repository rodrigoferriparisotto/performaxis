/*
  Dia sem uso × folga — 25/11/2026 (pedido do usuário).
  A folga é aleatória (depende da ocupação), então a escala nem sempre está
  certa. Quando um dia da escala passa sem nenhum registro, ao abrir o app a
  pessoa responde se estava de folga:
    - sim → vira exceção de folga na escala (marcada como informada por ela)
            e o dia é recalculado (sai da conta)
    - não → o dia fica "sem uso" (índice 0)
  E no mês com qualquer dia sem uso, a faixa fica no máximo Prata, mesmo com
  índice médio ≥ 90 (o crédito de Lhamas segue a faixa).
*/

create table if not exists public.respostas_dia_sem_uso (
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  data date not null,
  folga boolean not null,
  respondido_em timestamptz not null default now(),
  primary key (usuario_id, data)
);
alter table public.respostas_dia_sem_uso enable row level security;
create policy "pessoa ve as proprias respostas" on public.respostas_dia_sem_uso
  for select to authenticated using (usuario_id = (select auth.uid()));
create policy "gestao ve as respostas da equipe" on public.respostas_dia_sem_uso
  for select to authenticated
  using (exists (select 1 from usuarios u, usuarios p
                  where u.id = (select auth.uid()) and u.active and u.profile::text in ('admin', 'gestor')
                    and p.id = respostas_dia_sem_uso.usuario_id and p.empresa_id = u.empresa_id));
revoke insert, update, delete on public.respostas_dia_sem_uso from anon, authenticated;

-- dias da escala (últimos 14) sem nenhum uso e ainda sem resposta
create or replace function public.dias_sem_uso_pendentes()
returns table (data date)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select d.data
    from performance_diaria d
   where d.usuario_id = (select auth.uid())
     and d.sem_uso
     and d.data >= (now() at time zone 'America/Sao_Paulo')::date - 14
     and not exists (select 1 from respostas_dia_sem_uso r where r.usuario_id = d.usuario_id and r.data = d.data)
   order by d.data;
$$;
revoke execute on function public.dias_sem_uso_pendentes() from public, anon;
grant execute on function public.dias_sem_uso_pendentes() to authenticated;

create or replace function public.responder_dia_sem_uso(p_data date, p_folga boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_usuario uuid := (select auth.uid());
  v_empresa uuid;
begin
  select empresa_id into v_empresa from usuarios where id = v_usuario and active;
  if v_empresa is null then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  -- só responde dia que de fato está pendente (escala, sem uso, até 14 dias)
  if not exists (select 1 from performance_diaria
                  where usuario_id = v_usuario and data = p_data and sem_uso
                    and data >= (now() at time zone 'America/Sao_Paulo')::date - 14) then
    raise exception 'dia não encontrado' using errcode = '22023';
  end if;

  insert into respostas_dia_sem_uso (usuario_id, data, folga) values (v_usuario, p_data, p_folga)
  on conflict (usuario_id, data) do nothing;

  if p_folga then
    insert into escala_excecoes (usuario_id, empresa_id, data, tipo, observacao)
    values (v_usuario, v_empresa, p_data, 'folga', 'Informado pelo colaborador')
    on conflict (usuario_id, data, tipo) do nothing;
    perform public.calcular_performance_dia(p_data, v_empresa);
  end if;
end;
$$;
revoke execute on function public.responder_dia_sem_uso(date, boolean) from public, anon;
grant execute on function public.responder_dia_sem_uso(date, boolean) to authenticated;

-- teto de Prata no mês com dia sem uso
do $$
declare
  v_def text := pg_get_functiondef('public.consolidar_performance_mes(uuid, int, int)'::regprocedure);
  v_antes text := $q$case when indice >= 90 then 'ouro' when indice >= 80 then 'prata' when indice >= 70 then 'bronze' end,$q$;
begin
  if position(v_antes in v_def) = 0 then
    raise exception 'trecho da faixa mensal não encontrado';
  end if;
  v_def := replace(v_def, v_antes,
    $q$case when indice >= 90 and sem_uso = 0 then 'ouro' when indice >= 80 then 'prata' when indice >= 70 then 'bronze' end,$q$);
  execute v_def;
end $$;
