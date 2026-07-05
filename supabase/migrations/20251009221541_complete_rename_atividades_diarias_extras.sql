/*
  # Padronização Completa: Atividades Diárias e Extras

  ## Resumo
  Esta migration completa a padronização da nomenclatura, renomeando tabelas,
  atualizando perfis e ajustando todas as referências.

  ## Mudanças Principais

  ### 1. Renomeação de Tabelas
  - `registros_noturnas` → `registros_atividades_diarias`
  - `registros_diurnas` → `registros_atividades_extras`

  ### 2. Atualização de Perfis de Usuários
  - `atividades_noturnas` → `atividades_diarias`
  - `atividades_diurnas` → `atividades_extras`

  ### 3. Atualização de Tipos em Cancelamentos
  - `registro_noturnas` → `registro_atividades_diarias`
  - `registro_diurnas` → `registro_atividades_extras`

  ## Impacto
  - Todos os dados existentes são preservados
  - Índices e constraints são mantidos automaticamente
  - RLS policies são recriadas com novos nomes
  - Compatibilidade total com dados históricos

  ## Segurança
  - RLS é mantido em todas as tabelas
  - Policies são recriadas com as mesmas regras
  - Permissões de acesso permanecem inalteradas
*/

-- ============================================================================
-- ETAPA 1: Atualizar perfis de usuários
-- ============================================================================

-- Atualizar perfil atividades_noturnas para atividades_diarias
UPDATE usuarios 
SET profile = 'atividades_diarias'::user_profile_enum 
WHERE profile = 'atividades_noturnas'::user_profile_enum;

-- Atualizar perfil atividades_diurnas para atividades_extras
UPDATE usuarios 
SET profile = 'atividades_extras'::user_profile_enum 
WHERE profile = 'atividades_diurnas'::user_profile_enum;

-- ============================================================================
-- ETAPA 2: Remover policies existentes (serão recriadas após renomeação)
-- ============================================================================

DROP POLICY IF EXISTS "Admins: Full access to registros_noturnas" ON registros_noturnas;
DROP POLICY IF EXISTS "Usuários autenticados podem ler registros noturnos" ON registros_noturnas;
DROP POLICY IF EXISTS "Usuários de áreas comuns podem modificar seus registros notur" ON registros_noturnas;

DROP POLICY IF EXISTS "Admins: Full access to registros_diurnas" ON registros_diurnas;
DROP POLICY IF EXISTS "Usuários autenticados podem ler registros diurnos" ON registros_diurnas;
DROP POLICY IF EXISTS "Usuários de áreas comuns podem modificar seus registros diurn" ON registros_diurnas;

-- ============================================================================
-- ETAPA 3: Renomear tabelas
-- ============================================================================

ALTER TABLE IF EXISTS registros_noturnas RENAME TO registros_atividades_diarias;
ALTER TABLE IF EXISTS registros_diurnas RENAME TO registros_atividades_extras;

-- ============================================================================
-- ETAPA 4: Renomear constraints (primary keys e foreign keys)
-- ============================================================================

-- Registros Atividades Diárias
ALTER TABLE registros_atividades_diarias 
  RENAME CONSTRAINT registros_noturnas_pkey TO registros_atividades_diarias_pkey;

ALTER TABLE registros_atividades_diarias 
  RENAME CONSTRAINT fk_usuario_noturnas TO fk_usuario_atividades_diarias;

ALTER TABLE registros_atividades_diarias 
  RENAME CONSTRAINT fk_registros_noturnas_empresa TO fk_registros_atividades_diarias_empresa;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'registros_noturnas_tipo_atividade_id_fkey'
  ) THEN
    ALTER TABLE registros_atividades_diarias 
      RENAME CONSTRAINT registros_noturnas_tipo_atividade_id_fkey 
      TO registros_atividades_diarias_tipo_atividade_id_fkey;
  END IF;
END $$;

-- Registros Atividades Extras
ALTER TABLE registros_atividades_extras 
  RENAME CONSTRAINT registros_diurnas_pkey TO registros_atividades_extras_pkey;

ALTER TABLE registros_atividades_extras 
  RENAME CONSTRAINT fk_usuario TO fk_usuario_atividades_extras;

