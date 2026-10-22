/*
  Varredura de inatividade em lote — 21/10/2026. APLICADA EM PRODUÇÃO via MCP.

  registros_abertos_por_usuario(): uma consulta devolve, por pessoa, os módulos
  com registro em andamento (contando usuario_id E usuario_executor_id, na
  mesma ordem da lista original da edge function). Validada contra a lógica
  antiga: 0 divergências. A edge function check-inactivity-reminders (v38+)
  usa esta função e busca usuários/ciclos/configurações em lote, em vez de
  ~12 consultas por funcionário a cada 5 minutos.

  Tarefas que rodavam a cada execução viraram agendamentos próprios:
  limpeza de ciclos antigos (diária) e preenchimento de usuario_executor_id
  em registros abertos (a cada 30 min).
*/
create or replace function public.registros_abertos_por_usuario()
returns table(usuario_id uuid, modulos text[], registro_mais_recente timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with abertos as (
    select usuario_id as uid, usuario_executor_id as exec, 1 as ordem, 'Governança'::text as modulo, hora_inicio from registros_camararia where status = 'em_andamento'
    union all select usuario_id, usuario_executor_id, 2, 'Áreas Comuns', hora_inicio from registros_areas_comuns where status = 'em_andamento'
    union all select usuario_id, usuario_executor_id, 3, 'Cozinha', hora_inicio from registros_cozinha where status = 'em_andamento'
    union all select usuario_id, usuario_executor_id, 4, 'Gestão', hora_inicio from registros_gestao where status = 'em_andamento'
    union all select usuario_id, usuario_executor_id, 5, 'Recepção', hora_inicio from registros_recepcao where status = 'em_andamento'
    union all select usuario_id, usuario_executor_id, 6, 'Vendas', hora_inicio from registros_vendas where status = 'em_andamento'
    union all select usuario_id, usuario_executor_id, 7, 'Revisão', hora_inicio from registros_revisao where status = 'em_andamento'
    union all select usuario_id, usuario_executor_id, 8, 'Atividades Diárias', hora_inicio from registros_atividades_diarias where status = 'em_andamento'
    union all select usuario_id, usuario_executor_id, 9, 'Atividades Extras', hora_inicio from registros_atividades_extras where status = 'em_andamento'
  ),
  por_pessoa as (
    select uid as pessoa, ordem, modulo, hora_inicio from abertos where uid is not null
    union
    select exec, ordem, modulo, hora_inicio from abertos where exec is not null
  ),
  modulos_distintos as (
    select pessoa, ordem, modulo, max(hora_inicio) as mais_recente
    from por_pessoa group by pessoa, ordem, modulo
  )
  select pessoa, array_agg(modulo order by ordem), max(mais_recente)
  from modulos_distintos
  group by pessoa;
$$;

revoke execute on function public.registros_abertos_por_usuario() from public, anon, authenticated;
grant execute on function public.registros_abertos_por_usuario() to service_role;

select cron.schedule('limpeza-ciclos-inatividade', '15 3 * * *',
  $cron$ select public.limpar_ciclos_inatividade_antigos(); $cron$);

select cron.schedule('preencher-executor-registros-abertos', '*/30 * * * *',
  $cron$
  update public.registros_camararia set usuario_executor_id = usuario_id where status = 'em_andamento' and usuario_executor_id is null and usuario_id is not null;
  update public.registros_areas_comuns set usuario_executor_id = usuario_id where status = 'em_andamento' and usuario_executor_id is null and usuario_id is not null;
  update public.registros_gestao set usuario_executor_id = usuario_id where status = 'em_andamento' and usuario_executor_id is null and usuario_id is not null;
  update public.registros_recepcao set usuario_executor_id = usuario_id where status = 'em_andamento' and usuario_executor_id is null and usuario_id is not null;
  update public.registros_revisao set usuario_executor_id = usuario_id where status = 'em_andamento' and usuario_executor_id is null and usuario_id is not null;
  update public.registros_atividades_diarias set usuario_executor_id = usuario_id where status = 'em_andamento' and usuario_executor_id is null and usuario_id is not null;
  update public.registros_atividades_extras set usuario_executor_id = usuario_id where status = 'em_andamento' and usuario_executor_id is null and usuario_id is not null;
  $cron$);
