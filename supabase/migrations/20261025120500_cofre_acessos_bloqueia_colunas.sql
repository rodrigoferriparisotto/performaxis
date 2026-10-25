/*
  Cofre de acessos, passo 2 (aplicado depois do deploy do app que lê só as
  colunas liberadas e abre a senha por acessos_revelar_senha).
*/
-- o app não lê nem grava as colunas de senha diretamente
revoke select, insert, update on public.acessos from anon, authenticated;
grant select (id, titulo, login, url_acesso, comentarios, empresa_id, ativo, created_at, updated_at, area_vinculada, tem_senha)
  on public.acessos to authenticated;
grant insert (titulo, login, senha, url_acesso, comentarios, empresa_id, ativo, area_vinculada)
  on public.acessos to authenticated;
grant update (titulo, login, senha, url_acesso, comentarios, ativo, area_vinculada, updated_at)
  on public.acessos to authenticated;

