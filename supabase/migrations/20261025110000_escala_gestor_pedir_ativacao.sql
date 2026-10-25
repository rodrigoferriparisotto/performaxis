/*
  Escala de trabalho, papéis da gestão e "pedir ativação" — 25/10/2026.

  Papéis (correção do usuário): admin = dono do sistema (sem empresa); quem
  configura o hotel é o GESTOR. Tempo estimado e relatório passam a ser de
  gestor + admin da empresa (+ super admin); a equipe segue sem acesso.

  Escala (usuarios.escala jsonb), substitui dias_trabalho/horario_inicio_trabalho:
    {"tipo":"semanal","turnos":[{"dias":["segunda-feira",...],"inicio":"08:00"}, ...]}
    {"tipo":"ciclo","trabalha":1,"folga":1,"referencia":"2026-10-25","inicio":"07:00"}  (12x36 = 1/1)
  escala_excecoes: folga (não trabalha) ou trabalho extra (cobertura) num dia.
  Aviso de início de turno: por turno, 30 min após o início (até 4h), se a
  pessoa não iniciou nenhum registro desde 1h antes do turno e não tem registro
  em andamento; um aviso por turno/dia. Turno noturno que vira o dia funciona
  (olha hoje e ontem).
  usuarios.pedir_ativacao_lembretes: gestor pede; o app mostra o pedido de
  ativar lembretes a cada abertura até a pessoa ativar.
*/

-- ---------------------------------------------------------------- papéis
drop policy if exists "so admin da empresa" on public.tempos_estimados;
create policy "gestao da empresa" on public.tempos_estimados
  for all to authenticated
  using (
    (select public.is_super_admin())
    or exists (select 1 from usuarios u
                where u.id = (select auth.uid()) and u.active
                  and u.profile in ('admin', 'gestor') and u.empresa_id = tempos_estimados.empresa_id))
  with check (
    (select public.is_super_admin())
    or exists (select 1 from usuarios u
                where u.id = (select auth.uid()) and u.active
                  and u.profile in ('admin', 'gestor') and u.empresa_id = tempos_estimados.empresa_id));

do $$
declare v_def text;
begin
  select pg_get_functiondef('public.tempo_real_vs_estimado(date, date)'::regprocedure) into v_def;
  if position($q$('admin', 'gestor', 'super_admin')$q$ in v_def) = 0 then
    v_def := replace(v_def, $q$in ('admin', 'super_admin')$q$, $q$in ('admin', 'gestor', 'super_admin')$q$);
    execute v_def;
  end if;
end $$;

-- ---------------------------------------------------------------- escala
alter table public.usuarios
  add column if not exists escala jsonb,
  add column if not exists pedir_ativacao_lembretes boolean not null default false;

create table if not exists public.escala_excecoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  empresa_id uuid not null,
  data date not null,
  tipo text not null check (tipo in ('folga', 'trabalho')),
  inicio time,
  observacao text,
  criado_em timestamptz not null default now(),
  unique (usuario_id, data, tipo)
);
create index if not exists escala_excecoes_usuario_data_idx on public.escala_excecoes (usuario_id, data);
alter table public.escala_excecoes enable row level security;
create policy "gestao gerencia excecoes" on public.escala_excecoes
  for all to authenticated
  using (
    (select public.is_super_admin())
    or exists (select 1 from usuarios u where u.id = (select auth.uid()) and u.active
                 and u.profile in ('admin', 'gestor') and u.empresa_id = escala_excecoes.empresa_id))
  with check (
    (select public.is_super_admin())
    or exists (select 1 from usuarios u where u.id = (select auth.uid()) and u.active
                 and u.profile in ('admin', 'gestor') and u.empresa_id = escala_excecoes.empresa_id));
create policy "pessoa ve as proprias excecoes" on public.escala_excecoes
  for select to authenticated using (usuario_id = (select auth.uid()));

-- horários de início previstos pela escala num dia (sem exceções)
create or replace function public.turnos_da_escala(p_escala jsonb, p_dia date)
returns setof time
language plpgsql
immutable
as $$
declare
  v_turno jsonb;
  v_trabalha int;
  v_ciclo int;
  v_pos int;
  v_dia_semana text := (array['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'])[extract(dow from p_dia)::int + 1];
begin
  if p_escala is null then
    return;
  end if;
  if p_escala->>'tipo' = 'ciclo' then
    if p_escala->>'inicio' is null or p_escala->>'referencia' is null then
      return;
    end if;
    v_trabalha := greatest(coalesce((p_escala->>'trabalha')::int, 1), 1);
    v_ciclo := v_trabalha + greatest(coalesce((p_escala->>'folga')::int, 1), 0);
    v_pos := (((p_dia - (p_escala->>'referencia')::date) % v_ciclo) + v_ciclo) % v_ciclo;
    if v_pos < v_trabalha then
      return next (p_escala->>'inicio')::time;
    end if;
  else
    for v_turno in select * from jsonb_array_elements(coalesce(p_escala->'turnos', '[]'::jsonb)) loop
      if v_turno->>'inicio' is not null and coalesce(v_turno->'dias', '[]'::jsonb) ? v_dia_semana then
        return next (v_turno->>'inicio')::time;
      end if;
    end loop;
  end if;
