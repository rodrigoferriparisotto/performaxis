/*
  Meritocracia por índice (0–100) — 18/11/2026 (pedido do usuário).

  O modelo anterior (efetividade sobre o checklist inteiro, desempate por horas
  somadas) prejudicava a recepção (item sem demanda contava como falha) e
  premiava registro esquecido aberto (horas em paralelo somavam até 98 h/dia).

  Índice do dia = média ponderada dos blocos avaliáveis (pesos por empresa,
  padrão 30/50/20; bloco sem dado sai da conta e o peso se redistribui):
    uso        fechou tudo o que abriu (sem registro esquecido) + iniciou até
               30 min depois do 1º turno da escala (só a partir de escala_desde)
    qualidade  realizados / itens aplicáveis ('nao_aplicavel' sai da conta);
               ≥95% = 100, 70–95% proporcional, <70% = 0; revisão reprovada zera
    ritmo      por registro com tempo estimado: real entre 50% e 120% do
               estimado = 1; até 150% = 0,5; fora disso = 0
  Dia da escala que passou sem nenhum uso = índice 0 (sem_uso).
  Faixas: ouro ≥ 90 · prata ≥ 80 · bronze ≥ 70.
  Mês: média do índice; selo_100 = todo dia da escala com início no horário,
  tudo fechado e índice ≥ 70. Horas = união dos intervalos (sem esquecidos),
  só informativas.
*/

-- ------------------------------------------------------------ configuração
alter table public.empresas add column if not exists meritocracia_config jsonb not null default '{}'::jsonb;

