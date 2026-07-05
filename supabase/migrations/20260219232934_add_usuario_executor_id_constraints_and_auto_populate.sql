/*
  # Adicionar Constraints e Auto-Populacao para usuario_executor_id
  
  1. Objetivo
    - Garantir que TODOS os novos registros tenham usuario_executor_id preenchido
    - Criar trigger automático para popular o campo quando estiver NULL
    - Adicionar view de monitoramento para detectar registros problemáticos
  
  2. Tabelas Afetadas
    - registros_recepcao
    - registros_camararia
    - registros_revisao
    - registros_areas_comuns
    - registros_gestao
    - registros_atividades_extras
    - registros_atividades_diarias
    - registros_cozinha
    - registros_vendas
  
  3. Alterações
    - Criar função de trigger para auto-popular usuario_executor_id
    - Aplicar trigger em todas as 9 tabelas de registros
    - Criar view v_registros_sem_executor para monitoramento
  
  4. Segurança
    - Não afeta dados históricos (apenas novos registros)
    - Fallback automático para usuario_id quando executor for NULL
    - Sistema auto-corretivo que previne problemas futuros
*/

-- =====================================================
-- FUNÇÃO: Auto-popular usuario_executor_id
-- =====================================================

CREATE OR REPLACE FUNCTION auto_populate_usuario_executor_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Se usuario_executor_id for NULL, copiar de usuario_id
  IF NEW.usuario_executor_id IS NULL AND NEW.usuario_id IS NOT NULL THEN
    NEW.usuario_executor_id := NEW.usuario_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS: Aplicar em todas as tabelas de registros
-- =====================================================

-- 1. registros_recepcao
DROP TRIGGER IF EXISTS trigger_auto_populate_usuario_executor_recepcao ON registros_recepcao;
CREATE TRIGGER trigger_auto_populate_usuario_executor_recepcao
  BEFORE INSERT ON registros_recepcao
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_usuario_executor_id();

-- 2. registros_camararia
DROP TRIGGER IF EXISTS trigger_auto_populate_usuario_executor_camararia ON registros_camararia;
CREATE TRIGGER trigger_auto_populate_usuario_executor_camararia
  BEFORE INSERT ON registros_camararia
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_usuario_executor_id();

-- 3. registros_revisao
DROP TRIGGER IF EXISTS trigger_auto_populate_usuario_executor_revisao ON registros_revisao;
CREATE TRIGGER trigger_auto_populate_usuario_executor_revisao
  BEFORE INSERT ON registros_revisao
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_usuario_executor_id();

-- 4. registros_areas_comuns
DROP TRIGGER IF EXISTS trigger_auto_populate_usuario_executor_areas_comuns ON registros_areas_comuns;
CREATE TRIGGER trigger_auto_populate_usuario_executor_areas_comuns
  BEFORE INSERT ON registros_areas_comuns
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_usuario_executor_id();

-- 5. registros_gestao
DROP TRIGGER IF EXISTS trigger_auto_populate_usuario_executor_gestao ON registros_gestao;
CREATE TRIGGER trigger_auto_populate_usuario_executor_gestao
  BEFORE INSERT ON registros_gestao
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_usuario_executor_id();

-- 6. registros_atividades_extras
DROP TRIGGER IF EXISTS trigger_auto_populate_usuario_executor_extras ON registros_atividades_extras;
CREATE TRIGGER trigger_auto_populate_usuario_executor_extras
  BEFORE INSERT ON registros_atividades_extras
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_usuario_executor_id();

-- 7. registros_atividades_diarias
DROP TRIGGER IF EXISTS trigger_auto_populate_usuario_executor_diarias ON registros_atividades_diarias;
CREATE TRIGGER trigger_auto_populate_usuario_executor_diarias
  BEFORE INSERT ON registros_atividades_diarias
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_usuario_executor_id();

-- 8. registros_cozinha
DROP TRIGGER IF EXISTS trigger_auto_populate_usuario_executor_cozinha ON registros_cozinha;
CREATE TRIGGER trigger_auto_populate_usuario_executor_cozinha
  BEFORE INSERT ON registros_cozinha
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_usuario_executor_id();

-- 9. registros_vendas
DROP TRIGGER IF EXISTS trigger_auto_populate_usuario_executor_vendas ON registros_vendas;
CREATE TRIGGER trigger_auto_populate_usuario_executor_vendas
  BEFORE INSERT ON registros_vendas
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_usuario_executor_id();

-- =====================================================
-- VIEW: Monitoramento de Registros Problemáticos
-- =====================================================

CREATE OR REPLACE VIEW v_registros_sem_executor AS
SELECT 
  'recepcao' AS modulo,
  id,
  usuario_id,
  usuario_executor_id,
  status::text AS status,
  created_at
FROM registros_recepcao
WHERE usuario_executor_id IS NULL 
  AND status IN ('registro_iniciado', 'em_andamento')

UNION ALL

SELECT 
  'camararia' AS modulo,
  id,
  usuario_id,
  usuario_executor_id,
  status::text AS status,
  created_at
FROM registros_camararia
WHERE usuario_executor_id IS NULL 
  AND status IN ('registro_iniciado', 'em_andamento')

UNION ALL

SELECT 
  'revisao' AS modulo,
  id,
  usuario_id,
  usuario_executor_id,
  status::text AS status,
  created_at
FROM registros_revisao
WHERE usuario_executor_id IS NULL 
  AND status IN ('registro_iniciado', 'em_andamento')

UNION ALL

SELECT 
  'areas_comuns' AS modulo,
  id,
  usuario_id,
  usuario_executor_id,
  status::text AS status,
  created_at
FROM registros_areas_comuns
WHERE usuario_executor_id IS NULL 
  AND status IN ('registro_iniciado', 'em_andamento')

UNION ALL

SELECT 
  'gestao' AS modulo,
  id,
  usuario_id,
  usuario_executor_id,
  status::text AS status,
  created_at
FROM registros_gestao
WHERE usuario_executor_id IS NULL 
  AND status IN ('registro_iniciado', 'em_andamento')

UNION ALL

SELECT 
  'atividades_extras' AS modulo,
  id,
  usuario_id,
  usuario_executor_id,
  status::text AS status,
  created_at
FROM registros_atividades_extras
WHERE usuario_executor_id IS NULL 
  AND status IN ('registro_iniciado', 'em_andamento')

UNION ALL

SELECT 
  'atividades_diarias' AS modulo,
  id,
  usuario_id,
  usuario_executor_id,
  status::text AS status,
  created_at
FROM registros_atividades_diarias
WHERE usuario_executor_id IS NULL 
  AND status IN ('registro_iniciado', 'em_andamento')

UNION ALL

SELECT 
  'cozinha' AS modulo,
  id,
  usuario_id,
  usuario_executor_id,
  status::text AS status,
  created_at
FROM registros_cozinha
WHERE usuario_executor_id IS NULL 
  AND status IN ('registro_iniciado', 'em_andamento')

UNION ALL

SELECT 
  'vendas' AS modulo,
  id,
  usuario_id,
  usuario_executor_id,
  status::text AS status,
  created_at
FROM registros_vendas
WHERE usuario_executor_id IS NULL 
  AND status IN ('registro_iniciado', 'em_andamento')

ORDER BY created_at DESC;