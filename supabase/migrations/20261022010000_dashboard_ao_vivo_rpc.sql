/*
  Dashboard ao Vivo numa única chamada — 22/10/2026.
  APLICADA EM PRODUÇÃO via MCP em 21/10/2026, após revisão.

  Substitui as 4 funções do DashboardService usadas pela tela
  "Dashboard ao Vivo" (getRegistrosAtivos, getConcluidosHoje,
  getHistoricData, getRankingUsuarios), que faziam 44–56 requisições por
  carga, buscavam as 9 tabelas registros_* sem filtrar empresa e filtravam
  no navegador.

  dashboard_ao_vivo(p_dias) — SECURITY INVOKER (respeita RLS). A empresa é
  a do usuário logado; "hoje" é a data em America/Sao_Paulo.

  Devolve jsonb:
    empresa_id       uuid da empresa do usuário logado
    hoje             'aaaa-mm-dd' (America/Sao_Paulo)
    ativos           registros em andamento: 9 tabelas registros_* com
                     status 'em_andamento' e data = hoje, mais manutenções
                     'em_andamento'/'pausada' (sem filtro de data), com o
                     nome de quem executa (usuario_executor_id, senão
                     usuario_id; em manutenção, usuario_id)
    concluidos_hoje  { departamento: quantidade } concluídos hoje
                     (registros 'concluido' + manutenções 'concluida')
    historico        { 'aaaa-mm-dd': quantidade } dos últimos p_dias dias
                     (inclui hoje; dias sem registro = 0)
    ranking          concluídos de hoje por colaborador ativo, com tempo
                     total e médio (min), ordenado por quantidade
*/

