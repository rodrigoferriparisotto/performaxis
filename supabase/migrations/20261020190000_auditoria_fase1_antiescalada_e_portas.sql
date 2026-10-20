/*
  Correções da auditoria de 20/10/2026 — Fases 1 e 2.
  APLICADA EM PRODUÇÃO em 20/10/2026 via MCP (registro para versionamento).

  - Trigger protege profile/empresa_id/active em usuarios (C1)
  - Desativar usuário bane no Auth; reativar desbane (C5)
  - executar_limpeza_historico_segura deriva usuário/empresa do token (C3)
  - Revoga EXECUTE de anon/public nas SECURITY DEFINER; mantém authenticated
  - Cofre acessos: escrita só admin/gestor da empresa (C4 parcial)
  - performance_diaria/mensal: escrita só admin/gestor (ranking íntegro)
  - app_versions, perfis_sistema_permissoes e UPDATE de empresas: só super admin
  - Remove policies v1 duplicadas de usuarios
  - app_config_interna com internal_secret + pg_cron chamando
    check-inactivity-reminders a cada 5 min e limpando logs antigos
*/

create or replace function public.protege_colunas_sensiveis_usuarios()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_profile text;
  v_empresa uuid;
begin
  if new.profile is distinct from old.profile
     or new.empresa_id is distinct from old.empresa_id
     or new.active is distinct from old.active then

    if auth.uid() is null then
      return new;
    end if;

    if is_super_admin() then
      return new;
    end if;

    select u.profile::text, u.empresa_id into v_profile, v_empresa
    from usuarios u where u.id = auth.uid();

    if v_profile = 'admin'
       and v_empresa is not distinct from old.empresa_id
       and new.empresa_id is not distinct from old.empresa_id
       and new.profile::text <> 'super_admin' then
      return new;
    end if;

    if v_profile = 'gestor'
       and v_empresa is not distinct from old.empresa_id
       and new.empresa_id is not distinct from old.empresa_id
       and new.profile is not distinct from old.profile
       and old.profile::text not in ('admin','super_admin') then
      return new;
    end if;

    raise exception 'Alteração de perfil, empresa ou status ativo não autorizada';
  end if;
  return new;
end $$;

drop trigger if exists trg_protege_colunas_usuarios on public.usuarios;
create trigger trg_protege_colunas_usuarios
before update on public.usuarios
for each row execute function public.protege_colunas_sensiveis_usuarios();

create or replace function public.sincroniza_ban_auth()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if new.active is distinct from old.active then
    update auth.users
      set banned_until = case when new.active then null
                              else '3000-01-01 00:00:00+00'::timestamptz end
      where id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists trg_sincroniza_ban_auth on public.usuarios;
create trigger trg_sincroniza_ban_auth
after update of active on public.usuarios
for each row execute function public.sincroniza_ban_auth();

update auth.users a set banned_until = '3000-01-01 00:00:00+00'
from public.usuarios u where u.id = a.id and u.active = false;

