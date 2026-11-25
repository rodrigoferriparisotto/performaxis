/*
  Governança — 25/11/2026 (pedido do usuário).
  1) "Quarto liberado": a recepção marca em cada suíte do dia que o hóspede já
     saiu; a camareira vê no cartão da suíte programada.
  2) Objetos esquecidos: a camareira registra foto + descrição do que o
     hóspede deixou no quarto; recepção/gestão acompanham até devolver.
*/

-- ------------------------------------------------------------ quarto liberado
alter table public.registros_camararia
  add column if not exists quarto_liberado_em timestamptz,
  add column if not exists quarto_liberado_por uuid references public.usuarios(id) on delete set null;

-- qualquer pessoa ativa da empresa marca/desmarca (recepção não edita registros da governança pela RLS)
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
  return v_quando;
end;
$$;
revoke execute on function public.marcar_quarto_liberado(uuid, boolean) from public, anon;
grant execute on function public.marcar_quarto_liberado(uuid, boolean) to authenticated;

-- suítes da governança no dia (para a recepção marcar as saídas)
create or replace function public.suites_do_dia_governanca(p_data date default null)
returns table (registro_id uuid, suite_id uuid, suite_nome text, tipo_servico text, status text,
               quarto_liberado_em timestamptz, quarto_liberado_por_nome text, camareira_nome text)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_empresa uuid;
  v_data date := coalesce(p_data, (now() at time zone 'America/Sao_Paulo')::date);
begin
  select empresa_id into v_empresa from usuarios where id = (select auth.uid()) and active;
  if v_empresa is null then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  return query
  select r.id, r.suite_id, coalesce(s.name, 'Suíte')::text, r.tipo_servico::text, r.status::text,
         r.quarto_liberado_em, quem.name::text,
         case when r.status::text = 'programado' then null else exe.name::text end
    from registros_camararia r
    left join suites s on s.id = r.suite_id
    left join usuarios quem on quem.id = r.quarto_liberado_por
    left join usuarios exe on exe.id = coalesce(r.usuario_executor_id, r.usuario_id)
   where r.empresa_id = v_empresa and r.data = v_data
     and r.status::text in ('programado', 'em_andamento', 'concluido')
     and r.tipo_servico::text <> 'suite_livre'
   order by r.quarto_liberado_em is not null, s.name;
end;
$$;
revoke execute on function public.suites_do_dia_governanca(date) from public, anon;
grant execute on function public.suites_do_dia_governanca(date) to authenticated;

-- ------------------------------------------------------------ objetos esquecidos
create table if not exists public.objetos_esquecidos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  registro_id uuid references public.registros_camararia(id) on delete set null,
  suite_id uuid,
  suite_nome text,
  descricao text not null check (length(btrim(descricao)) between 2 and 500),
  foto_url text,
  registrado_por uuid not null default auth.uid() references public.usuarios(id) on delete set null,
  registrado_em timestamptz not null default now(),
  status text not null default 'guardado' check (status in ('guardado', 'devolvido', 'descartado')),
  resolvido_por uuid references public.usuarios(id) on delete set null,
  resolvido_em timestamptz,
  observacao text check (observacao is null or length(observacao) <= 500)
);
create index if not exists objetos_esquecidos_empresa_idx on public.objetos_esquecidos (empresa_id, status, registrado_em desc);

alter table public.objetos_esquecidos enable row level security;
create policy "empresa ve objetos esquecidos" on public.objetos_esquecidos
  for select to authenticated
  using ((select public.is_super_admin())
         or exists (select 1 from usuarios u where u.id = (select auth.uid()) and u.active
                      and u.empresa_id = objetos_esquecidos.empresa_id));
create policy "equipe registra objeto esquecido" on public.objetos_esquecidos
  for insert to authenticated
  with check (registrado_por = (select auth.uid())
              and exists (select 1 from usuarios u where u.id = (select auth.uid()) and u.active
                            and u.empresa_id = objetos_esquecidos.empresa_id));
revoke update, delete on public.objetos_esquecidos from anon, authenticated;

-- devolvido / descartado (ou volta para guardado), por qualquer pessoa ativa da empresa
create or replace function public.resolver_objeto_esquecido(p_id uuid, p_status text, p_observacao text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_empresa uuid;
begin
  select empresa_id into v_empresa from objetos_esquecidos where id = p_id;
  if v_empresa is null
     or not exists (select 1 from usuarios where id = (select auth.uid()) and active and empresa_id = v_empresa) then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  if p_status not in ('guardado', 'devolvido', 'descartado') then
    raise exception 'situação inválida' using errcode = '22023';
  end if;
  update objetos_esquecidos
     set status = p_status,
         resolvido_por = case when p_status = 'guardado' then null else (select auth.uid()) end,
         resolvido_em = case when p_status = 'guardado' then null else now() end,
         observacao = coalesce(nullif(left(btrim(coalesce(p_observacao, '')), 500), ''), observacao)
   where id = p_id;
end;
$$;
revoke execute on function public.resolver_objeto_esquecido(uuid, text, text) from public, anon;
grant execute on function public.resolver_objeto_esquecido(uuid, text, text) to authenticated;
