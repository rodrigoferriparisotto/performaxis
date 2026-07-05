/*
  Correções de segurança (advisors do Supabase, jul/2026)

  1. Nova policy em push_tokens: admins/gestores enxergam tokens da própria
     empresa (hoje cada usuário só vê o próprio token). Necessária porque a
     página Diagnóstico de Notificações usa a view push_tokens_health, que
     deixará de rodar com privilégio elevado.

  2. As 6 views SECURITY DEFINER passam a security_invoker: hoje qualquer
     usuário autenticado consegue ler, através delas, dados de TODAS as
     empresas (nomes de usuários, tokens push, atividade) — vazamento
     entre tenants.

  3. Fixa search_path nas funções public que não têm (26 apontadas pelo
     linter), prevenindo hijack de resolução de nomes em SECURITY DEFINER.
*/

create policy "Admins e gestores veem tokens da empresa" on public.push_tokens
for select to authenticated
using (
  exists (
    select 1
    from public.usuarios me
    join public.usuarios dono on dono.id = push_tokens.usuario_id
    where me.id = auth.uid()
      and me.profile in ('admin','gestor','super_admin')
      and (me.profile = 'super_admin' or me.empresa_id = dono.empresa_id)
  )
);

alter view public.view_manutencoes_orphaned set (security_invoker = true);
alter view public.v_registros_sem_executor set (security_invoker = true);
alter view public.vw_freshness_analytics set (security_invoker = true);
alter view public.push_tokens_health set (security_invoker = true);
alter view public.view_monitoramento_inatividade set (security_invoker = true);
alter view public.view_marcacoes_orfas set (security_invoker = true);

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as fn
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.proconfig is null
  loop
    execute format('alter function %s set search_path = public, pg_temp', r.fn);
  end loop;
end $$;
