/*
  Programado × executado — 25/10/2026.

  1.312 suítes programadas desde set/2025 nunca foram iniciadas pela
  programação (a equipe abria registro manual) e ficavam como 'programado'
  para sempre. Agora:
  - status novo 'nao_executado' (enum registro_status_enum)
  - encerrar_programacoes_vencidas(): 'programado' de dias anteriores vira
    'nao_executado' (pg_cron 00:20 de Brasília) — rodado agora para o passivo
  - dashboard_agregado deixa de contar 'nao_executado' (como já não contava
    'programado')
  - programacao_resumo(inicio, fim): por dia, programadas / executadas pela
    programação / não executadas / registros manuais (SECURITY INVOKER: RLS)
*/

alter type public.registro_status_enum add value if not exists 'nao_executado';

create or replace function public.encerrar_programacoes_vencidas()
returns integer
language sql
security definer
set search_path = public, pg_temp
as $$
  with feitos as (
    update registros_camararia
       set status = 'nao_executado'
     where status = 'programado'
       and data < (now() at time zone 'America/Sao_Paulo')::date
    returning 1
  )
  select count(*)::int from feitos;
$$;
revoke execute on function public.encerrar_programacoes_vencidas() from public, anon, authenticated;

select public.encerrar_programacoes_vencidas();

select cron.schedule('encerrar-programacoes-vencidas', '20 3 * * *',
  $c$select public.encerrar_programacoes_vencidas()$c$);

do $$
declare v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'dashboard_agregado';
  if v_def is not null and position('nao_executado' in v_def) = 0 then
    v_def := replace(v_def, $r$status::text <> 'programado'$r$, $r$status::text not in ('programado', 'nao_executado')$r$);
    execute v_def;
  end if;
end $$;

create or replace function public.programacao_resumo(p_inicio date, p_fim date)
returns table (
  data date, programadas int, executadas int, nao_executadas int, pendentes int, manuais int
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with emp as (
    select empresa_id from usuarios where id = (select auth.uid())
  )
  select r.data,
         count(*) filter (where r.status::text in ('programado', 'nao_executado')
                             or r.observacoes ilike '%ORIGEM:PROGRAMADO%')::int,
         count(*) filter (where r.status::text in ('em_andamento', 'concluido')
                             and r.observacoes ilike '%ORIGEM:PROGRAMADO%')::int,
         count(*) filter (where r.status::text = 'nao_executado')::int,
         count(*) filter (where r.status::text = 'programado')::int,
         count(*) filter (where r.status::text in ('em_andamento', 'concluido')
                             and coalesce(r.observacoes, '') not ilike '%ORIGEM:PROGRAMADO%')::int
    from registros_camararia r
   where r.empresa_id = (select empresa_id from emp)
     and r.data between p_inicio and p_fim
   group by r.data
   order by r.data desc;
$$;
revoke execute on function public.programacao_resumo(date, date) from public, anon;
grant execute on function public.programacao_resumo(date, date) to authenticated;
