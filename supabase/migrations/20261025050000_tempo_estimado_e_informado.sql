/*
  Tempo estimado × tempo real — 25/10/2026.

  - registros_*.minutos_informados: quando o registro é encerrado em menos de
    5 min, o app pergunta quanto tempo a pessoa levou (registro feito depois do
    trabalho). Passa a valer no lugar de hora_fim - hora_inicio.
  - tempo estimado definido pelo gestor (o funcionário não vê na tela):
      servicos_camararia.tempo_estimado_min / tempo_estimado_revisao_min
      tipos_recepcao / tipos_gestao / tipos_atividades / tipos_extras /
      tipos_cozinha .tempo_estimado_min
  - tempo_real_vs_estimado(inicio, fim): só admin/gestor, da própria empresa
  - meritocracia: horas usam minutos_informados quando houver
*/

do $$
declare t text;
begin
  foreach t in array array['registros_camararia','registros_recepcao','registros_revisao','registros_areas_comuns',
                           'registros_gestao','registros_cozinha','registros_vendas',
                           'registros_atividades_diarias','registros_atividades_extras'] loop
    execute format('alter table public.%I add column if not exists minutos_informados smallint
                    check (minutos_informados is null or minutos_informados between 1 and 720)', t);
  end loop;
  foreach t in array array['tipos_recepcao','tipos_gestao','tipos_atividades','tipos_extras','tipos_cozinha'] loop
    execute format('alter table public.%I add column if not exists tempo_estimado_min smallint
                    check (tempo_estimado_min is null or tempo_estimado_min between 1 and 720)', t);
  end loop;
end $$;

alter table public.servicos_camararia
  add column if not exists tempo_estimado_min smallint
    check (tempo_estimado_min is null or tempo_estimado_min between 1 and 720),
  add column if not exists tempo_estimado_revisao_min smallint
    check (tempo_estimado_revisao_min is null or tempo_estimado_revisao_min between 1 and 720);

-- mesmo mapeamento nome do serviço → tipo_servico usado no app (mapearServicoParaEnum)
create or replace function public.servico_para_tipo(p_nome text)
returns text
language sql
immutable
as $$
  select case
    when lower(btrim(p_nome)) in ('check-in','checkin','check in','chegada','entrada') then 'check_in'
    when lower(btrim(p_nome)) in ('check-out','checkout','check out','saida','saída') then 'check_out'
    when lower(btrim(p_nome)) in ('permanencia','permanência') then 'permanencia'
    else 'suite_livre'
  end;
$$;

create or replace function public.tempo_real_vs_estimado(p_inicio date, p_fim date)
returns table (
  modulo text, tipo text, usuario_id uuid, usuario text,
  registros int, estimado_min int, media_real_min numeric,
  acima int, rapidos int, informados int
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_empresa uuid;
begin
  select u.empresa_id into v_empresa
    from usuarios u
   where u.id = (select auth.uid()) and u.active
     and u.profile::text in ('admin', 'gestor', 'super_admin');
  if v_empresa is null then
    raise exception 'acesso negado' using errcode = '42501';
  end if;

  return query
  with servicos as (
    select servico_para_tipo(s.nome) tipo, max(s.nome) nome,
           max(s.tempo_estimado_min) est_limpeza, max(s.tempo_estimado_revisao_min) est_revisao
      from servicos_camararia s
     where s.empresa_id = v_empresa and s.ativo
     group by 1
  ),
  regs as (
    select 'Governança' modulo, coalesce(sv.nome, r.tipo_servico::text) tipo, sv.est_limpeza est,
           coalesce(r.usuario_executor_id, r.usuario_id) uid, r.hora_inicio, r.hora_fim, r.minutos_informados
      from registros_camararia r left join servicos sv on sv.tipo = r.tipo_servico::text
     where r.empresa_id = v_empresa and r.status::text = 'concluido' and r.data between p_inicio and p_fim
    union all
    select 'Revisão', coalesce(sv.nome, r.tipo_servico::text), sv.est_revisao,
           coalesce(r.usuario_executor_id, r.usuario_id), r.hora_inicio, r.hora_fim, r.minutos_informados
      from registros_revisao r left join servicos sv on sv.tipo = r.tipo_servico::text
     where r.empresa_id = v_empresa and r.status::text = 'concluido' and r.data between p_inicio and p_fim
    union all
    select 'Recepção', t.nome, t.tempo_estimado_min,
           coalesce(r.usuario_executor_id, r.usuario_id), r.hora_inicio, r.hora_fim, r.minutos_informados
      from registros_recepcao r left join tipos_recepcao t on t.id = r.tipo_recepcao_id
     where r.empresa_id = v_empresa and r.status::text = 'concluido' and r.data between p_inicio and p_fim
    union all
    select 'Gestão', t.nome, t.tempo_estimado_min,
           coalesce(r.usuario_executor_id, r.usuario_id), r.hora_inicio, r.hora_fim, r.minutos_informados
      from registros_gestao r left join tipos_gestao t on t.id = r.tipo_gestao_id
     where r.empresa_id = v_empresa and r.status::text = 'concluido' and r.data between p_inicio and p_fim
    union all
    select 'Cozinha', t.nome, t.tempo_estimado_min,
           coalesce(r.usuario_executor_id, r.usuario_id), r.hora_inicio, r.hora_fim, r.minutos_informados
      from registros_cozinha r left join tipos_cozinha t on t.id = r.tipo_cozinha_id
     where r.empresa_id = v_empresa and r.status = 'concluido' and r.data between p_inicio and p_fim
    union all
    select 'Atividades Diárias', t.nome, t.tempo_estimado_min,
           coalesce(r.usuario_executor_id, r.usuario_id), r.hora_inicio, r.hora_fim, r.minutos_informados
      from registros_atividades_diarias r left join tipos_atividades t on t.id = r.tipo_atividade_id
     where r.empresa_id = v_empresa and r.status::text = 'concluido' and r.data between p_inicio and p_fim
    union all
    select 'Atividades Extras', t.nome, t.tempo_estimado_min,
           coalesce(r.usuario_executor_id, r.usuario_id), r.hora_inicio, r.hora_fim, r.minutos_informados
      from registros_atividades_extras r left join tipos_extras t on t.id = r.tipo_atividade_id
     where r.empresa_id = v_empresa and r.status::text = 'concluido' and r.data between p_inicio and p_fim
    union all
    select 'Áreas Comuns', null, null,
           coalesce(r.usuario_executor_id, r.usuario_id), r.hora_inicio, r.hora_fim, r.minutos_informados
      from registros_areas_comuns r
     where r.empresa_id = v_empresa and r.status::text = 'concluido' and r.data between p_inicio and p_fim
    union all
    select 'Vendas', null, null,
           coalesce(r.usuario_executor_id, r.usuario_id), r.hora_inicio, r.hora_fim, r.minutos_informados
      from registros_vendas r
     where r.empresa_id = v_empresa and r.status::text = 'concluido' and r.data between p_inicio and p_fim
  ),
  medidos as (
    select g.*, coalesce(g.minutos_informados::numeric,
                         greatest(extract(epoch from (g.hora_fim - g.hora_inicio)) / 60, 0)) real_min
      from regs g
     where g.hora_fim is not null or g.minutos_informados is not null
  )
  select m.modulo, coalesce(m.tipo, '—'), m.uid, coalesce(u.name, 'Usuário removido'),
         count(*)::int,
         max(m.est)::int,
         round(avg(m.real_min), 1),
         count(*) filter (where m.est is not null and m.real_min > m.est * 1.2)::int,
         count(*) filter (where m.est is not null and m.real_min < m.est * 0.5)::int,
         count(*) filter (where m.minutos_informados is not null)::int
    from medidos m
    left join usuarios u on u.id = m.uid
   group by m.modulo, m.tipo, m.uid, u.name
   order by m.modulo, coalesce(m.tipo, '—'), avg(m.real_min) desc;
end;
$$;
revoke execute on function public.tempo_real_vs_estimado(date, date) from public, anon;
grant execute on function public.tempo_real_vs_estimado(date, date) to authenticated;

-- meritocracia: horas usam minutos_informados quando houver
do $$
declare v_def text; v_novo text;
begin
  select pg_get_functiondef('public.calcular_performance_dia(date, uuid)'::regprocedure) into v_def;
  if position('minutos_informados' in v_def) = 0 then
    v_novo := replace(v_def, E'atividades, hora_inicio, hora_fim\n', E'atividades, hora_inicio, hora_fim, minutos_informados\n');
    v_novo := replace(v_novo,
      'sum(greatest(extract(epoch from (r.hora_fim - r.hora_inicio)) / 3600, 0))',
      'sum(coalesce(r.minutos_informados / 60.0, greatest(extract(epoch from (r.hora_fim - r.hora_inicio)) / 3600, 0)))');
    if (length(v_novo) - length(replace(v_novo, 'minutos_informados', ''))) / length('minutos_informados') < 10 then
      raise exception 'substituição incompleta em calcular_performance_dia';
    end if;
    execute v_novo;
  end if;
end $$;
