-- Script SQL para Testes Manuais de Push Notifications
-- Execute estas queries no Supabase SQL Editor para testar manualmente

-- ========================================
-- 1. VERIFICAR ESTRUTURA DA TABELA
-- ========================================

-- Ver estrutura da tabela push_tokens
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'push_tokens'
ORDER BY ordinal_position;


-- ========================================
-- 2. VERIFICAR POLÍTICAS RLS
-- ========================================

-- Ver todas as políticas de segurança
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'push_tokens';


-- ========================================
-- 3. VER TODOS OS TOKENS ATIVOS
-- ========================================

-- Contar tokens por usuário
SELECT
  u.nome,
  u.email,
  COUNT(pt.id) as total_tokens,
  COUNT(CASE WHEN pt.is_active THEN 1 END) as tokens_ativos,
  MAX(pt.last_used_at) as ultimo_uso
FROM push_tokens pt
JOIN usuarios u ON u.id = pt.usuario_id
GROUP BY u.id, u.nome, u.email
ORDER BY ultimo_uso DESC;


-- ========================================
-- 4. VER DETALHES DE TODOS OS TOKENS
-- ========================================

SELECT
  pt.id,
  u.nome as usuario,
  u.email,
  LEFT(pt.token, 50) || '...' as token_preview,
  pt.is_active,
  pt.device_info->>'userAgent' as user_agent,
  pt.device_info->>'platform' as platform,
  pt.created_at,
  pt.last_used_at,
  AGE(NOW(), pt.last_used_at) as tempo_inativo
FROM push_tokens pt
JOIN usuarios u ON u.id = pt.usuario_id
ORDER BY pt.last_used_at DESC;


-- ========================================
-- 5. LIMPAR TOKENS INATIVOS
-- ========================================

-- Ver tokens inativos (mais de 30 dias sem uso)
SELECT
  pt.id,
  u.nome as usuario,
  pt.last_used_at,
  AGE(NOW(), pt.last_used_at) as tempo_inativo
FROM push_tokens pt
JOIN usuarios u ON u.id = pt.usuario_id
WHERE pt.last_used_at < NOW() - INTERVAL '30 days'
ORDER BY pt.last_used_at;

-- Desativar tokens antigos (descomente para executar)
-- UPDATE push_tokens
-- SET is_active = false
-- WHERE last_used_at < NOW() - INTERVAL '30 days'
-- AND is_active = true;


-- ========================================
-- 6. LIMPAR TOKENS DUPLICADOS
-- ========================================

-- Ver tokens duplicados para o mesmo usuário
SELECT
  usuario_id,
  token,
  COUNT(*) as duplicatas,
  STRING_AGG(id::text, ', ') as ids
FROM push_tokens
GROUP BY usuario_id, token
HAVING COUNT(*) > 1;

-- Manter apenas o token mais recente (descomente para executar)
-- WITH duplicates AS (
--   SELECT
--     id,
--     ROW_NUMBER() OVER (PARTITION BY usuario_id, token ORDER BY last_used_at DESC) as rn
--   FROM push_tokens
-- )
-- DELETE FROM push_tokens
-- WHERE id IN (
--   SELECT id FROM duplicates WHERE rn > 1
-- );


-- ========================================
-- 7. ESTATÍSTICAS GERAIS
-- ========================================

-- Resumo geral
SELECT
  COUNT(*) as total_tokens,
  COUNT(CASE WHEN is_active THEN 1 END) as tokens_ativos,
  COUNT(DISTINCT usuario_id) as usuarios_com_tokens,
  COUNT(DISTINCT device_info->>'platform') as plataformas_diferentes,
  MIN(created_at) as primeiro_token,
  MAX(last_used_at) as ultimo_uso
FROM push_tokens;


-- ========================================
-- 8. TOKENS POR PLATAFORMA
-- ========================================

SELECT
  device_info->>'platform' as plataforma,
  COUNT(*) as total,
  COUNT(CASE WHEN is_active THEN 1 END) as ativos
FROM push_tokens
GROUP BY device_info->>'platform'
ORDER BY total DESC;


-- ========================================
-- 9. TOKENS POR NAVEGADOR
-- ========================================

SELECT
  CASE
    WHEN device_info->>'userAgent' LIKE '%Chrome%' THEN 'Chrome'
    WHEN device_info->>'userAgent' LIKE '%Firefox%' THEN 'Firefox'
    WHEN device_info->>'userAgent' LIKE '%Safari%' THEN 'Safari'
    WHEN device_info->>'userAgent' LIKE '%Edge%' THEN 'Edge'
    ELSE 'Outro'
  END as navegador,
  COUNT(*) as total,
  COUNT(CASE WHEN is_active THEN 1 END) as ativos
FROM push_tokens
GROUP BY navegador
ORDER BY total DESC;


-- ========================================
-- 10. TOKENS CRIADOS RECENTEMENTE
-- ========================================

-- Tokens criados nas últimas 24 horas
SELECT
  pt.id,
  u.nome as usuario,
  u.email,
  LEFT(pt.token, 50) || '...' as token_preview,
  pt.device_info->>'platform' as platform,
  pt.created_at,
  AGE(NOW(), pt.created_at) as tempo_desde_criacao
FROM push_tokens pt
JOIN usuarios u ON u.id = pt.usuario_id
WHERE pt.created_at > NOW() - INTERVAL '24 hours'
ORDER BY pt.created_at DESC;


-- ========================================
-- 11. INSERIR TOKEN DE TESTE (OPCIONAL)
-- ========================================

-- Descomente e ajuste os valores para inserir um token de teste
-- INSERT INTO push_tokens (usuario_id, token, device_info, is_active)
-- VALUES (
--   'SEU_USUARIO_ID_AQUI'::uuid,
--   'token_de_teste_fcm_aqui',
--   '{"userAgent": "Test Agent", "platform": "Test Platform", "vendor": "Test"}'::jsonb,
--   true
-- );


-- ========================================
-- 12. DELETAR TOKEN ESPECÍFICO (CUIDADO!)
-- ========================================

-- Ver token antes de deletar
-- SELECT * FROM push_tokens WHERE id = 'TOKEN_ID_AQUI'::uuid;

-- Deletar token (descomente para executar)
-- DELETE FROM push_tokens WHERE id = 'TOKEN_ID_AQUI'::uuid;


-- ========================================
-- 13. DELETAR TODOS OS TOKENS DE UM USUÁRIO (CUIDADO!)
-- ========================================

-- Ver tokens do usuário antes de deletar
-- SELECT * FROM push_tokens WHERE usuario_id = 'USUARIO_ID_AQUI'::uuid;

-- Deletar todos os tokens do usuário (descomente para executar)
-- DELETE FROM push_tokens WHERE usuario_id = 'USUARIO_ID_AQUI'::uuid;


-- ========================================
-- 14. REATIVAR TOKENS DESATIVADOS
-- ========================================

-- Ver tokens desativados
SELECT
  pt.id,
  u.nome as usuario,
  pt.last_used_at,
  AGE(NOW(), pt.last_used_at) as tempo_inativo
FROM push_tokens pt
JOIN usuarios u ON u.id = pt.usuario_id
WHERE pt.is_active = false
ORDER BY pt.last_used_at DESC;

-- Reativar tokens (descomente para executar)
-- UPDATE push_tokens
-- SET is_active = true, last_used_at = NOW()
-- WHERE id = 'TOKEN_ID_AQUI'::uuid;
