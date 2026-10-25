/*
  Aviso de tarefa atrasada (com o horário previsto) — 25/10/2026.

  tarefas_atrasadas_para_avisar(): itens 'pendente' de registros em andamento
  de HOJE cujo horário previsto (atividades.horario_previsto) passou há mais
  de 10 min, dentro do turno (horário >= início do registro) e ainda não
  avisados. A edge function avisar-tarefas-atrasadas envia o push e grava em
  avisos_tarefa_atrasada (um aviso por item).
*/

create table if not exists public.avisos_tarefa_atrasada (
  registro_id uuid not null,
  atividade_id uuid not null,
  usuario_id uuid not null,
  empresa_id uuid not null,
  modulo text not null,
  horario_previsto time not null,
  avisado_em timestamptz not null default now(),
  primary key (registro_id, atividade_id)
);
alter table public.avisos_tarefa_atrasada enable row level security;
create policy "gestao le avisos de atraso da empresa" on public.avisos_tarefa_atrasada
  for select to authenticated
  using (empresa_id = (select u.empresa_id from usuarios u where u.id = (select auth.uid())));

create or replace function public.tarefas_atrasadas_para_avisar(p_tolerancia_min int default 10)
returns table (
  registro_id uuid, atividade_id uuid, usuario_id uuid, empresa_id uuid,
  modulo text, nome text, horario_previsto time
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with agora as (
    select (now() at time zone 'America/Sao_Paulo') as ts
  ),
  regs as (
    select 'recepcao' modulo, id, empresa_id, coalesce(usuario_executor_id, usuario_id) usuario_id, hora_inicio, atividades
      from registros_recepcao where status::text = 'em_andamento' and data = (select ts::date from agora)
    union all select 'areas_comuns', id, empresa_id, coalesce(usuario_executor_id, usuario_id), hora_inicio, atividades
      from registros_areas_comuns where status::text = 'em_andamento' and data = (select ts::date from agora)
    union all select 'gestao', id, empresa_id, coalesce(usuario_executor_id, usuario_id), hora_inicio, atividades
      from registros_gestao where status::text = 'em_andamento' and data = (select ts::date from agora)
    union all select 'cozinha', id, empresa_id, coalesce(usuario_executor_id, usuario_id), hora_inicio, atividades
      from registros_cozinha where status = 'em_andamento' and data = (select ts::date from agora)
    union all select 'vendas', id, empresa_id, coalesce(usuario_executor_id, usuario_id), hora_inicio, atividades
      from registros_vendas where status::text = 'em_andamento' and data = (select ts::date from agora)
    union all select 'atividades_diarias', id, empresa_id, coalesce(usuario_executor_id, usuario_id), hora_inicio, atividades
      from registros_atividades_diarias where status::text = 'em_andamento' and data = (select ts::date from agora)
    union all select 'atividades_extras', id, empresa_id, coalesce(usuario_executor_id, usuario_id), hora_inicio, atividades
      from registros_atividades_extras where status::text = 'em_andamento' and data = (select ts::date from agora)
  ),
  itens as (
    select r.modulo, r.id registro_id, r.empresa_id, r.usuario_id, r.hora_inicio,
           (i->>'atividade_id')::uuid atividade_id, i->>'nome' nome, coalesce(i->>'status', 'pendente') status
      from regs r
      cross join lateral jsonb_array_elements(case when jsonb_typeof(r.atividades) = 'array' then r.atividades else '[]'::jsonb end) i
     where i ? 'atividade_id'
  )
  select it.registro_id, it.atividade_id, it.usuario_id, it.empresa_id, it.modulo,
         coalesce(a.name, it.nome), a.horario_previsto
    from itens it
    join atividades a on a.id = it.atividade_id and a.horario_previsto is not null
   where it.status = 'pendente'
     -- em minutos (somar intervalo a time daria a volta na meia-noite)
     and (extract(epoch from (select ts::time from agora)) - extract(epoch from a.horario_previsto)) / 60 > p_tolerancia_min
     and a.horario_previsto >= (it.hora_inicio at time zone 'America/Sao_Paulo')::time
     and not exists (select 1 from avisos_tarefa_atrasada v
                      where v.registro_id = it.registro_id and v.atividade_id = it.atividade_id);
$$;

revoke execute on function public.tarefas_atrasadas_para_avisar(int) from public, anon, authenticated;

-- a cada 5 min (aplicado via execute_sql em 25/10/2026)
select cron.schedule('avisar-tarefas-atrasadas', '*/5 * * * *', $c$
  select net.http_post(
    url := 'https://znqwieiuilkqkugtatqg.supabase.co/functions/v1/avisar-tarefas-atrasadas',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Internal-Secret', (select valor from public.app_config_interna where chave = 'internal_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
$c$);
