/*
  Grupo de hotéis — 27/11/2026 (cliente com 3 hotéis).
  - grupos_empresas + empresas.grupo_id: o admin do sistema agrupa os hotéis
  - usuarios_grupos: gestores corporativos do grupo
  - "hotel ativo": o gestor corporativo troca usuarios.empresa_id para o hotel
    que quer ver (trocar_empresa_ativa); toda a RLS continua igual, por empresa
  - painel_grupo / ranking_grupo: visão consolidada dos hotéis do grupo
*/

create table if not exists public.grupos_empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(btrim(nome)) between 2 and 80),
  criado_em timestamptz not null default now()
);
alter table public.empresas add column if not exists grupo_id uuid references public.grupos_empresas(id) on delete set null;

create table if not exists public.usuarios_grupos (
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  grupo_id uuid not null references public.grupos_empresas(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (usuario_id, grupo_id)
);

alter table public.grupos_empresas enable row level security;
alter table public.usuarios_grupos enable row level security;
-- admin do sistema gerencia; membros leem o próprio grupo
create policy "super admin gerencia grupos" on public.grupos_empresas
  for all to authenticated using ((select public.is_super_admin())) with check ((select public.is_super_admin()));
create policy "membro ve o grupo" on public.grupos_empresas
  for select to authenticated
  using (exists (select 1 from usuarios_grupos g where g.grupo_id = grupos_empresas.id and g.usuario_id = (select auth.uid())));
create policy "super admin gerencia membros" on public.usuarios_grupos
  for all to authenticated using ((select public.is_super_admin())) with check ((select public.is_super_admin()));
create policy "membro ve a propria participacao" on public.usuarios_grupos
  for select to authenticated using (usuario_id = (select auth.uid()));

-- hotéis que a pessoa pode abrir: o próprio + os dos grupos em que é corporativa
create or replace function public.minhas_empresas()
returns table (empresa_id uuid, nome text, grupo_id uuid, grupo_nome text, ativa boolean)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with eu as (select id, empresa_id from usuarios where id = (select auth.uid()) and active)
  select e.id, e.nome::text, e.grupo_id, g.nome, e.id = (select empresa_id from eu)
    from empresas e
    left join grupos_empresas g on g.id = e.grupo_id
   where e.ativo
     and (e.id = (select empresa_id from eu)
          or e.grupo_id in (select ug.grupo_id from usuarios_grupos ug where ug.usuario_id = (select id from eu)))
   order by e.nome;
$$;
revoke execute on function public.minhas_empresas() from public, anon;
grant execute on function public.minhas_empresas() to authenticated;

create or replace function public.trocar_empresa_ativa(p_empresa uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from public.minhas_empresas() m where m.empresa_id = p_empresa) then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  update usuarios set empresa_id = p_empresa where id = (select auth.uid());
end;
$$;
revoke execute on function public.trocar_empresa_ativa(uuid) from public, anon;
grant execute on function public.trocar_empresa_ativa(uuid) to authenticated;

-- hotéis do grupo que a pessoa pode ver no consolidado (corporativo ou admin do sistema)
create or replace function public._empresas_do_grupo(p_grupo uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.id from empresas e
   where e.grupo_id = p_grupo and e.ativo
     and (public.is_super_admin()
          or exists (select 1 from usuarios_grupos ug where ug.grupo_id = p_grupo and ug.usuario_id = (select auth.uid())));
$$;
revoke execute on function public._empresas_do_grupo(uuid) from public, anon, authenticated;

-- grupos que a pessoa enxerga no painel
create or replace function public.meus_grupos()
returns table (grupo_id uuid, nome text, hoteis int)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select g.id, g.nome, (select count(*)::int from empresas e where e.grupo_id = g.id and e.ativo)
    from grupos_empresas g
   where public.is_super_admin()
      or exists (select 1 from usuarios_grupos ug where ug.grupo_id = g.id and ug.usuario_id = (select auth.uid()))
   order by g.nome;
$$;
revoke execute on function public.meus_grupos() from public, anon;
grant execute on function public.meus_grupos() to authenticated;

-- painel do dia por hotel
create or replace function public.painel_grupo(p_grupo uuid, p_data date default null)
returns table (
  empresa_id uuid, hotel text, suites int,
  gov_total int, gov_limpas int, gov_em_limpeza int, gov_por_fazer int, quartos_liberados int,
  manut_abertas int, manut_vencidas int,
  equipe_ativa int, usaram_hoje int,
  indice_mes numeric, ouro int, prata int, bronze int, sem_faixa int,
  objetos_guardados int
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with dia as (select coalesce(p_data, (now() at time zone 'America/Sao_Paulo')::date) d),
  hoteis as (select e.id, e.nome from empresas e where e.id in (select public._empresas_do_grupo(p_grupo)))
  select h.id, h.nome::text,
    (select count(*)::int from suites s where s.empresa_id = h.id),
    (select count(*)::int from registros_camararia r, dia where r.empresa_id = h.id and r.data = dia.d and r.status::text in ('programado', 'em_andamento', 'concluido')),
    (select count(*)::int from registros_camararia r, dia where r.empresa_id = h.id and r.data = dia.d and r.status::text = 'concluido'),
    (select count(*)::int from registros_camararia r, dia where r.empresa_id = h.id and r.data = dia.d and r.status::text = 'em_andamento'),
    (select count(*)::int from registros_camararia r, dia where r.empresa_id = h.id and r.data = dia.d and r.status::text = 'programado'),
    (select count(*)::int from registros_camararia r, dia where r.empresa_id = h.id and r.data = dia.d and r.quarto_liberado_em is not null),
    (select count(*)::int from manutencoes m where m.empresa_id = h.id and m.status::text not in ('concluido', 'concluida', 'cancelado', 'cancelada')),
    (select count(*)::int from manutencoes m where m.empresa_id = h.id and m.status::text not in ('concluido', 'concluida', 'cancelado', 'cancelada')
        and m.created_at < now() - case m.prioridade::text when 'alta' then interval '24 hours' when 'baixa' then interval '168 hours' else interval '72 hours' end),
    (select count(*)::int from usuarios u where u.empresa_id = h.id and u.active and u.profile::text not in ('admin', 'gestor')),
    (select count(*)::int from performance_diaria p, dia where p.empresa_id = h.id and p.data = dia.d and not p.sem_uso),
    (select round(avg(m.indice_medio), 1) from performance_mensal m, dia
      where m.empresa_id = h.id and m.ano = extract(year from dia.d) and m.mes = extract(month from dia.d)),
    (select count(*)::int from performance_mensal m, dia where m.empresa_id = h.id and m.ano = extract(year from dia.d) and m.mes = extract(month from dia.d) and m.faixa = 'ouro'),
    (select count(*)::int from performance_mensal m, dia where m.empresa_id = h.id and m.ano = extract(year from dia.d) and m.mes = extract(month from dia.d) and m.faixa = 'prata'),
    (select count(*)::int from performance_mensal m, dia where m.empresa_id = h.id and m.ano = extract(year from dia.d) and m.mes = extract(month from dia.d) and m.faixa = 'bronze'),
    (select count(*)::int from performance_mensal m, dia where m.empresa_id = h.id and m.ano = extract(year from dia.d) and m.mes = extract(month from dia.d) and m.faixa is null),
    (select count(*)::int from objetos_esquecidos o where o.empresa_id = h.id and o.status = 'guardado')
  from hoteis h
  order by h.nome;
$$;
revoke execute on function public.painel_grupo(uuid, date) from public, anon;
grant execute on function public.painel_grupo(uuid, date) to authenticated;

-- ranking do mês com todos os hotéis do grupo
create or replace function public.ranking_grupo(p_grupo uuid, p_ano int, p_mes int)
returns table (usuario_id uuid, nome text, perfil text, hotel text, indice_medio numeric, faixa text,
               selo_100 boolean, dias int, dias_sem_uso int, posicao int)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.usuario_id, u.name::text, u.profile::text, e.nome::text, m.indice_medio, m.faixa, m.selo_100,
         m.total_dias_trabalhados, m.dias_sem_uso,
         (row_number() over (order by m.indice_medio desc nulls last, m.dias_acima_80 desc, u.name))::int
    from performance_mensal m
    join usuarios u on u.id = m.usuario_id
    join empresas e on e.id = m.empresa_id
   where m.empresa_id in (select public._empresas_do_grupo(p_grupo))
     and m.ano = p_ano and m.mes = p_mes
   order by 10;
$$;
revoke execute on function public.ranking_grupo(uuid, int, int) from public, anon;
grant execute on function public.ranking_grupo(uuid, int, int) to authenticated;