ALTER TABLE registros_atividades_extras 
  RENAME CONSTRAINT fk_registros_diurnas_empresa TO fk_registros_atividades_extras_empresa;

-- ============================================================================
-- ETAPA 5: Renomear índices
-- ============================================================================

-- Registros Atividades Diárias
ALTER INDEX IF EXISTS idx_registros_noturnas_data 
  RENAME TO idx_registros_atividades_diarias_data;

ALTER INDEX IF EXISTS idx_registros_noturnas_status 
  RENAME TO idx_registros_atividades_diarias_status;

ALTER INDEX IF EXISTS idx_registros_noturnas_usuario 
  RENAME TO idx_registros_atividades_diarias_usuario;

ALTER INDEX IF EXISTS idx_registros_noturnas_tipo_atividade 
  RENAME TO idx_registros_atividades_diarias_tipo_atividade;

-- Registros Atividades Extras
ALTER INDEX IF EXISTS idx_registros_diurnas_data 
  RENAME TO idx_registros_atividades_extras_data;

ALTER INDEX IF EXISTS idx_registros_diurnas_status 
  RENAME TO idx_registros_atividades_extras_status;

ALTER INDEX IF EXISTS idx_registros_diurnas_usuario 
  RENAME TO idx_registros_atividades_extras_usuario;

-- ============================================================================
-- ETAPA 6: Recriar RLS Policies com novos nomes
-- ============================================================================

-- Policies para registros_atividades_diarias
CREATE POLICY "Admins: Full access to registros_atividades_diarias"
  ON registros_atividades_diarias
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Usuários autenticados podem ler registros de atividades diárias"
  ON registros_atividades_diarias
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários podem modificar seus registros de atividades diárias"
  ON registros_atividades_diarias
  FOR ALL
  TO authenticated
  USING (
    (usuario_id = auth.uid()) OR 
    (EXISTS (
      SELECT 1 FROM usuarios 
      WHERE usuarios.id = auth.uid() 
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'areas_comuns'::user_profile_enum, 'camararia'::user_profile_enum, 'manutencao'::user_profile_enum])
        AND usuarios.active = true
    ))
  )
  WITH CHECK (
    (usuario_id = auth.uid()) OR 
    (EXISTS (
      SELECT 1 FROM usuarios 
      WHERE usuarios.id = auth.uid() 
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'areas_comuns'::user_profile_enum, 'camararia'::user_profile_enum, 'manutencao'::user_profile_enum])
        AND usuarios.active = true
    ))
  );

-- Policies para registros_atividades_extras
CREATE POLICY "Admins: Full access to registros_atividades_extras"
  ON registros_atividades_extras
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Usuários autenticados podem ler registros de atividades extras"
  ON registros_atividades_extras
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários podem modificar seus registros de atividades extras"
  ON registros_atividades_extras
  FOR ALL
  TO authenticated
  USING (
    (usuario_id = auth.uid()) OR 
    (EXISTS (
      SELECT 1 FROM usuarios 
      WHERE usuarios.id = auth.uid() 
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'areas_comuns'::user_profile_enum, 'camararia'::user_profile_enum, 'manutencao'::user_profile_enum])
        AND usuarios.active = true
    ))
  )
  WITH CHECK (
    (usuario_id = auth.uid()) OR 
    (EXISTS (
      SELECT 1 FROM usuarios 
      WHERE usuarios.id = auth.uid() 
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'areas_comuns'::user_profile_enum, 'camararia'::user_profile_enum, 'manutencao'::user_profile_enum])
        AND usuarios.active = true
    ))
  );

-- ============================================================================
-- ETAPA 7: Atualizar tipos na tabela cancelamentos
-- ============================================================================

-- Atualizar tipo registro_noturnas para registro_atividades_diarias
UPDATE cancelamentos 
SET tipo = 'registro_atividades_diarias' 
WHERE tipo = 'registro_noturnas';

-- Atualizar tipo registro_diurnas para registro_atividades_extras
UPDATE cancelamentos 
SET tipo = 'registro_atividades_extras' 
WHERE tipo = 'registro_diurnas';

-- ============================================================================
-- Fim da Migration
-- ============================================================================