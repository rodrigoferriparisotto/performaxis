/*
  Prêmios em modo "só a gestão acompanha" — 18/11/2026 (pedido do usuário).
  empresas.premios_visivel_equipe (padrão false, liga no cadastro da empresa):
  desligado, o crédito mensal continua, mas a equipe não lê saldo, extrato,
  catálogo nem trocas e não consegue pedir troca. A gestão vê tudo sempre.
*/

alter table public.empresas add column if not exists premios_visivel_equipe boolean not null default false;

create or replace function public.premios_liberados(p_empresa uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.eh_gestao_da_empresa(p_empresa)
      or coalesce((select premios_visivel_equipe from empresas where id = p_empresa), false);
$$;
revoke execute on function public.premios_liberados(uuid) from public, anon;
grant execute on function public.premios_liberados(uuid) to authenticated;

-- leitura da equipe só com o programa visível
drop policy if exists "premios visiveis na empresa" on public.premios;
create policy "premios visiveis na empresa" on public.premios
  for select to authenticated
  using ((select public.is_super_admin())
         or (empresa_id = (select u.empresa_id from usuarios u where u.id = (select auth.uid()))
             and (select public.premios_liberados(empresa_id))));

drop policy if exists "lotes proprios ou da gestao" on public.lhamas_lotes;
create policy "lotes proprios ou da gestao" on public.lhamas_lotes
  for select to authenticated
  using ((usuario_id = (select auth.uid()) and (select public.premios_liberados(empresa_id)))
         or (select public.eh_gestao_da_empresa(empresa_id)));

drop policy if exists "movimentos proprios ou da gestao" on public.lhamas_movimentos;
create policy "movimentos proprios ou da gestao" on public.lhamas_movimentos
  for select to authenticated
  using ((usuario_id = (select auth.uid()) and (select public.premios_liberados(empresa_id)))
         or (select public.eh_gestao_da_empresa(empresa_id)));

drop policy if exists "trocas proprias ou da gestao" on public.resgates;
create policy "trocas proprias ou da gestao" on public.resgates
  for select to authenticated
  using ((usuario_id = (select auth.uid()) and (select public.premios_liberados(empresa_id)))
         or (select public.eh_gestao_da_empresa(empresa_id)));

-- funções: mesmo corpo, com a trava do programa visível
do $$
declare
  v_def text;
begin
  v_def := pg_get_functiondef('public.premios_config(uuid)'::regprocedure);
  v_def := replace(v_def, $q$  v := public._premios_cfg(v_empresa);$q$,
    $q$  if not public.premios_liberados(v_empresa) then
    return jsonb_build_object('visivel_equipe', false);
  end if;
  v := public._premios_cfg(v_empresa);$q$);
  v_def := replace(v_def, $q$'gestores_participam', v.gestores_participam);$q$,
    $q$'gestores_participam', v.gestores_participam,
    'visivel_equipe', (select premios_visivel_equipe from empresas where id = v_empresa));$q$);
  execute v_def;

  v_def := pg_get_functiondef('public.lhamas_resumo(uuid)'::regprocedure);
  v_def := replace(v_def, $q$  v_cfg := public._premios_cfg(v_empresa);$q$,
    $q$  if not public.premios_liberados(v_empresa) then
    raise exception 'programa de prêmios indisponível' using errcode = '42501';
  end if;
  v_cfg := public._premios_cfg(v_empresa);$q$);
  execute v_def;

  v_def := pg_get_functiondef('public.solicitar_troca(uuid)'::regprocedure);
  v_def := replace(v_def, $q$  return public._criar_troca($q$,
    $q$  if not public.premios_liberados((select empresa_id from usuarios where id = (select auth.uid()))) then
    raise exception 'programa de prêmios indisponível' using errcode = '42501';
  end if;
  return public._criar_troca($q$);
  execute v_def;

  v_def := pg_get_functiondef('public.cancelar_troca(uuid, text)'::regprocedure);
  v_def := replace(v_def, $q$  if v.status <> 'solicitado' then$q$,
    $q$  if not public.premios_liberados(v.empresa_id) then
    raise exception 'programa de prêmios indisponível' using errcode = '42501';
  end if;
  if v.status <> 'solicitado' then$q$);
  execute v_def;
end $$;