create or replace function public.executar_limpeza_historico_segura(
  p_periodo_meses integer,
  p_tabelas_selecionadas text[],
  p_observacoes text default null
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_profile text;
  v_empresa uuid;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select u.profile::text, u.empresa_id into v_profile, v_empresa
  from usuarios u where u.id = v_uid and u.active = true;

  if v_profile is null or v_profile not in ('admin','gestor') then
    raise exception 'Apenas administradores e gestores podem executar a limpeza';
  end if;

  if v_empresa is null then
    raise exception 'Usuário sem empresa vinculada';
  end if;

  if p_periodo_meses is null or p_periodo_meses < 1 then
    raise exception 'Período mínimo de 1 mês';
  end if;

  return public.executar_limpeza_historico(v_empresa, v_uid, p_periodo_meses, p_tabelas_selecionadas, p_observacoes);
end $$;

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as fn
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    execute format('revoke execute on function %s from public', r.fn);
    execute format('revoke execute on function %s from anon', r.fn);
    execute format('grant execute on function %s to authenticated', r.fn);
    execute format('grant execute on function %s to service_role', r.fn);
  end loop;
end $$;

revoke execute on function public.executar_limpeza_historico(uuid, uuid, integer, text[], text) from authenticated;
revoke execute on function public.create_user_with_auth(text, text, text, date, text, public.user_profile_enum) from authenticated;

do $$
declare r record;
begin
  for r in select policyname, cmd from pg_policies where schemaname='public' and tablename='acessos' and cmd in ('INSERT','UPDATE','DELETE')
  loop
    execute format('drop policy %I on public.acessos', r.policyname);
  end loop;
end $$;

create policy "Admins e gestores criam acessos" on public.acessos
for insert to authenticated
with check (exists (select 1 from usuarios u where u.id = auth.uid() and u.profile in ('admin','gestor') and u.empresa_id = acessos.empresa_id));

create policy "Admins e gestores alteram acessos" on public.acessos
for update to authenticated
using (exists (select 1 from usuarios u where u.id = auth.uid() and u.profile in ('admin','gestor') and u.empresa_id = acessos.empresa_id))
with check (exists (select 1 from usuarios u where u.id = auth.uid() and u.profile in ('admin','gestor') and u.empresa_id = acessos.empresa_id));

create policy "Admins e gestores excluem acessos" on public.acessos
for delete to authenticated
using (exists (select 1 from usuarios u where u.id = auth.uid() and u.profile in ('admin','gestor') and u.empresa_id = acessos.empresa_id));

do $$
declare r record;
begin
  for r in select tablename, policyname from pg_policies where schemaname='public' and tablename in ('performance_diaria','performance_mensal') and cmd in ('INSERT','UPDATE')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy "Admins e gestores inserem performance diaria" on public.performance_diaria
for insert to authenticated
with check (exists (select 1 from usuarios u where u.id = auth.uid() and u.profile in ('admin','gestor') and u.empresa_id = performance_diaria.empresa_id));

create policy "Admins e gestores alteram performance diaria" on public.performance_diaria
for update to authenticated
using (exists (select 1 from usuarios u where u.id = auth.uid() and u.profile in ('admin','gestor') and u.empresa_id = performance_diaria.empresa_id));

create policy "Admins e gestores inserem performance mensal" on public.performance_mensal
for insert to authenticated
with check (exists (select 1 from usuarios u where u.id = auth.uid() and u.profile in ('admin','gestor') and u.empresa_id = performance_mensal.empresa_id));

create policy "Admins e gestores alteram performance mensal" on public.performance_mensal
for update to authenticated
using (exists (select 1 from usuarios u where u.id = auth.uid() and u.profile in ('admin','gestor') and u.empresa_id = performance_mensal.empresa_id));

do $$
declare r record;
begin
  for r in select tablename, policyname from pg_policies where schemaname='public' and tablename in ('app_versions','perfis_sistema_permissoes') and cmd in ('INSERT','UPDATE','DELETE')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
  for r in select policyname from pg_policies where schemaname='public' and tablename='empresas' and cmd='UPDATE'
  loop
    execute format('drop policy %I on public.empresas', r.policyname);
  end loop;
end $$;

create policy "Super admin publica versoes" on public.app_versions
for insert to authenticated with check (is_super_admin());

create policy "Super admin gerencia permissoes de sistema" on public.perfis_sistema_permissoes
for all to authenticated using (is_super_admin()) with check (is_super_admin());

create policy "Super admin edita empresas" on public.empresas
for update to authenticated using (is_super_admin()) with check (is_super_admin());

drop policy if exists usuarios_update_policy on public.usuarios;
drop policy if exists usuarios_insert_policy on public.usuarios;
drop policy if exists usuarios_delete_policy on public.usuarios;

create table if not exists public.app_config_interna (
  chave text primary key,
  valor text not null,
  created_at timestamptz default now()
);
alter table public.app_config_interna enable row level security;
revoke all on public.app_config_interna from anon, authenticated;

insert into public.app_config_interna (chave, valor)
values ('internal_secret', encode(gen_random_bytes(32), 'hex'))
on conflict (chave) do nothing;

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'check-inactivity-reminders',
  '*/5 * * * *',
  $cron$
  select net.http_post(
    url := 'https://znqwieiuilkqkugtatqg.supabase.co/functions/v1/check-inactivity-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Internal-Secret', (select valor from public.app_config_interna where chave = 'internal_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $cron$
);

select cron.schedule(
  'limpeza-logs-inatividade',
  '30 3 * * *',
  $cron$ delete from public.logs_verificacao_inatividade where executado_em < now() - interval '60 days'; $cron$
);