create or replace function public.dashboard_ao_vivo(p_dias integer default 7)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with params as (
    select
      (select u.empresa_id from usuarios u where u.id = (select auth.uid())) as empresa,
      (now() at time zone 'America/Sao_Paulo')::date as hoje,
      greatest(1, least(coalesce(p_dias, 7), 31)) as dias
  ),
  periodo as (
    select empresa, hoje, dias, hoje - (dias - 1) as inicio from params
  ),
  -- todos os usuários da empresa (ativos ou não), como o service fazia
  equipe as (
    select u.id, u.name, u.profile::text as profile, u.active
      from usuarios u
     where u.empresa_id = (select empresa from periodo)
  ),
  -- registros do período que interessam à tela (em andamento ou concluídos)
  regs as (
    select 1 as ordem, 'registros_recepcao'::text as tabela, 'recepcao'::text as departamento,
           r.id, r.data, r.usuario_id, r.usuario_executor_id, r.status::text as status,
           r.hora_inicio, r.hora_fim, r.atividades, r.observacoes, null::uuid as suite_id
      from registros_recepcao r
     where r.empresa_id = (select empresa from periodo)
       and r.data between (select inicio from periodo) and (select hoje from periodo)
       and r.status::text in ('em_andamento', 'concluido')
    union all
    select 2, 'registros_camararia', 'camararia',
           r.id, r.data, r.usuario_id, r.usuario_executor_id, r.status::text,
           r.hora_inicio, r.hora_fim, r.atividades, r.observacoes, r.suite_id
      from registros_camararia r
     where r.empresa_id = (select empresa from periodo)
       and r.data between (select inicio from periodo) and (select hoje from periodo)
       and r.status::text in ('em_andamento', 'concluido')
    union all
    select 3, 'registros_revisao', 'revisao',
           r.id, r.data, r.usuario_id, r.usuario_executor_id, r.status::text,
           r.hora_inicio, r.hora_fim, r.atividades, r.observacoes, r.suite_id
      from registros_revisao r
     where r.empresa_id = (select empresa from periodo)
       and r.data between (select inicio from periodo) and (select hoje from periodo)
       and r.status::text in ('em_andamento', 'concluido')
    union all
    select 4, 'registros_areas_comuns', 'areas_comuns',
           r.id, r.data, r.usuario_id, r.usuario_executor_id, r.status::text,
           r.hora_inicio, r.hora_fim, r.atividades, r.observacoes, null::uuid
      from registros_areas_comuns r
     where r.empresa_id = (select empresa from periodo)
       and r.data between (select inicio from periodo) and (select hoje from periodo)
       and r.status::text in ('em_andamento', 'concluido')
    union all
    select 5, 'registros_gestao', 'gestao',
           r.id, r.data, r.usuario_id, r.usuario_executor_id, r.status::text,
           r.hora_inicio, r.hora_fim, r.atividades, r.observacoes, null::uuid
      from registros_gestao r
     where r.empresa_id = (select empresa from periodo)
       and r.data between (select inicio from periodo) and (select hoje from periodo)
       and r.status::text in ('em_andamento', 'concluido')
    union all
    select 6, 'registros_cozinha', 'cozinha',
           r.id, r.data, r.usuario_id, r.usuario_executor_id, r.status,
           r.hora_inicio, r.hora_fim, r.atividades, r.observacoes, null::uuid
      from registros_cozinha r
     where r.empresa_id = (select empresa from periodo)
       and r.data between (select inicio from periodo) and (select hoje from periodo)
       and r.status in ('em_andamento', 'concluido')
    union all
    select 7, 'registros_vendas', 'vendas',
           r.id, r.data, r.usuario_id, r.usuario_executor_id, r.status::text,
           r.hora_inicio, r.hora_fim, r.atividades, r.observacoes, null::uuid
      from registros_vendas r
     where r.empresa_id = (select empresa from periodo)
       and r.data between (select inicio from periodo) and (select hoje from periodo)
       and r.status::text in ('em_andamento', 'concluido')
    union all
    select 8, 'registros_atividades_diarias', 'atividades_diarias',
           r.id, r.data, r.usuario_id, r.usuario_executor_id, r.status::text,
           r.hora_inicio, r.hora_fim, r.atividades, r.observacoes, null::uuid
      from registros_atividades_diarias r
     where r.empresa_id = (select empresa from periodo)
       and r.data between (select inicio from periodo) and (select hoje from periodo)
       and r.status::text in ('em_andamento', 'concluido')
    union all
    select 9, 'registros_atividades_extras', 'atividades_extras',
           r.id, r.data, r.usuario_id, r.usuario_executor_id, r.status::text,
           r.hora_inicio, r.hora_fim, r.atividades, r.observacoes, null::uuid
      from registros_atividades_extras r
     where r.empresa_id = (select empresa from periodo)
       and r.data between (select inicio from periodo) and (select hoje from periodo)
       and r.status::text in ('em_andamento', 'concluido')
  ),
  ativos as (
    -- registros_*: em andamento hoje; mostra quem executa (executor, senão o dono)
    select r.ordem, r.tabela, r.departamento, r.id, r.status,
           r.hora_inicio, r.atividades, r.observacoes,
           s.name as suite_nome,
           null::text as local, null::text as tipo, null::text as prioridade,
           '[]'::jsonb as pausas,
           coalesce(ex.id, dono.id, coalesce(r.usuario_executor_id, r.usuario_id)) as usuario_id,
           coalesce(ex.name, dono.name, 'Usuário não encontrado') as usuario_nome,
           coalesce(ex.profile::text, dono.profile::text, 'outros') as usuario_perfil
      from regs r
      left join usuarios ex on ex.id = r.usuario_executor_id
      left join usuarios dono on dono.id = r.usuario_id
      left join suites s on s.id = r.suite_id
     where r.status = 'em_andamento'
       and r.data = (select hoje from periodo)
    union all
    -- manutenções em andamento ou pausadas (qualquer data), do usuario_id da empresa
    select 10, 'manutencoes', 'manutencao', m.id, m.status::text,
           m.hora_inicio,
           jsonb_build_array(jsonb_build_object(
             'nome', coalesce(nullif(m.descricao, ''), nullif(m.local, ''), 'Manutenção'),
             'status', case when m.status::text = 'pausada' then 'pausada' else 'em_andamento' end,
             'tipo', m.tipo,
             'prioridade', m.prioridade,
             'isManutencao', true
           )),
           m.observacoes,
           null::text,
           m.local, m.tipo::text, m.prioridade::text,
           coalesce(m.pausas, '[]'::jsonb),
           e.id, e.name, e.profile
      from manutencoes m
      join equipe e on e.id = m.usuario_id
     where m.empresa_id = (select empresa from periodo)
       and m.status::text in ('em_andamento', 'pausada')
  ),
  -- concluídos do período; quem conta é o executor (senão o dono) da empresa;
  -- em manutenção, o usuario_id
  concluidos as (
    select r.departamento, r.data,
           coalesce(r.usuario_executor_id, r.usuario_id) as usuario_id,
           null::integer as tempo_total,
           trunc(extract(epoch from (r.hora_fim - r.hora_inicio)) / 60) as minutos
      from regs r
     where r.status = 'concluido'
       and coalesce(r.usuario_executor_id, r.usuario_id) in (select id from equipe)
    union all
    select 'manutencao', m.data, m.usuario_id, m.tempo_total,
           trunc(extract(epoch from (m.hora_fim - m.hora_inicio)) / 60)
      from manutencoes m
     where m.empresa_id = (select empresa from periodo)
       and m.status::text = 'concluida'
       and m.data between (select inicio from periodo) and (select hoje from periodo)
       and m.usuario_id in (select id from equipe)
  ),
  dias as (
    select (select inicio from periodo) + g as dia
      from generate_series(0, (select dias from periodo) - 1) g
  ),
  historico as (
    select d.dia, count(c.data) as total
      from dias d
      left join concluidos c on c.data = d.dia
     group by d.dia
  ),
  ranking as (
    select e.id, e.name, e.profile,
           count(*) as total,
           coalesce(sum(coalesce(c.tempo_total::numeric,
                                 case when c.minutos >= 0 then c.minutos end)), 0) as tempo_soma,
           count(*) filter (where c.tempo_total is not null or c.minutos >= 0) as com_tempo
      from concluidos c
      join equipe e on e.id = c.usuario_id and e.active is true
     where c.data = (select hoje from periodo)
     group by e.id, e.name, e.profile
  )
  select jsonb_build_object(
    'empresa_id', (select empresa from periodo),
    'hoje', (select hoje from periodo),
    'ativos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', a.id,
               'tabela', a.tabela,
               'departamento', a.departamento,
               'status', a.status,
               'hora_inicio', a.hora_inicio,
               'atividades', a.atividades,
               'observacoes', a.observacoes,
               'suite_nome', a.suite_nome,
               'local', a.local,
               'tipo', a.tipo,
               'prioridade', a.prioridade,
               'pausas', a.pausas,
               'usuario', jsonb_build_object('id', a.usuario_id, 'name', a.usuario_nome, 'profile', a.usuario_perfil)
             ) order by a.ordem, a.hora_inicio, a.id)
        from ativos a
    ), '[]'::jsonb),
    'concluidos_hoje', coalesce((
      select jsonb_object_agg(x.departamento, x.total)
        from (select c.departamento, count(*) as total
                from concluidos c
               where c.data = (select hoje from periodo)
               group by c.departamento) x
    ), '{}'::jsonb),
    'historico', coalesce((
      select jsonb_object_agg(to_char(h.dia, 'YYYY-MM-DD'), h.total) from historico h
    ), '{}'::jsonb),
    'ranking', coalesce((
      select jsonb_agg(jsonb_build_object(
               'usuario', jsonb_build_object('id', k.id, 'name', k.name, 'profile', k.profile),
               'totalConcluidos', k.total,
               'tempoTotal', round(k.tempo_soma),
               'tempoMedio', case when k.com_tempo > 0 then round(k.tempo_soma / k.com_tempo) else 0 end
             ) order by k.total desc, k.name)
        from ranking k
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.dashboard_ao_vivo(integer) from public, anon;
grant execute on function public.dashboard_ao_vivo(integer) to authenticated, service_role;
