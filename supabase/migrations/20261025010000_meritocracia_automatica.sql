/*
  Meritocracia automática — 25/10/2026.

  O ranking lê performance_diaria/performance_mensal, que só eram alimentadas
  quando alguém rodava "Recalcular Performance" (último cálculo: 31/01/2026).
  Além disso a edge function creditava o registro a quem o CRIOU
  (usuario_id) e não a quem EXECUTOU — suíte programada pela supervisora
  contava para ela.

  Regras (as mesmas da edge function, agora em SQL e por executor):
    efetividade = itens 'realizada' / itens do checklist
    pontos do dia: <70% → 0 | 70–80% → 1 | 80–90% → 1,5 | ≥90% → 2
    ranking do dia: efetividade desc, horas trabalhadas desc
    mensal: média de efetividade desc, horas no mês desc

  calcular_performance_dia(data, empresa?)  — recalcula o dia e o mês dele
  recalcular_performance(inicio, fim)       — para a tela de admin/gestor
  pg_cron: de hora em hora (dia corrente) + 00:15 de Brasília (dia anterior)
*/

create or replace function public.calcular_performance_dia(p_data date, p_empresa uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_linhas integer;
begin
  create temporary table if not exists _perf_dia (
    empresa_id uuid, usuario_id uuid, programadas integer, realizadas integer, horas numeric
  ) on commit drop;
  truncate _perf_dia;

  insert into _perf_dia
  with regs as (
    select empresa_id, coalesce(usuario_executor_id, usuario_id) usuario_id, atividades, hora_inicio, hora_fim
      from registros_camararia where data = p_data and status::text = 'concluido'
    union all select empresa_id, coalesce(usuario_executor_id, usuario_id), atividades, hora_inicio, hora_fim
      from registros_recepcao where data = p_data and status::text = 'concluido'
    union all select empresa_id, coalesce(usuario_executor_id, usuario_id), atividades, hora_inicio, hora_fim
      from registros_revisao where data = p_data and status::text = 'concluido'
    union all select empresa_id, coalesce(usuario_executor_id, usuario_id), atividades, hora_inicio, hora_fim
      from registros_areas_comuns where data = p_data and status::text = 'concluido'
    union all select empresa_id, coalesce(usuario_executor_id, usuario_id), atividades, hora_inicio, hora_fim
      from registros_gestao where data = p_data and status::text = 'concluido'
    union all select empresa_id, coalesce(usuario_executor_id, usuario_id), atividades, hora_inicio, hora_fim
      from registros_cozinha where data = p_data and status = 'concluido'
    union all select empresa_id, coalesce(usuario_executor_id, usuario_id), atividades, hora_inicio, hora_fim
      from registros_vendas where data = p_data and status::text = 'concluido'
    union all select empresa_id, coalesce(usuario_executor_id, usuario_id), atividades, hora_inicio, hora_fim
      from registros_atividades_diarias where data = p_data and status::text = 'concluido'
    union all select empresa_id, coalesce(usuario_executor_id, usuario_id), atividades, hora_inicio, hora_fim
      from registros_atividades_extras where data = p_data and status::text = 'concluido'
  )
  select r.empresa_id, r.usuario_id,
         sum(case when jsonb_typeof(r.atividades) = 'array' then jsonb_array_length(r.atividades) else 0 end)::int,
         sum((select count(*) from jsonb_array_elements(case when jsonb_typeof(r.atividades) = 'array' then r.atividades else '[]'::jsonb end) a
               where a->>'status' = 'realizada'))::int,
         sum(greatest(extract(epoch from (r.hora_fim - r.hora_inicio)) / 3600, 0))
    from regs r
    join usuarios u on u.id = r.usuario_id and u.empresa_id = r.empresa_id and u.active
    join empresas e on e.id = r.empresa_id and e.ativo
   where (p_empresa is null or r.empresa_id = p_empresa)
   group by r.empresa_id, r.usuario_id;

  -- refaz o dia do zero (quem não tem mais registro concluído sai do dia)
  delete from performance_diaria d
   where d.data = p_data
     and (p_empresa is null or d.empresa_id = p_empresa)
     and not exists (select 1 from _perf_dia p where p.usuario_id = d.usuario_id);

  insert into performance_diaria as d (
    usuario_id, empresa_id, data, total_atividades_programadas, total_atividades_realizadas,
    percentual_efetividade, pontos_dia, total_horas_trabalhadas, ranking_dia, updated_at)
  select p.usuario_id, p.empresa_id, p_data, p.programadas, p.realizadas,
         round(coalesce(100.0 * p.realizadas / nullif(p.programadas, 0), 0), 2),
         case
           when coalesce(100.0 * p.realizadas / nullif(p.programadas, 0), 0) >= 90 then 2
           when coalesce(100.0 * p.realizadas / nullif(p.programadas, 0), 0) >= 80 then 1.5
           when coalesce(100.0 * p.realizadas / nullif(p.programadas, 0), 0) >= 70 then 1
           else 0
         end,
         round(p.horas, 2),
         row_number() over (
           partition by p.empresa_id
           order by coalesce(1.0 * p.realizadas / nullif(p.programadas, 0), 0) desc, p.horas desc),
         now()
    from _perf_dia p
  on conflict (usuario_id, data) do update set
    empresa_id = excluded.empresa_id,
    total_atividades_programadas = excluded.total_atividades_programadas,
    total_atividades_realizadas = excluded.total_atividades_realizadas,
    percentual_efetividade = excluded.percentual_efetividade,
    pontos_dia = excluded.pontos_dia,
    total_horas_trabalhadas = excluded.total_horas_trabalhadas,
    ranking_dia = excluded.ranking_dia,
    updated_at = now();

  get diagnostics v_linhas = row_count;

  perform public.consolidar_performance_mes(e.id, extract(year from p_data)::int, extract(month from p_data)::int)
     from empresas e
    where e.ativo and (p_empresa is null or e.id = p_empresa);

  return jsonb_build_object('data', p_data, 'usuarios', v_linhas);
end;
$$;

create or replace function public.consolidar_performance_mes(p_empresa uuid, p_ano int, p_mes int)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  with base as (
    select usuario_id,
           count(*) dias,
           count(*) filter (where ranking_dia = 1) primeiros,
           count(*) filter (where ranking_dia = 2) segundos,
           count(*) filter (where ranking_dia = 3) terceiros,
           sum(pontos_dia) pontos,
           avg(percentual_efetividade) efetividade,
           sum(total_horas_trabalhadas) horas
      from performance_diaria
     where empresa_id = p_empresa
       and data >= make_date(p_ano, p_mes, 1)
       and data < make_date(p_ano, p_mes, 1) + interval '1 month'
     group by usuario_id
  )
  insert into performance_mensal as m (
    usuario_id, empresa_id, mes, ano, total_dias_trabalhados,
    total_vezes_primeiro_lugar, total_vezes_segundo_lugar, total_vezes_terceiro_lugar,
    media_pontos_dia, total_pontos_mes, media_efetividade, total_horas_mes, ranking_posicao, updated_at)
  select usuario_id, p_empresa, p_mes, p_ano, dias, primeiros, segundos, terceiros,
         round(pontos / dias, 2), round(pontos, 2), round(efetividade, 2), round(horas, 2),
         row_number() over (order by efetividade desc, horas desc),
         now()
    from base
  on conflict (usuario_id, mes, ano) do update set
    empresa_id = excluded.empresa_id,
    total_dias_trabalhados = excluded.total_dias_trabalhados,
    total_vezes_primeiro_lugar = excluded.total_vezes_primeiro_lugar,
    total_vezes_segundo_lugar = excluded.total_vezes_segundo_lugar,
    total_vezes_terceiro_lugar = excluded.total_vezes_terceiro_lugar,
    media_pontos_dia = excluded.media_pontos_dia,
    total_pontos_mes = excluded.total_pontos_mes,
    media_efetividade = excluded.media_efetividade,
    total_horas_mes = excluded.total_horas_mes,
    ranking_posicao = excluded.ranking_posicao,
    updated_at = now();
$$;

-- tela "Recalcular Performance": admin/gestor da própria empresa (super admin: todas)
create or replace function public.recalcular_performance(p_inicio date, p_fim date)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_empresa uuid;
  v_dia date;
  v_dias int := 0;
begin
  select u.empresa_id into v_empresa
    from usuarios u
   where u.id = (select auth.uid()) and u.active
     and u.profile::text in ('admin', 'gestor', 'super_admin');

  if not found and not public.is_super_admin() then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  if p_fim < p_inicio or p_fim - p_inicio > 400 then
    raise exception 'período inválido (máximo 400 dias)' using errcode = '22023';
  end if;

  v_dia := p_inicio;
  while v_dia <= p_fim loop
    perform public.calcular_performance_dia(v_dia, case when public.is_super_admin() then null else v_empresa end);
    v_dias := v_dias + 1;
    v_dia := v_dia + 1;
  end loop;

  return jsonb_build_object('dias', v_dias);
end;
$$;

revoke execute on function public.calcular_performance_dia(date, uuid) from public, anon, authenticated;
revoke execute on function public.consolidar_performance_mes(uuid, int, int) from public, anon, authenticated;
revoke execute on function public.recalcular_performance(date, date) from public, anon;
grant execute on function public.recalcular_performance(date, date) to authenticated;

-- dia corrente de hora em hora; fechamento do dia anterior às 00:15 de Brasília (03:15 UTC)
select cron.schedule('performance-dia-corrente', '5 * * * *',
  $$select public.calcular_performance_dia((now() at time zone 'America/Sao_Paulo')::date)$$);
select cron.schedule('performance-fechamento-dia', '15 3 * * *',
  $$select public.calcular_performance_dia((now() at time zone 'America/Sao_Paulo')::date - 1)$$);