end;
$$;

-- com exceções: folga zera o dia; trabalho extra acrescenta um turno
create or replace function public.turnos_do_dia(p_usuario uuid, p_escala jsonb, p_dia date)
returns setof time
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select t.inicio
    from turnos_da_escala(p_escala, p_dia) t(inicio)
   where not exists (select 1 from escala_excecoes x
                      where x.usuario_id = p_usuario and x.data = p_dia and x.tipo = 'folga')
  union
  select coalesce(x.inicio,
                  (select min(t2.inicio) from turnos_da_escala(p_escala, p_dia) t2(inicio)),
                  case when p_escala->>'tipo' = 'ciclo' then (p_escala->>'inicio')::time end,
                  (select min((t3->>'inicio')::time) from jsonb_array_elements(coalesce(p_escala->'turnos', '[]'::jsonb)) t3))
    from escala_excecoes x
   where x.usuario_id = p_usuario and x.data = p_dia and x.tipo = 'trabalho';
$$;

create or replace function public.usuario_iniciou_desde(p_usuario uuid, p_desde timestamptz)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from registros_camararia where coalesce(usuario_executor_id, usuario_id) = p_usuario
                   and status::text in ('em_andamento', 'concluido') and (hora_inicio >= p_desde or status::text = 'em_andamento'))
      or exists (select 1 from registros_recepcao where coalesce(usuario_executor_id, usuario_id) = p_usuario and (hora_inicio >= p_desde or status::text = 'em_andamento'))
      or exists (select 1 from registros_revisao where coalesce(usuario_executor_id, usuario_id) = p_usuario and (hora_inicio >= p_desde or status::text = 'em_andamento'))
      or exists (select 1 from registros_areas_comuns where coalesce(usuario_executor_id, usuario_id) = p_usuario and (hora_inicio >= p_desde or status::text = 'em_andamento'))
      or exists (select 1 from registros_gestao where coalesce(usuario_executor_id, usuario_id) = p_usuario and (hora_inicio >= p_desde or status::text = 'em_andamento'))
      or exists (select 1 from registros_cozinha where coalesce(usuario_executor_id, usuario_id) = p_usuario and (hora_inicio >= p_desde or status = 'em_andamento'))
      or exists (select 1 from registros_vendas where coalesce(usuario_executor_id, usuario_id) = p_usuario and (hora_inicio >= p_desde or status::text = 'em_andamento'))
      or exists (select 1 from registros_atividades_diarias where coalesce(usuario_executor_id, usuario_id) = p_usuario and (hora_inicio >= p_desde or status::text = 'em_andamento'))
      or exists (select 1 from registros_atividades_extras where coalesce(usuario_executor_id, usuario_id) = p_usuario and (hora_inicio >= p_desde or status::text = 'em_andamento'))
      or exists (select 1 from manutencoes where coalesce(usuario_executor_id, usuario_id) = p_usuario and (hora_inicio >= p_desde or status::text = 'em_andamento'));
$$;
revoke execute on function public.usuario_iniciou_desde(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.turnos_do_dia(uuid, jsonb, date) from public, anon, authenticated;

-- um aviso por turno: chave passa a incluir o horário do turno
alter table public.avisos_inicio_turno add column if not exists turno_inicio time not null default '00:00';
alter table public.avisos_inicio_turno drop constraint if exists avisos_inicio_turno_pkey;
alter table public.avisos_inicio_turno add primary key (usuario_id, data, turno_inicio);

drop function if exists public.usuarios_para_aviso_inicio_turno(int, int);
create or replace function public.usuarios_para_aviso_inicio_turno(p_atraso_min int default 30, p_janela_min int default 240)
returns table (usuario_id uuid, empresa_id uuid, dia date, turno_inicio time)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with hoje as (select (now() at time zone 'America/Sao_Paulo')::date d),
  cand as (
    select u.id, u.empresa_id, dias.dia, t.inicio,
           ((dias.dia + t.inicio) at time zone 'America/Sao_Paulo') inicio_ts
      from usuarios u
      cross join lateral (select d as dia from hoje union all select d - 1 from hoje) dias
      cross join lateral turnos_do_dia(u.id, u.escala, dias.dia) t(inicio)
     where u.active and u.escala is not null
  )
  select c.id, c.empresa_id, c.dia, c.inicio
    from cand c
   where now() between c.inicio_ts + make_interval(mins => p_atraso_min) and c.inicio_ts + make_interval(mins => p_janela_min)
     and not usuario_iniciou_desde(c.id, c.inicio_ts - interval '60 minutes')
     and not exists (select 1 from avisos_inicio_turno a
                      where a.usuario_id = c.id and a.data = c.dia and a.turno_inicio = c.inicio);
$$;
revoke execute on function public.usuarios_para_aviso_inicio_turno(int, int) from public, anon, authenticated;
