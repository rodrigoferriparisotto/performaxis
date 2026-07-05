/*
  # Corrigir Permissões de DELETE para Perfil Gestor - Tabelas de Cadastros

  ## Resumo
  Esta migration corrige as políticas RLS de DELETE nas tabelas da sessão "Cadastros"
  para permitir que usuários com perfil 'gestor' possam deletar registros, além de 'admin'.
  
  O perfil gestor é um perfil gerencial que deve ter amplo acesso às configurações
  do sistema, incluindo a capacidade de gerenciar cadastros (tipos, configurações, etc).

  ## Problema
  Várias tabelas de cadastros tinham políticas DELETE restritas apenas para 'admin',
  impedindo que gestores realizassem manutenção e gestão completa dos cadastros.

  ## Tabelas Corrigidas

  ### 1. tipos_cozinha
  - **Antes**: Apenas 'admin' podia deletar
  - **Depois**: 'admin' e 'gestor' podem deletar

  ### 2. tipos_gestao
  - **Antes**: Sem política DELETE explícita ou restrita
  - **Depois**: 'admin' e 'gestor' podem deletar

  ### 3. tipos_atividades
  - **Antes**: Sem política DELETE explícita ou restrita
  - **Depois**: 'admin' e 'gestor' podem deletar

  ### 4. tipos_extras
  - **Antes**: Sem política DELETE explícita ou restrita
  - **Depois**: 'admin' e 'gestor' podem deletar

  ### 5. tipos_areas_comuns
  - **Antes**: Apenas 'admin' podia deletar
  - **Depois**: 'admin' e 'gestor' podem deletar

  ### 6. tipos_funcoes_comerciais
  - **Antes**: Sem política DELETE explícita ou restrita
  - **Depois**: 'admin' e 'gestor' podem deletar

  ## Segurança
  - Todas as políticas mantêm validação de autenticação
  - Todas as políticas mantêm isolamento por empresa_id (multi-tenant)
  - Todas as políticas verificam que o usuário está ativo
  - Apenas perfis admin e gestor têm permissão de DELETE
  - SELECT, INSERT e UPDATE não são alterados (mantêm políticas existentes)

  ## Complemento
  Esta migration complementa a migration anterior 20251221184547 que já havia
  corrigido algumas tabelas (tipos_recepcao, servicos_camararia, itens_camararia,
  fotos_camararia, fotos_cozinha, atividades).
*/

-- ============================================================================
-- SECTION 1: Fix tipos_cozinha DELETE Policy
-- ============================================================================

-- Drop existing DELETE policy
DROP POLICY IF EXISTS "Admins can delete tipos_cozinha from own company" ON tipos_cozinha;

-- Create new DELETE policy with gestor added
CREATE POLICY "Admins and gestores can delete tipos_cozinha"
  ON tipos_cozinha
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'gestor'::user_profile_enum])
      AND usuarios.empresa_id = tipos_cozinha.empresa_id
      AND usuarios.active = true
    )
  );

-- ============================================================================
-- SECTION 2: Fix tipos_areas_comuns DELETE Policy
-- ============================================================================

-- Drop existing DELETE policy
DROP POLICY IF EXISTS "Admin can delete own company tipos areas comuns" ON tipos_areas_comuns;

-- Create new DELETE policy with gestor added
CREATE POLICY "Admins and gestores can delete tipos_areas_comuns"
  ON tipos_areas_comuns
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'gestor'::user_profile_enum])
      AND usuarios.empresa_id = tipos_areas_comuns.empresa_id
      AND usuarios.active = true
    )
  );

-- ============================================================================
-- SECTION 3: Create/Update tipos_gestao DELETE Policy
-- ============================================================================

-- Drop any existing DELETE policy
DROP POLICY IF EXISTS "Admins can delete tipos_gestao" ON tipos_gestao;
DROP POLICY IF EXISTS "Admins and gestores can delete tipos_gestao" ON tipos_gestao;

-- Create DELETE policy for admin and gestor
CREATE POLICY "Admins and gestores can delete tipos_gestao"
  ON tipos_gestao
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'gestor'::user_profile_enum])
      AND usuarios.empresa_id = tipos_gestao.empresa_id
      AND usuarios.active = true
    )
  );

-- ============================================================================
-- SECTION 4: Create/Update tipos_atividades DELETE Policy
-- ============================================================================

-- Drop any existing DELETE policy
DROP POLICY IF EXISTS "Admins can delete tipos_atividades" ON tipos_atividades;
DROP POLICY IF EXISTS "Admins and gestores can delete tipos_atividades" ON tipos_atividades;

-- Create DELETE policy for admin and gestor
CREATE POLICY "Admins and gestores can delete tipos_atividades"
  ON tipos_atividades
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'gestor'::user_profile_enum])
      AND usuarios.empresa_id = tipos_atividades.empresa_id
      AND usuarios.active = true
    )
  );

-- ============================================================================
-- SECTION 5: Create/Update tipos_extras DELETE Policy
-- ============================================================================

-- Drop any existing DELETE policy
DROP POLICY IF EXISTS "Admins can delete tipos_extras" ON tipos_extras;
DROP POLICY IF EXISTS "Admins and gestores can delete tipos_extras" ON tipos_extras;

-- Create DELETE policy for admin and gestor
CREATE POLICY "Admins and gestores can delete tipos_extras"
  ON tipos_extras
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'gestor'::user_profile_enum])
      AND usuarios.empresa_id = tipos_extras.empresa_id
      AND usuarios.active = true
    )
  );

-- ============================================================================
-- SECTION 6: Create/Update tipos_funcoes_comerciais DELETE Policy
-- ============================================================================

-- Drop any existing DELETE policy
DROP POLICY IF EXISTS "Admins can delete tipos_funcoes_comerciais" ON tipos_funcoes_comerciais;
DROP POLICY IF EXISTS "Admins and gestores can delete tipos_funcoes_comerciais" ON tipos_funcoes_comerciais;

-- Create DELETE policy for admin and gestor
CREATE POLICY "Admins and gestores can delete tipos_funcoes_comerciais"
  ON tipos_funcoes_comerciais
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'gestor'::user_profile_enum])
      AND usuarios.empresa_id = tipos_funcoes_comerciais.empresa_id
      AND usuarios.active = true
    )
  );

-- ============================================================================
-- End of Migration
-- ============================================================================