/*
  22/10/2026 — funções SECURITY DEFINER que recebem p_empresa_id/user_id,
  não conferem quem chama e não são usadas pelo app, por outras funções nem
  por políticas RLS. Qualquer usuário logado lia dados de outra empresa.
*/
revoke execute on function public.fn_get_freshness_statistics(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.fn_get_stagnant_records(uuid, integer) from public, anon, authenticated;
revoke execute on function public.fn_get_user_consistency_ranking(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.get_empresa_id_by_user(uuid) from public, anon, authenticated;
