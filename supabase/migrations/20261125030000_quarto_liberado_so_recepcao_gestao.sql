-- "Quarto liberado" só pela recepção e pela gestão (pedido do usuário 25/11/2026);
-- a camareira só vê o selo. Mesmo corpo de 20261125020000, com a trava de perfil.
do $$
declare
  v_def text := pg_get_functiondef('public.marcar_quarto_liberado(uuid, boolean)'::regprocedure);
begin
  v_def := replace(v_def,
    $q$not exists (select 1 from usuarios where id = (select auth.uid()) and active and empresa_id = v_empresa)$q$,
    $q$not (public.is_super_admin()
          or exists (select 1 from usuarios where id = (select auth.uid()) and active and empresa_id = v_empresa
                       and profile::text in ('recepcao', 'gestor', 'admin')))$q$);
  if v_def not like '%''recepcao'', ''gestor'', ''admin''%' then
    raise exception 'trava de perfil não aplicada';
  end if;
  execute v_def;
end $$;
