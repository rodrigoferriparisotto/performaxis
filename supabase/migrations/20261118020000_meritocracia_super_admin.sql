/*
  Ranking para o admin do sistema (sem empresa) — 18/11/2026.
  A tela ficava em "Carregando dados da empresa..." e, mesmo com a empresa
  escolhida, a RLS só mostrava linhas da própria empresa do usuário.
  - super admin lê performance_diaria / performance_mensal de qualquer empresa
  - salvar_config_meritocracia aceita p_empresa (só vale para o super admin)
*/

drop policy if exists "Users can view own daily performance" on public.performance_diaria;
create policy "Users can view own daily performance" on public.performance_diaria
  for select to authenticated
  using (
    (select public.is_super_admin())
    or usuario_id = (select auth.uid())
    or exists (select 1 from usuarios u
                where u.id = (select auth.uid()) and u.empresa_id = performance_diaria.empresa_id
                  and u.profile = any (array['admin'::user_profile_enum, 'gestor'::user_profile_enum])));

drop policy if exists "Users can view own monthly performance" on public.performance_mensal;
create policy "Users can view own monthly performance" on public.performance_mensal
  for select to authenticated
  using (
    (select public.is_super_admin())
    or usuario_id = (select auth.uid())
    or exists (select 1 from usuarios u
                where u.id = (select auth.uid()) and u.empresa_id = performance_mensal.empresa_id
                  and u.profile = any (array['admin'::user_profile_enum, 'gestor'::user_profile_enum])));

drop function if exists public.salvar_config_meritocracia(jsonb);
create or replace function public.salvar_config_meritocracia(p_config jsonb, p_empresa uuid default null)
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
  if public.is_super_admin() and p_empresa is not null then
    v_empresa := p_empresa;
  else
    select u.empresa_id into v_empresa
      from usuarios u
     where u.id = (select auth.uid()) and u.active and u.profile::text in ('admin', 'gestor');
  end if;
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
revoke execute on function public.salvar_config_meritocracia(jsonb, uuid) from public, anon;
grant execute on function public.salvar_config_meritocracia(jsonb, uuid) to authenticated;
