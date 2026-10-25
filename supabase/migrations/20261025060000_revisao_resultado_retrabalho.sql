/*
  Revisão com resultado e retrabalho — 25/10/2026.

  Só 4 revisões para 134 limpezas em 30 dias e nenhuma consequência quando a
  suíte não estava boa.
  - registros_revisao.resultado ('aprovada' | 'reprovada') + motivo_reprovacao
  - registros_camararia.resultado_revisao (copiado pelo gatilho)
  - reprovada → cria na hora um registro 'programado' da mesma suíte/serviço
    (retrabalho), com 'RETRABALHO: <motivo>' nas observações
  - meritocracia: limpeza reprovada não conta itens como realizados
*/

alter table public.registros_revisao
  add column if not exists resultado text check (resultado in ('aprovada', 'reprovada')),
  add column if not exists motivo_reprovacao text;

alter table public.registros_camararia
  add column if not exists resultado_revisao text check (resultado_revisao in ('aprovada', 'reprovada'));

create or replace function public.aplicar_resultado_revisao()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_original registros_camararia%rowtype;
begin
  if new.resultado is null or new.registro_camararia_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.resultado is not distinct from new.resultado then
    return new;
  end if;

  update registros_camararia
     set resultado_revisao = new.resultado
   where id = new.registro_camararia_id
  returning * into v_original;

  if new.resultado = 'reprovada' and v_original.id is not null then
    insert into registros_camararia (
      data, suite_id, tipo_servico, usuario_id, empresa_id, status,
      hora_inicio, atividades, observacoes, fotos)
    values (
      (now() at time zone 'America/Sao_Paulo')::date,
      v_original.suite_id, v_original.tipo_servico,
      coalesce(new.usuario_executor_id, new.usuario_id), v_original.empresa_id, 'programado',
      now(), '[]'::jsonb,
      'RETRABALHO: ' || coalesce(nullif(btrim(new.motivo_reprovacao), ''), 'reprovada na revisão'),
      '{}');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_resultado_revisao on public.registros_revisao;
create trigger trg_resultado_revisao
  after insert or update of resultado on public.registros_revisao
  for each row execute function public.aplicar_resultado_revisao();

-- meritocracia: itens de limpeza reprovada não contam como realizados
do $$
declare v_def text; v_novo text;
begin
  select pg_get_functiondef('public.calcular_performance_dia(date, uuid)'::regprocedure) into v_def;
  if position('resultado_revisao' in v_def) = 0 then
    v_novo := replace(v_def,
      E'select empresa_id, coalesce(usuario_executor_id, usuario_id) usuario_id, atividades, hora_inicio, hora_fim, minutos_informados\n      from registros_camararia',
      E'select empresa_id, coalesce(usuario_executor_id, usuario_id) usuario_id,\n             case when resultado_revisao = ''reprovada'' then (select coalesce(jsonb_agg(jsonb_set(x, ''{status}'', ''"nao_realizada"'')), ''[]''::jsonb) from jsonb_array_elements(atividades) x) else atividades end,\n             hora_inicio, hora_fim, minutos_informados\n      from registros_camararia');
    if position('resultado_revisao' in v_novo) = 0 then
      raise exception 'calcular_performance_dia mudou; ajustar a migração';
    end if;
    execute v_novo;
  end if;
end $$;
