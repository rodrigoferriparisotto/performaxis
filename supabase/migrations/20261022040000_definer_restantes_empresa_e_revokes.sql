/*
  22/10/2026 — restos do advisor "authenticated_security_definer_function_executable".

  - consultar_registros_antigos: conferia o perfil de quem chama, mas aceitava
    p_empresa_id de outra empresa (contagens de outro hotel). Agora só a própria
    empresa (super admin continua livre).
  - obter_estatisticas_entrega: estatística de qualquer mensagem; agora só de
    mensagem que o usuário enxerga.
  - Funções de gatilho e de manutenção não são chamadas pelo app: saem do
    alcance de authenticated (gatilhos e pg_cron continuam funcionando — o
    privilégio de EXECUTE não é checado quando o gatilho dispara).
  - is_admin/is_super_admin/is_same_company/... ficam: as políticas RLS usam.
*/

do $$
declare
  v_def text;
  v_novo text;
begin
  select pg_get_functiondef('public.consultar_registros_antigos(uuid, integer)'::regprocedure) into v_def;
  if position('empresa de outro' in v_def) = 0 then
    v_novo := replace(v_def,
      E'-- Calcular data limite\n',
      E'IF NOT public.is_super_admin() AND p_empresa_id IS DISTINCT FROM (SELECT u.empresa_id FROM usuarios u WHERE u.id = auth.uid()) THEN\nRAISE EXCEPTION ''Acesso negado: empresa de outro cliente.'' USING ERRCODE = ''42501'';\nEND IF;\n\n-- Calcular data limite\n');
    if v_novo = v_def then
      raise exception 'corpo de consultar_registros_antigos mudou; ajustar a migração';
    end if;
    execute v_novo;
  end if;

  select pg_get_functiondef('public.obter_estatisticas_entrega(uuid)'::regprocedure) into v_def;
  if position('_mensagem_visivel_para' in v_def) = 0 then
    v_novo := replace(v_def,
      E'BEGIN\nRETURN QUERY',
      E'BEGIN\nIF auth.uid() IS NOT NULL AND NOT public._mensagem_visivel_para(auth.uid(), p_mensagem_id) THEN\nRETURN;\nEND IF;\nRETURN QUERY');
    if v_novo = v_def then
      raise exception 'corpo de obter_estatisticas_entrega mudou; ajustar a migração';
    end if;
    execute v_novo;
  end if;
end;
$$;

revoke execute on function public.atualizar_marcacao_usuario() from public, anon, authenticated;
revoke execute on function public.limpar_marcacao_apos_delete() from public, anon, authenticated;
revoke execute on function public.protege_colunas_sensiveis_usuarios() from public, anon, authenticated;
revoke execute on function public.sincroniza_ban_auth() from public, anon, authenticated;
revoke execute on function public.validate_token_before_insert() from public, anon, authenticated;
revoke execute on function public.corrigir_inconsistencias_marcacao() from public, anon, authenticated;
revoke execute on function public.limpar_ciclos_inatividade_antigos() from public, anon, authenticated;
revoke execute on function public.limpar_lembretes_antigos() from public, anon, authenticated;
revoke execute on function public.limpar_logs_antigos() from public, anon, authenticated;
revoke execute on function public.limpar_marcacoes_orfas() from public, anon, authenticated;
revoke execute on function public.validate_fcm_token(text) from public, anon, authenticated;
-- get_current_user_empresa_and_profile fica: 6 políticas RLS dependem dela
