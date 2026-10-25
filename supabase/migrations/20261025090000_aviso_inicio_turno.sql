/*
  Aviso de início de turno — 25/10/2026.

  No cadastro do funcionário: dias de trabalho e horário de início. Nos dias
  marcados, 30 min depois do início, se a pessoa ainda não iniciou nenhum
  registro no dia, recebe "Por favor, inicie o Performaxis e tenha um
  excelente dia de trabalho." (uma vez por dia, só até 4h depois do início).
  usuarios_para_aviso_inicio_turno() → edge avisar-tarefas-atrasadas (*/5).
*/

alter table public.usuarios
  add column if not exists dias_trabalho text[],
  add column if not exists horario_inicio_trabalho time;

create table if not exists public.avisos_inicio_turno (
  usuario_id uuid not null,
  data date not null,
  avisado_em timestamptz not null default now(),
  primary key (usuario_id, data)
);
alter table public.avisos_inicio_turno enable row level security;

create or replace function public.usuarios_para_aviso_inicio_turno(p_atraso_min int default 30, p_janela_min int default 240)
returns table (usuario_id uuid, empresa_id uuid, horario_inicio time)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with agora as (
    select (now() at time zone 'America/Sao_Paulo') ts
  ),
  hoje as (
    select ts::date dia, ts::time hora,
           (array['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'])[extract(dow from ts)::int + 1] dia_semana
      from agora
  ),
  iniciaram as (
    select coalesce(usuario_executor_id, usuario_id) uid from registros_camararia, hoje where data = hoje.dia and status::text in ('em_andamento','concluido')
    union select coalesce(usuario_executor_id, usuario_id) from registros_recepcao, hoje where data = hoje.dia
    union select coalesce(usuario_executor_id, usuario_id) from registros_revisao, hoje where data = hoje.dia
    union select coalesce(usuario_executor_id, usuario_id) from registros_areas_comuns, hoje where data = hoje.dia
    union select coalesce(usuario_executor_id, usuario_id) from registros_gestao, hoje where data = hoje.dia
    union select coalesce(usuario_executor_id, usuario_id) from registros_cozinha, hoje where data = hoje.dia
    union select coalesce(usuario_executor_id, usuario_id) from registros_vendas, hoje where data = hoje.dia
    union select coalesce(usuario_executor_id, usuario_id) from registros_atividades_diarias, hoje where data = hoje.dia
    union select coalesce(usuario_executor_id, usuario_id) from registros_atividades_extras, hoje where data = hoje.dia
    union select coalesce(usuario_executor_id, usuario_id) from manutencoes, hoje
     where (hora_inicio at time zone 'America/Sao_Paulo')::date = hoje.dia
  )
  select u.id, u.empresa_id, u.horario_inicio_trabalho
    from usuarios u, hoje h
   where u.active
     and u.horario_inicio_trabalho is not null
     and u.dias_trabalho is not null
     and h.dia_semana = any (u.dias_trabalho)
     -- em minutos: de início+30 até início+4h (sem dar a volta na meia-noite)
     and (extract(epoch from h.hora) - extract(epoch from u.horario_inicio_trabalho)) / 60 between p_atraso_min and p_janela_min
     and u.id not in (select uid from iniciaram where uid is not null)
     and not exists (select 1 from avisos_inicio_turno a where a.usuario_id = u.id and a.data = h.dia);
$$;
revoke execute on function public.usuarios_para_aviso_inicio_turno(int, int) from public, anon, authenticated;