create or replace function public.meritocracia_config(p_empresa uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object('peso_uso', 30, 'peso_qualidade', 50, 'peso_ritmo', 20,
                            'premio_selo', '', 'premio_ouro', '', 'premio_prata', '', 'premio_bronze', '')
         || coalesce((select meritocracia_config from empresas where id = p_empresa), '{}'::jsonb);
$$;
revoke execute on function public.meritocracia_config(uuid) from public, anon;
grant execute on function public.meritocracia_config(uuid) to authenticated;

-- gestor/admin ajusta pesos e prêmios da própria empresa
create or replace function public.salvar_config_meritocracia(p_config jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_empresa uuid;
  v_cfg jsonb := '{}'::jsonb;
  v_chave text;
  v_valor int;
begin
  select u.empresa_id into v_empresa
    from usuarios u
   where u.id = (select auth.uid()) and u.active and u.profile::text in ('admin', 'gestor');
  if v_empresa is null then
    raise exception 'acesso negado' using errcode = '42501';
  end if;

  foreach v_chave in array array['peso_uso', 'peso_qualidade', 'peso_ritmo'] loop
    v_valor := coalesce((p_config->>v_chave)::int, 0);
    if v_valor < 0 or v_valor > 100 then
      raise exception 'peso inválido: %', v_chave using errcode = '22023';
    end if;
    v_cfg := v_cfg || jsonb_build_object(v_chave, v_valor);
  end loop;
  if (v_cfg->>'peso_uso')::int + (v_cfg->>'peso_qualidade')::int + (v_cfg->>'peso_ritmo')::int = 0 then
    raise exception 'a soma dos pesos precisa ser maior que zero' using errcode = '22023';
  end if;

  foreach v_chave in array array['premio_selo', 'premio_ouro', 'premio_prata', 'premio_bronze'] loop
    v_cfg := v_cfg || jsonb_build_object(v_chave, left(btrim(coalesce(p_config->>v_chave, '')), 200));
  end loop;

  update empresas set meritocracia_config = v_cfg where id = v_empresa;
  return public.meritocracia_config(v_empresa);
end;
$$;
revoke execute on function public.salvar_config_meritocracia(jsonb) from public, anon;
grant execute on function public.salvar_config_meritocracia(jsonb) to authenticated;

-- ------------------------------------------- escala vale a partir de quando
alter table public.usuarios add column if not exists escala_desde date;
update public.usuarios set escala_desde = (now() at time zone 'America/Sao_Paulo')::date
 where escala is not null and escala_desde is null;

create or replace function public.marcar_escala_desde()
returns trigger
language plpgsql
as $$
begin
  if new.escala is null then
    new.escala_desde := null;
  elsif tg_op = 'INSERT' or old.escala is null or new.escala_desde is null then
    new.escala_desde := coalesce(new.escala_desde, (now() at time zone 'America/Sao_Paulo')::date);
  end if;
  return new;
end;
$$;
drop trigger if exists trg_marcar_escala_desde on public.usuarios;
create trigger trg_marcar_escala_desde
  before insert or update of escala on public.usuarios
  for each row execute function public.marcar_escala_desde();

-- ------------------------------------------------------------ colunas novas
alter table public.performance_diaria
  alter column pontos_dia type numeric(5,1),
  add column if not exists itens_nao_aplicaveis integer not null default 0,
  add column if not exists indice numeric(5,1),
  add column if not exists nota_uso numeric(5,1),
  add column if not exists nota_qualidade numeric(5,1),
  add column if not exists nota_ritmo numeric(5,1),
  add column if not exists dia_escala boolean not null default false,
  add column if not exists turno_inicio time,
  add column if not exists primeiro_inicio timestamptz,
  add column if not exists iniciou_no_horario boolean,
  add column if not exists fechou_tudo boolean,
  add column if not exists registros_esquecidos integer not null default 0,
  add column if not exists sem_uso boolean not null default false,
  add column if not exists faixa text;

alter table public.performance_mensal
  add column if not exists indice_medio numeric(5,1),
  add column if not exists faixa text,
  add column if not exists selo_100 boolean not null default false,
  add column if not exists dias_escala integer not null default 0,
  add column if not exists dias_sem_uso integer not null default 0,
  add column if not exists dias_acima_80 integer not null default 0,
  add column if not exists dias_no_horario integer not null default 0,
  add column if not exists dias_fechou_tudo integer not null default 0;

-- ------------------------------------------------------------ cálculo do dia
create or replace function public.calcular_performance_dia(p_data date, p_empresa uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_linhas integer;
begin
  create temporary table if not exists _merito_reg (
    empresa_id uuid, usuario_id uuid, status text, atividades jsonb,
    hora_inicio timestamptz, hora_fim timestamptz, minutos_informados numeric, est_min numeric
  ) on commit drop;
  truncate _merito_reg;

  insert into _merito_reg
  with est as (
    select origem, referencia_id, minutos, minutos_revisao from tempos_estimados
  ),
  servicos as (
    select s.empresa_id, servico_para_tipo(s.nome) tipo, max(e.minutos) est_limpeza, max(e.minutos_revisao) est_revisao
      from servicos_camararia s
      left join est e on e.origem = 'servico_camararia' and e.referencia_id = s.id
     where s.ativo
     group by 1, 2
  )
  select r.empresa_id, coalesce(r.usuario_executor_id, r.usuario_id), r.status::text,
         case when r.resultado_revisao = 'reprovada'
              then (select coalesce(jsonb_agg(case when x->>'status' = 'nao_aplicavel' then x
                                                   else jsonb_set(x, '{status}', '"nao_realizada"') end), '[]'::jsonb)
                      from jsonb_array_elements(case when jsonb_typeof(r.atividades) = 'array' then r.atividades else '[]'::jsonb end) x)
              else r.atividades end,
         r.hora_inicio, r.hora_fim, r.minutos_informados, sv.est_limpeza
    from registros_camararia r
    left join servicos sv on sv.empresa_id = r.empresa_id and sv.tipo = r.tipo_servico::text
   where r.data = p_data and r.status::text in ('concluido', 'em_andamento')
  union all
  select r.empresa_id, coalesce(r.usuario_executor_id, r.usuario_id), r.status::text, r.atividades,
         r.hora_inicio, r.hora_fim, r.minutos_informados, sv.est_revisao
    from registros_revisao r
    left join servicos sv on sv.empresa_id = r.empresa_id and sv.tipo = r.tipo_servico::text
   where r.data = p_data and r.status::text in ('concluido', 'em_andamento')
  union all
  select r.empresa_id, coalesce(r.usuario_executor_id, r.usuario_id), r.status::text, r.atividades,
         r.hora_inicio, r.hora_fim, r.minutos_informados, e.minutos
    from registros_recepcao r
    left join est e on e.origem = 'tipo_recepcao' and e.referencia_id = r.tipo_recepcao_id
   where r.data = p_data and r.status::text in ('concluido', 'em_andamento')
  union all
  select r.empresa_id, coalesce(r.usuario_executor_id, r.usuario_id), r.status::text, r.atividades,
         r.hora_inicio, r.hora_fim, r.minutos_informados, e.minutos
    from registros_gestao r
    left join est e on e.origem = 'tipo_gestao' and e.referencia_id = r.tipo_gestao_id
   where r.data = p_data and r.status::text in ('concluido', 'em_andamento')
  union all
  select r.empresa_id, coalesce(r.usuario_executor_id, r.usuario_id), r.status::text, r.atividades,
         r.hora_inicio, r.hora_fim, r.minutos_informados, e.minutos
    from registros_cozinha r
    left join est e on e.origem = 'tipo_cozinha' and e.referencia_id = r.tipo_cozinha_id
   where r.data = p_data and r.status::text in ('concluido', 'em_andamento')
  union all
  select r.empresa_id, coalesce(r.usuario_executor_id, r.usuario_id), r.status::text, r.atividades,
         r.hora_inicio, r.hora_fim, r.minutos_informados, e.minutos
    from registros_atividades_diarias r
    left join est e on e.origem = 'tipo_atividade' and e.referencia_id = r.tipo_atividade_id
   where r.data = p_data and r.status::text in ('concluido', 'em_andamento')
  union all
  select r.empresa_id, coalesce(r.usuario_executor_id, r.usuario_id), r.status::text, r.atividades,
         r.hora_inicio, r.hora_fim, r.minutos_informados, e.minutos
    from registros_atividades_extras r
    left join est e on e.origem = 'tipo_extra' and e.referencia_id = r.tipo_atividade_id
   where r.data = p_data and r.status::text in ('concluido', 'em_andamento')
  union all
  select r.empresa_id, coalesce(r.usuario_executor_id, r.usuario_id), r.status::text, r.atividades,
         r.hora_inicio, r.hora_fim, r.minutos_informados, null
    from registros_areas_comuns r
   where r.data = p_data and r.status::text in ('concluido', 'em_andamento')
  union all
  select r.empresa_id, coalesce(r.usuario_executor_id, r.usuario_id), r.status::text, r.atividades,
         r.hora_inicio, r.hora_fim, r.minutos_informados, null
    from registros_vendas r
   where r.data = p_data and r.status::text in ('concluido', 'em_andamento');

  create temporary table if not exists _merito_dia (
    empresa_id uuid, usuario_id uuid, itens integer, nao_aplicaveis integer, realizadas integer,
    horas numeric, esquecidos integer, ritmo numeric, turno time, primeiro_inicio timestamptz, sem_uso boolean
  ) on commit drop;
  truncate _merito_dia;

  insert into _merito_dia
  with regs as (
    select m.*,
           (select count(*) from jsonb_array_elements(case when jsonb_typeof(m.atividades) = 'array' then m.atividades else '[]'::jsonb end)) itens,
           (select count(*) from jsonb_array_elements(case when jsonb_typeof(m.atividades) = 'array' then m.atividades else '[]'::jsonb end) a
             where a->>'status' = 'nao_aplicavel') nao_aplic,
           (select count(*) from jsonb_array_elements(case when jsonb_typeof(m.atividades) = 'array' then m.atividades else '[]'::jsonb end) a
             where a->>'status' = 'realizada') realizadas,
           extract(epoch from (m.hora_fim - m.hora_inicio)) / 60 dur_min
      from _merito_reg m
  ),
  regs2 as (
    select g.*,
           -- esquecido: ficou aberto depois do dia ou foi fechado com mais de 16 h sem informar o tempo
           ((g.status = 'em_andamento' and p_data < v_hoje)
            or (g.status = 'concluido' and g.minutos_informados is null and coalesce(g.dur_min, 0) > 960)) esquecido,
           coalesce(g.minutos_informados, case when g.dur_min between 0 and 960 then g.dur_min end) real_min
      from regs g
  ),
  inicios as (
    select empresa_id, usuario_id, hora_inicio from _merito_reg
    union all
    select m.empresa_id, coalesce(m.usuario_executor_id, m.usuario_id), m.hora_inicio
      from manutencoes m
     where m.hora_inicio is not null
       and (m.hora_inicio at time zone 'America/Sao_Paulo')::date = p_data
  ),
  pessoas as (
    select empresa_id, usuario_id from inicios
    union
    -- dia da escala que já passou sem nenhum uso também entra (índice 0)
    select u.empresa_id, u.id
      from usuarios u
     where p_data < v_hoje and u.escala is not null and p_data >= u.escala_desde
       and exists (select 1 from turnos_do_dia(u.id, u.escala, p_data))
  ),
  intervalos as (
    select usuario_id, range_agg(tstzrange(hora_inicio, hora_fim)) faixa
      from regs2
     where status = 'concluido' and not esquecido and minutos_informados is null
       and hora_fim is not null and hora_fim > hora_inicio
     group by usuario_id
  )
  select p.empresa_id, p.usuario_id,
         coalesce(sum(g.itens) filter (where g.status = 'concluido'), 0),
         coalesce(sum(g.nao_aplic) filter (where g.status = 'concluido'), 0),
         coalesce(sum(g.realizadas) filter (where g.status = 'concluido'), 0),
         coalesce((select sum(extract(epoch from upper(x) - lower(x))) / 3600 from intervalos i, unnest(i.faixa) x
                    where i.usuario_id = p.usuario_id), 0)
           + coalesce(sum(g.minutos_informados) filter (where g.status = 'concluido') / 60.0, 0),
         count(*) filter (where g.esquecido),
         avg(case when g.real_min / g.est_min between 0.5 and 1.2 then 1
                  when g.real_min / g.est_min > 1.2 and g.real_min / g.est_min <= 1.5 then 0.5
                  else 0 end)
           filter (where g.status = 'concluido' and not g.esquecido and g.est_min > 0 and g.real_min is not null),
         case when u.escala is not null and p_data >= u.escala_desde
              then (select min(t) from turnos_do_dia(u.id, u.escala, p_data) t) end,
         (select min(i.hora_inicio) from inicios i where i.usuario_id = p.usuario_id),
         not exists (select 1 from inicios i where i.usuario_id = p.usuario_id)
    from pessoas p
    join usuarios u on u.id = p.usuario_id and u.empresa_id = p.empresa_id and u.active
    join empresas e on e.id = p.empresa_id and e.ativo
    left join regs2 g on g.usuario_id = p.usuario_id
   where (p_empresa is null or p.empresa_id = p_empresa)
   group by p.empresa_id, p.usuario_id, u.id, u.escala, u.escala_desde;

  delete from performance_diaria d
   where d.data = p_data
     and (p_empresa is null or d.empresa_id = p_empresa)
     and not exists (select 1 from _merito_dia p where p.usuario_id = d.usuario_id);

  insert into performance_diaria as d (
    usuario_id, empresa_id, data, total_atividades_programadas, total_atividades_realizadas, itens_nao_aplicaveis,
    percentual_efetividade, pontos_dia, total_horas_trabalhadas, ranking_dia,
    indice, nota_uso, nota_qualidade, nota_ritmo, dia_escala, turno_inicio, primeiro_inicio,
    iniciou_no_horario, fechou_tudo, registros_esquecidos, sem_uso, faixa, updated_at)
  with base as (
    select p.*, c.cfg,
           p.itens - p.nao_aplicaveis aplicaveis,
           100.0 * p.realizadas / nullif(p.itens - p.nao_aplicaveis, 0) pct,
           case when p.turno is null then null
                when p.primeiro_inicio is null then false
                else (p.primeiro_inicio at time zone 'America/Sao_Paulo')::time <= p.turno + interval '30 minutes' end no_horario
      from _merito_dia p
      cross join lateral (select public.meritocracia_config(p.empresa_id) cfg) c
  ),
  notas as (
    select b.*,
           100.0 * ((b.esquecidos = 0)::int + coalesce(b.no_horario::int, 0)) / (1 + (b.no_horario is not null)::int) n_uso,
           case when b.pct is not null then 100.0 * least(greatest((b.pct - 70) / 25, 0), 1) end n_qual,
           case when b.ritmo is not null then 100.0 * b.ritmo end n_ritmo,
           (b.cfg->>'peso_uso')::numeric w_u, (b.cfg->>'peso_qualidade')::numeric w_q, (b.cfg->>'peso_ritmo')::numeric w_r
      from base b
  ),
  indices as (
    select n.*,
           case when n.sem_uso then 0
                else coalesce(round((n.w_u * n.n_uso + n.w_q * coalesce(n.n_qual, 0) + n.w_r * coalesce(n.n_ritmo, 0))
                                    / nullif(n.w_u + case when n.n_qual is not null then n.w_q else 0 end
                                                   + case when n.n_ritmo is not null then n.w_r else 0 end, 0), 1), 0) end idx
      from notas n
  )
  select i.usuario_id, i.empresa_id, p_data, i.itens, i.realizadas, i.nao_aplicaveis,
         round(coalesce(i.pct, 0), 2), i.idx, round(i.horas, 2),
         row_number() over (partition by i.empresa_id order by i.idx desc, i.n_qual desc nulls last, i.realizadas desc),
         i.idx, case when i.sem_uso then 0 else round(i.n_uso, 1) end, round(i.n_qual, 1), round(i.n_ritmo, 1),
         i.turno is not null, i.turno, i.primeiro_inicio,
         i.no_horario, case when i.sem_uso then null else i.esquecidos = 0 end, i.esquecidos, i.sem_uso,
         case when i.idx >= 90 then 'ouro' when i.idx >= 80 then 'prata' when i.idx >= 70 then 'bronze' end,
         now()
    from indices i
  on conflict (usuario_id, data) do update set
    empresa_id = excluded.empresa_id,
    total_atividades_programadas = excluded.total_atividades_programadas,
    total_atividades_realizadas = excluded.total_atividades_realizadas,
    itens_nao_aplicaveis = excluded.itens_nao_aplicaveis,
    percentual_efetividade = excluded.percentual_efetividade,
    pontos_dia = excluded.pontos_dia,
    total_horas_trabalhadas = excluded.total_horas_trabalhadas,
    ranking_dia = excluded.ranking_dia,
    indice = excluded.indice,
    nota_uso = excluded.nota_uso,
    nota_qualidade = excluded.nota_qualidade,
    nota_ritmo = excluded.nota_ritmo,
    dia_escala = excluded.dia_escala,
    turno_inicio = excluded.turno_inicio,
    primeiro_inicio = excluded.primeiro_inicio,
    iniciou_no_horario = excluded.iniciou_no_horario,
    fechou_tudo = excluded.fechou_tudo,
    registros_esquecidos = excluded.registros_esquecidos,
    sem_uso = excluded.sem_uso,
    faixa = excluded.faixa,
    updated_at = now();

  get diagnostics v_linhas = row_count;

  perform public.consolidar_performance_mes(e.id, extract(year from p_data)::int, extract(month from p_data)::int)
     from empresas e
    where e.ativo and (p_empresa is null or e.id = p_empresa);

  return jsonb_build_object('data', p_data, 'usuarios', v_linhas);
end;
$$;

-- ------------------------------------------------------------ consolidado do mês
create or replace function public.consolidar_performance_mes(p_empresa uuid, p_ano int, p_mes int)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from performance_mensal m
   where m.empresa_id = p_empresa and m.ano = p_ano and m.mes = p_mes
     and not exists (select 1 from performance_diaria d
                      where d.usuario_id = m.usuario_id and d.empresa_id = p_empresa
                        and d.data >= make_date(p_ano, p_mes, 1)
                        and d.data < make_date(p_ano, p_mes, 1) + interval '1 month');

  insert into performance_mensal as m (
    usuario_id, empresa_id, mes, ano, total_dias_trabalhados,
    total_vezes_primeiro_lugar, total_vezes_segundo_lugar, total_vezes_terceiro_lugar,
    media_pontos_dia, total_pontos_mes, media_efetividade, total_horas_mes, ranking_posicao,
    indice_medio, faixa, selo_100, dias_escala, dias_sem_uso, dias_acima_80, dias_no_horario, dias_fechou_tudo,
    updated_at)
  with base as (
    select usuario_id,
           count(*) filter (where not sem_uso) dias,
           count(*) filter (where ranking_dia = 1) primeiros,
           count(*) filter (where ranking_dia = 2) segundos,
           count(*) filter (where ranking_dia = 3) terceiros,
           avg(coalesce(indice, 0)) indice,
           sum(coalesce(indice, 0)) soma,
           avg(percentual_efetividade) filter (where not sem_uso) efetividade,
           sum(total_horas_trabalhadas) horas,
           count(*) filter (where dia_escala) dias_escala,
           count(*) filter (where sem_uso) sem_uso,
           count(*) filter (where indice >= 80) acima_80,
           count(*) filter (where iniciou_no_horario) no_horario,
           count(*) filter (where fechou_tudo) fechou,
           count(*) filter (where dia_escala and (sem_uso or not coalesce(iniciou_no_horario, false)
                                                  or not coalesce(fechou_tudo, false) or coalesce(indice, 0) < 70)) falhas_selo
      from performance_diaria
     where empresa_id = p_empresa
       and data >= make_date(p_ano, p_mes, 1)
       and data < make_date(p_ano, p_mes, 1) + interval '1 month'
     group by usuario_id
  )
  select usuario_id, p_empresa, p_mes, p_ano, dias, primeiros, segundos, terceiros,
         round(indice, 2), round(soma, 2), round(coalesce(efetividade, 0), 2), round(coalesce(horas, 0), 2),
         row_number() over (order by indice desc, acima_80 desc, dias desc),
         round(indice, 1),
         case when indice >= 90 then 'ouro' when indice >= 80 then 'prata' when indice >= 70 then 'bronze' end,
         dias_escala > 0 and falhas_selo = 0,
         dias_escala, sem_uso, acima_80, no_horario, fechou,
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
    indice_medio = excluded.indice_medio,
    faixa = excluded.faixa,
    selo_100 = excluded.selo_100,
    dias_escala = excluded.dias_escala,
    dias_sem_uso = excluded.dias_sem_uso,
    dias_acima_80 = excluded.dias_acima_80,
    dias_no_horario = excluded.dias_no_horario,
    dias_fechou_tudo = excluded.dias_fechou_tudo,
    updated_at = now();
end;
$$;

revoke execute on function public.calcular_performance_dia(date, uuid) from public, anon, authenticated;
revoke execute on function public.consolidar_performance_mes(uuid, int, int) from public, anon, authenticated;
