/*
  # Corrigir estrutura multi-tenancy da tabela tipos_areas_comuns

  ## Objetivo
  Transformar a tabela tipos_areas_comuns de estrutura global para multi-tenant,
  permitindo que cada empresa tenha seus próprios tipos com nomes independentes.

  ## Alterações

  1. Nova Coluna
    - Adicionar coluna `empresa_id` (UUID, NOT NULL)
    - Foreign key para `empresas(id)` com CASCADE delete

  2. Migração de Dados
    - Associar todos os registros existentes à empresa LOTE20 Hotel Boutique
    - ID da empresa: 089757a1-fa6b-4cf1-a725-d029470bfdc2

  3. Constraints
    - Remover constraint UNIQUE antiga (apenas `nome`)
    - Criar constraint UNIQUE composta (nome, empresa_id)
    - Permitir mesmo nome em empresas diferentes

  4. Performance
    - Criar índice em `empresa_id` para otimizar queries

  5. Segurança (RLS)
    - Remover políticas antigas
    - Criar novas políticas que filtram por empresa_id do usuário
    - SELECT: visualizar apenas tipos da própria empresa
    - INSERT: adicionar apenas tipos na própria empresa
    - UPDATE: modificar apenas tipos da própria empresa
    - DELETE: remover apenas tipos da própria empresa
*/

-- 1. Adicionar coluna empresa_id (temporariamente nullable)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tipos_areas_comuns' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE tipos_areas_comuns ADD COLUMN empresa_id uuid;
  END IF;
END $$;

-- 2. Atualizar todos os registros existentes com a empresa LOTE20
UPDATE tipos_areas_comuns 
SET empresa_id = '089757a1-fa6b-4cf1-a725-d029470bfdc2'
WHERE empresa_id IS NULL;

-- 3. Tornar empresa_id NOT NULL e adicionar foreign key
ALTER TABLE tipos_areas_comuns 
  ALTER COLUMN empresa_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tipos_areas_comuns_empresa_id_fkey'
  ) THEN
    ALTER TABLE tipos_areas_comuns
      ADD CONSTRAINT tipos_areas_comuns_empresa_id_fkey
      FOREIGN KEY (empresa_id)
      REFERENCES empresas(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Remover constraint UNIQUE antiga (apenas nome)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tipos_areas_comuns_nome_key'
    AND table_name = 'tipos_areas_comuns'
  ) THEN
    ALTER TABLE tipos_areas_comuns DROP CONSTRAINT tipos_areas_comuns_nome_key;
  END IF;
END $$;

-- 5. Criar nova constraint UNIQUE composta (nome + empresa_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tipos_areas_comuns_nome_empresa_id_key'
  ) THEN
    ALTER TABLE tipos_areas_comuns
      ADD CONSTRAINT tipos_areas_comuns_nome_empresa_id_key
      UNIQUE (nome, empresa_id);
  END IF;
END $$;

-- 6. Criar índice em empresa_id para performance
CREATE INDEX IF NOT EXISTS idx_tipos_areas_comuns_empresa_id 
  ON tipos_areas_comuns(empresa_id);

-- 7. Remover políticas antigas
DROP POLICY IF EXISTS "Users can view tipos areas comuns" ON tipos_areas_comuns;
DROP POLICY IF EXISTS "Admin can insert tipos areas comuns" ON tipos_areas_comuns;
DROP POLICY IF EXISTS "Admin can update tipos areas comuns" ON tipos_areas_comuns;
DROP POLICY IF EXISTS "Admin can delete tipos areas comuns" ON tipos_areas_comuns;

-- 8. Criar novas políticas RLS com filtro por empresa

-- SELECT: Usuários podem ver apenas tipos da própria empresa
CREATE POLICY "Users can view own company tipos areas comuns"
  ON tipos_areas_comuns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.empresa_id = tipos_areas_comuns.empresa_id
    )
  );

-- INSERT: Admin pode adicionar tipos apenas na própria empresa
CREATE POLICY "Admin can insert own company tipos areas comuns"
  ON tipos_areas_comuns
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.profile = 'admin'
      AND u.empresa_id = tipos_areas_comuns.empresa_id
    )
  );

-- UPDATE: Admin pode atualizar tipos apenas da própria empresa
CREATE POLICY "Admin can update own company tipos areas comuns"
  ON tipos_areas_comuns
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.profile = 'admin'
      AND u.empresa_id = tipos_areas_comuns.empresa_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.profile = 'admin'
      AND u.empresa_id = tipos_areas_comuns.empresa_id
    )
  );

-- DELETE: Admin pode deletar tipos apenas da própria empresa
CREATE POLICY "Admin can delete own company tipos areas comuns"
  ON tipos_areas_comuns
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.profile = 'admin'
      AND u.empresa_id = tipos_areas_comuns.empresa_id
    )
  );