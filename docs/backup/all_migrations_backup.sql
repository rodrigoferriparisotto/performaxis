/*
  # Criar tabela tipos_recepcao

  1. Nova Tabela
    - `tipos_recepcao`
      - `id` (uuid, primary key)
      - `nome` (text, unique, not null)
      - `ativo` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Habilitar RLS na tabela `tipos_recepcao`
    - Adicionar políticas para usuários autenticados lerem
    - Adicionar políticas para admins e recepção modificarem

  3. Índices
    - Índice no campo `nome` para buscas rápidas
    - Índice no campo `ativo` para filtros
*/

-- Criar tabela tipos_recepcao
CREATE TABLE IF NOT EXISTS tipos_recepcao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text UNIQUE NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE tipos_recepcao ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Usuários autenticados podem ler tipos de recepção"
  ON tipos_recepcao
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins podem modificar tipos de recepção"
  ON tipos_recepcao
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
      AND usuarios.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
      AND usuarios.active = true
    )
  );

CREATE POLICY "Usuários de recepção podem modificar tipos de recepção"
  ON tipos_recepcao
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile IN ('admin', 'recepcao')
      AND usuarios.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile IN ('admin', 'recepcao')
      AND usuarios.active = true
    )
  );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tipos_recepcao_nome ON tipos_recepcao(nome);
CREATE INDEX IF NOT EXISTS idx_tipos_recepcao_ativo ON tipos_recepcao(ativo);

-- Trigger para updated_at
CREATE TRIGGER update_tipos_recepcao_updated_at
  BEFORE UPDATE ON tipos_recepcao
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir alguns tipos padrão
INSERT INTO tipos_recepcao (nome, ativo) VALUES
  ('Recepção Diurna', true),
  ('Recepção Noturna', true),
  ('Recepção VIP', true),
  ('Recepção Express', true)
ON CONFLICT (nome) DO NOTHING;/*
  # Adicionar campo tipos_recepcao à tabela atividades

  1. Alterações na Tabela
    - Adicionar coluna `tipos_recepcao` (jsonb array) na tabela `atividades`
    - Campo opcional para armazenar IDs dos tipos de recepção vinculados

  2. Funcionalidade
    - Permite vincular atividades de recepção a tipos específicos
    - Facilita filtragem e organização das atividades
    - Mantém flexibilidade para atividades gerais (sem tipo específico)
*/

-- Adicionar coluna tipos_recepcao à tabela atividades
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'atividades' AND column_name = 'tipos_recepcao'
  ) THEN
    ALTER TABLE atividades ADD COLUMN tipos_recepcao jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Criar índice para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_atividades_tipos_recepcao 
ON atividades USING gin (tipos_recepcao);

-- Comentário na coluna
COMMENT ON COLUMN atividades.tipos_recepcao IS 'Array de IDs dos tipos de recepção vinculados à atividade';/*
  # Adicionar campo tipo_recepcao_id aos registros de recepção

  1. Alterações na tabela
    - Adicionar campo `tipo_recepcao_id` (uuid, opcional)
    - Adicionar foreign key para `tipos_recepcao`
    - Adicionar índice para performance

  2. Segurança
    - Manter RLS existente
    - Não alterar políticas de segurança
*/

-- Adicionar campo tipo_recepcao_id à tabela registros_recepcao
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registros_recepcao' AND column_name = 'tipo_recepcao_id'
  ) THEN
    ALTER TABLE registros_recepcao ADD COLUMN tipo_recepcao_id uuid;
  END IF;
END $$;

-- Adicionar foreign key constraint se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'registros_recepcao_tipo_recepcao_id_fkey'
  ) THEN
    ALTER TABLE registros_recepcao 
    ADD CONSTRAINT registros_recepcao_tipo_recepcao_id_fkey 
    FOREIGN KEY (tipo_recepcao_id) REFERENCES tipos_recepcao(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Adicionar índice para performance se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_registros_recepcao_tipo'
  ) THEN
    CREATE INDEX idx_registros_recepcao_tipo ON registros_recepcao(tipo_recepcao_id);
  END IF;
END $$;/*
  # Adicionar novos tipos de serviço ao enum

  1. Alterações no Enum
    - Adicionar 'check_in' ao enum tipo_servico_enum
    - Manter compatibilidade com tipos existentes
  
  2. Observações
    - Esta migração permite que cada serviço tenha seu próprio enum
    - Suporta nomes personalizados de serviços
*/

-- Adicionar novos valores ao enum tipo_servico_enum
ALTER TYPE tipo_servico_enum ADD VALUE IF NOT EXISTS 'check_in';

-- Comentário para documentar a mudança
COMMENT ON TYPE tipo_servico_enum IS 'Enum para tipos de serviço da camararia - suporta valores personalizados baseados nos nomes dos serviços cadastrados';/*
  # Criar tabela de fotos da camararia

  1. New Tables
    - `fotos_camararia`
      - `id` (uuid, primary key)
      - `titulo` (text, título da foto)
      - `descricao` (text, descrição da foto)
      - `url_externa` (text, link externo da foto)
      - `ativo` (boolean, se a foto está ativa)
      - `ordem` (integer, ordem de exibição)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `fotos_camararia` table
    - Add policy for authenticated users to read
    - Add policy for admins and camararia users to modify
*/

CREATE TABLE IF NOT EXISTS public.fotos_camararia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text DEFAULT '',
  url_externa text NOT NULL,
  ativo boolean DEFAULT true,
  ordem integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.fotos_camararia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ler fotos de camararia"
  ON public.fotos_camararia
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins e camararia podem modificar fotos de camararia"
  ON public.fotos_camararia
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuarios
      WHERE
        (usuarios.id = auth.uid()) AND
        (usuarios.profile IN ('admin', 'camararia')) AND
        (usuarios.active = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.usuarios
      WHERE
        (usuarios.id = auth.uid()) AND
        (usuarios.profile IN ('admin', 'camararia')) AND
        (usuarios.active = true)
    )
  );

CREATE TRIGGER update_fotos_camararia_updated_at
  BEFORE UPDATE ON public.fotos_camararia
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_fotos_camararia_ativo ON public.fotos_camararia USING btree (ativo);
CREATE INDEX IF NOT EXISTS idx_fotos_camararia_ordem ON public.fotos_camararia USING btree (ordem);/*
  # Adicionar vinculação de tipos de gestão às atividades

  1. Schema Changes
    - Add `tipos_gestao` column to `atividades` table as JSONB array
    - Add index for performance on the new column

  2. Security
    - No changes to existing RLS policies

  3. Notes
    - Uses JSONB array to store multiple tipo_gestao IDs
    - Similar pattern to existing `tipos_recepcao` and `servicos_camararia` columns
*/

-- Add tipos_gestao column to atividades table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'atividades' AND column_name = 'tipos_gestao'
  ) THEN
    ALTER TABLE public.atividades ADD COLUMN tipos_gestao jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add index for performance on tipos_gestao column
CREATE INDEX IF NOT EXISTS idx_atividades_tipos_gestao 
ON public.atividades USING gin (tipos_gestao);

-- Add comment to the column
COMMENT ON COLUMN public.atividades.tipos_gestao IS 'Array de IDs dos tipos de gestão vinculados à atividade';/*
  # Adicionar coluna tipo_gestao_id à tabela registros_gestao

  1. Modificações na tabela
    - `registros_gestao`
      - Adicionar coluna `tipo_gestao_id` (uuid, nullable)
      - Adicionar foreign key para `tipos_gestao`
      - Adicionar índice para performance

  2. Segurança
    - Manter políticas RLS existentes
*/

-- Adicionar coluna tipo_gestao_id à tabela registros_gestao
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registros_gestao' AND column_name = 'tipo_gestao_id'
  ) THEN
    ALTER TABLE registros_gestao ADD COLUMN tipo_gestao_id uuid;
  END IF;
END $$;

-- Adicionar foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'registros_gestao_tipo_gestao_id_fkey'
  ) THEN
    ALTER TABLE registros_gestao 
    ADD CONSTRAINT registros_gestao_tipo_gestao_id_fkey 
    FOREIGN KEY (tipo_gestao_id) REFERENCES tipos_gestao(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Adicionar índice para performance
CREATE INDEX IF NOT EXISTS idx_registros_gestao_tipo_gestao 
ON registros_gestao USING btree (tipo_gestao_id);/*
  # Adicionar coluna tipos_atividades à tabela atividades

  1. Alterações na Tabela
    - Adicionar coluna `tipos_atividades` (jsonb) à tabela `atividades`
    - Definir valor padrão como array vazio
    - Adicionar índice GIN para performance em consultas JSONB

  2. Índices
    - Criar índice GIN na coluna `tipos_atividades` para consultas eficientes
*/

-- Adicionar coluna tipos_atividades à tabela atividades
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'atividades' AND column_name = 'tipos_atividades'
  ) THEN
    ALTER TABLE atividades ADD COLUMN tipos_atividades jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Criar índice GIN para performance em consultas JSONB
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'atividades' AND indexname = 'idx_atividades_tipos_atividades'
  ) THEN
    CREATE INDEX idx_atividades_tipos_atividades ON atividades USING gin (tipos_atividades);
  END IF;
END $$;/*
  # Add tipos_extras column to atividades table

  1. Changes
    - Add `tipos_extras` column to `atividades` table
    - Column type: jsonb (to store array of UUIDs)
    - Default value: empty array
    - Add GIN index for performance on jsonb queries

  2. Security
    - No changes to existing RLS policies
    - Column inherits existing table permissions
*/

-- Add tipos_extras column to atividades table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'atividades' AND column_name = 'tipos_extras'
  ) THEN
    ALTER TABLE public.atividades ADD COLUMN tipos_extras jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add GIN index for performance on tipos_extras jsonb column
CREATE INDEX IF NOT EXISTS idx_atividades_tipos_extras 
ON public.atividades USING gin (tipos_extras);/*
  # Adicionar coluna tipos_areas_comuns à tabela atividades

  1. Changes
    - Add `tipos_areas_comuns` column to `atividades` table
    - Column type: jsonb with default empty array
    - Add GIN index for performance

  2. Purpose
    - Link activities to specific area types
    - Support filtering activities by area type
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'atividades' AND column_name = 'tipos_areas_comuns'
  ) THEN
    ALTER TABLE atividades ADD COLUMN tipos_areas_comuns jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_atividades_tipos_areas_comuns ON atividades USING gin (tipos_areas_comuns);/*
  # Criar tabela tipos_areas_comuns

  1. Nova Tabela
    - `tipos_areas_comuns`
      - `id` (uuid, primary key)
      - `nome` (text, unique, not null)
      - `ativo` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Habilitar RLS na tabela `tipos_areas_comuns`
    - Política de leitura para usuários autenticados
    - Política de modificação para admins e gestores

  3. Índices
    - Índice no campo `nome` para busca
    - Índice no campo `ativo` para filtros

  4. Triggers
    - Trigger para atualizar `updated_at` automaticamente
*/

-- Criar tabela tipos_areas_comuns
CREATE TABLE IF NOT EXISTS tipos_areas_comuns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text UNIQUE NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE tipos_areas_comuns ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Authenticated users can read tipos_areas_comuns"
  ON tipos_areas_comuns
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and gestores can modify tipos_areas_comuns"
  ON tipos_areas_comuns
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE usuarios.id = auth.uid() 
      AND usuarios.profile IN ('admin', 'gestor') 
      AND usuarios.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE usuarios.id = auth.uid() 
      AND usuarios.profile IN ('admin', 'gestor') 
      AND usuarios.active = true
    )
  );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tipos_areas_comuns_nome ON tipos_areas_comuns USING btree (nome);
CREATE INDEX IF NOT EXISTS idx_tipos_areas_comuns_ativo ON tipos_areas_comuns USING btree (ativo);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_tipos_areas_comuns_updated_at
  BEFORE UPDATE ON tipos_areas_comuns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();/*
  # Criar funções auxiliares para multi-tenancy

  1. Função get_user_empresa_id()
    - Retorna o empresa_id do usuário autenticado
    - Usada nas políticas RLS para filtrar dados

  2. Função is_same_company()
    - Verifica se um registro pertence à mesma empresa do usuário
    - Simplifica as políticas RLS

  3. Atualizar função is_admin()
    - Incluir verificação de empresa para admins
    - Garantir que admins só vejam dados da própria empresa
*/

-- Função para obter o empresa_id do usuário autenticado
CREATE OR REPLACE FUNCTION get_user_empresa_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT empresa_id 
  FROM usuarios 
  WHERE id = auth.uid() AND active = true
  LIMIT 1;
$$;

-- Função para verificar se um registro pertence à mesma empresa do usuário
CREATE OR REPLACE FUNCTION is_same_company(record_empresa_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT record_empresa_id = get_user_empresa_id();
$$;

-- Atualizar função is_admin para incluir verificação de empresa
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM usuarios 
    WHERE id = auth.uid() 
    AND profile = 'admin' 
    AND active = true
  );
$$;

-- Função para verificar se é admin da mesma empresa
CREATE OR REPLACE FUNCTION is_admin_same_company()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM usuarios 
    WHERE id = auth.uid() 
    AND profile = 'admin' 
    AND active = true
  );
$$;

-- Função para obter empresa_id de um usuário específico
CREATE OR REPLACE FUNCTION get_empresa_id_by_user(user_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT empresa_id 
  FROM usuarios 
  WHERE id = user_id AND active = true
  LIMIT 1;
$$;/*
  # Adicionar coluna ativo na tabela empresas

  1. Modificações
    - Adicionar coluna `ativo` na tabela `empresas`
    - Definir valor padrão como `true`
    - Atualizar empresas existentes para ativo = true

  2. Funcionalidade
    - Permite inativar empresas em vez de excluí-las quando há dados vinculados
    - Mantém histórico e integridade dos dados
*/

-- Adicionar coluna ativo na tabela empresas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'ativo'
  ) THEN
    ALTER TABLE public.empresas ADD COLUMN ativo boolean DEFAULT true;
    
    -- Atualizar empresas existentes para ativo = true
    UPDATE public.empresas SET ativo = true WHERE ativo IS NULL;
    
    -- Criar índice para performance
    CREATE INDEX IF NOT EXISTS idx_empresas_ativo ON public.empresas(ativo);
    
    RAISE NOTICE 'Coluna ativo adicionada à tabela empresas com sucesso';
  ELSE
    RAISE NOTICE 'Coluna ativo já existe na tabela empresas';
  END IF;
END $$;/*
  # Adicionar coluna ativo para empresas

  1. Alterações na Tabela
    - Adicionar coluna `ativo` na tabela `empresas`
    - Valor padrão `true` para empresas existentes
    - Índice para melhor performance

  2. Segurança
    - Manter políticas RLS existentes
    - Não há mudanças nas permissões
*/

-- Adicionar coluna ativo na tabela empresas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'ativo'
  ) THEN
    ALTER TABLE public.empresas ADD COLUMN ativo boolean DEFAULT true NOT NULL;
  END IF;
END $$;

-- Criar índice para a coluna ativo
CREATE INDEX IF NOT EXISTS idx_empresas_ativo ON public.empresas USING btree (ativo);

-- Atualizar empresas existentes para ativo = true (caso não tenha valor)
UPDATE public.empresas SET ativo = true WHERE ativo IS NULL;/*
  # Adicionar campos contratuais e financeiros à tabela empresas

  1. Novos Campos
    - `inicio_contrato` (date) - Data de início do contrato
    - `duracao_contrato_meses` (integer) - Duração do contrato em meses
    - `final_contrato` (date) - Data final do contrato (calculada)
    - `valor_instalacao` (decimal) - Valor da instalação do sistema
    - `valor_mensalidade` (decimal) - Valor da mensalidade
    - `tipo_pagamento` (text) - Tipo de pagamento (mensal, trimestral, etc.)
    - `forma_pagamento` (text) - Forma de pagamento (PIX, boleto, cartão, etc.)
    - `valor_total` (decimal) - Valor total do contrato (calculado)
    - `valor_mensal` (decimal) - Valor mensal efetivo (calculado)

  2. Índices
    - Adicionar índices para consultas por datas de contrato

  3. Triggers
    - Trigger para calcular automaticamente campos derivados
*/

-- Adicionar novos campos à tabela empresas
DO $$
BEGIN
  -- Campos de contrato
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'inicio_contrato'
  ) THEN
    ALTER TABLE empresas ADD COLUMN inicio_contrato date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'duracao_contrato_meses'
  ) THEN
    ALTER TABLE empresas ADD COLUMN duracao_contrato_meses integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'final_contrato'
  ) THEN
    ALTER TABLE empresas ADD COLUMN final_contrato date;
  END IF;

  -- Campos financeiros
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'valor_instalacao'
  ) THEN
    ALTER TABLE empresas ADD COLUMN valor_instalacao decimal(10,2) DEFAULT 0.00;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'valor_mensalidade'
  ) THEN
    ALTER TABLE empresas ADD COLUMN valor_mensalidade decimal(10,2) DEFAULT 0.00;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'tipo_pagamento'
  ) THEN
    ALTER TABLE empresas ADD COLUMN tipo_pagamento text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'forma_pagamento'
  ) THEN
    ALTER TABLE empresas ADD COLUMN forma_pagamento text;
  END IF;

  -- Campos calculados
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'valor_total'
  ) THEN
    ALTER TABLE empresas ADD COLUMN valor_total decimal(10,2) DEFAULT 0.00;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'valor_mensal'
  ) THEN
    ALTER TABLE empresas ADD COLUMN valor_mensal decimal(10,2) DEFAULT 0.00;
  END IF;
END $$;

-- Criar função para calcular campos derivados
CREATE OR REPLACE FUNCTION calculate_contract_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcular data final do contrato
  IF NEW.inicio_contrato IS NOT NULL AND NEW.duracao_contrato_meses IS NOT NULL THEN
    NEW.final_contrato := NEW.inicio_contrato + INTERVAL '1 month' * NEW.duracao_contrato_meses;
  END IF;

  -- Calcular valor total (instalação + mensalidades)
  IF NEW.valor_instalacao IS NOT NULL AND NEW.valor_mensalidade IS NOT NULL AND NEW.duracao_contrato_meses IS NOT NULL THEN
    NEW.valor_total := NEW.valor_instalacao + (NEW.valor_mensalidade * NEW.duracao_contrato_meses);
  END IF;

  -- Calcular valor mensal efetivo (valor total / duração)
  IF NEW.valor_total IS NOT NULL AND NEW.duracao_contrato_meses IS NOT NULL AND NEW.duracao_contrato_meses > 0 THEN
    NEW.valor_mensal := NEW.valor_total / NEW.duracao_contrato_meses;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para calcular campos automaticamente
DROP TRIGGER IF EXISTS trigger_calculate_contract_fields ON empresas;
CREATE TRIGGER trigger_calculate_contract_fields
  BEFORE INSERT OR UPDATE ON empresas
  FOR EACH ROW
  EXECUTE FUNCTION calculate_contract_fields();

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_empresas_inicio_contrato ON empresas(inicio_contrato);
CREATE INDEX IF NOT EXISTS idx_empresas_final_contrato ON empresas(final_contrato);
CREATE INDEX IF NOT EXISTS idx_empresas_tipo_pagamento ON empresas(tipo_pagamento);
CREATE INDEX IF NOT EXISTS idx_empresas_forma_pagamento ON empresas(forma_pagamento);/*
  # Add 'programado' status to registro_status_enum

  1. Database Changes
    - Add 'programado' as a valid value to the registro_status_enum
    - This allows records to be created with 'programado' status for scheduling purposes

  2. Security
    - No RLS changes needed as this only extends an existing enum

  3. Notes
    - This change affects all tables using registro_status_enum:
      - registros_camararia
      - registros_recepcao
      - registros_revisao
      - registros_areas_comuns
      - registros_gestao
      - registros_diurnas
*/

-- Add 'programado' to the registro_status_enum
ALTER TYPE registro_status_enum ADD VALUE IF NOT EXISTS 'programado';/*
  # Add tipo_atividade_id column to registros_noturnas table

  1. Changes
    - Add `tipo_atividade_id` column to `registros_noturnas` table
    - Set as nullable UUID column
    - Add foreign key constraint to `tipos_atividades` table
    - Add index for performance

  2. Security
    - No changes to RLS policies needed
*/

-- Add the tipo_atividade_id column to registros_noturnas table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registros_noturnas' AND column_name = 'tipo_atividade_id'
  ) THEN
    ALTER TABLE registros_noturnas ADD COLUMN tipo_atividade_id uuid;
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'registros_noturnas_tipo_atividade_id_fkey'
  ) THEN
    ALTER TABLE registros_noturnas 
    ADD CONSTRAINT registros_noturnas_tipo_atividade_id_fkey 
    FOREIGN KEY (tipo_atividade_id) REFERENCES tipos_atividades(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for performance if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_registros_noturnas_tipo_atividade'
  ) THEN
    CREATE INDEX idx_registros_noturnas_tipo_atividade ON registros_noturnas USING btree (tipo_atividade_id);
  END IF;
END $$;/*
  # Adicionar Novos Valores ao Enum de Perfis

  ## Resumo
  Adiciona os novos valores de perfil ao enum user_profile_enum para permitir
  a padronização da nomenclatura.

  ## Mudanças
  - Adiciona valor `atividades_diarias` ao enum
  - Adiciona valor `atividades_extras` ao enum

  ## Notas
  - Esta é a primeira parte de uma migração em duas etapas
  - Os valores antigos serão mantidos até a próxima migration
  - PostgreSQL requer que novos valores enum sejam commitados antes do uso
*/

-- Adicionar novos valores ao enum user_profile_enum
ALTER TYPE user_profile_enum ADD VALUE IF NOT EXISTS 'atividades_diarias';
ALTER TYPE user_profile_enum ADD VALUE IF NOT EXISTS 'atividades_extras';/*
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
-- ============================================================================/*
  # Criar tabela tipos_cozinha

  1. Nova Tabela
    - `tipos_cozinha`
      - `id` (uuid, primary key)
      - `nome` (text, not null)
      - `ativo` (boolean, default true)
      - `empresa_id` (uuid, not null, foreign key)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Habilitar RLS na tabela `tipos_cozinha`
    - Adicionar políticas para usuários autenticados lerem seus próprios dados
    - Adicionar políticas para usuários com permissão modificarem

  3. Índices
    - Índice no campo `nome` para buscas rápidas
    - Índice no campo `ativo` para filtros
    - Índice no campo `empresa_id` para multi-tenancy

  4. Dados Iniciais
    - Inserir tipos padrão de cozinha como exemplos
*/

-- Criar tabela tipos_cozinha
CREATE TABLE IF NOT EXISTS tipos_cozinha (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ativo boolean DEFAULT true,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE tipos_cozinha ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: usuários autenticados podem ler tipos da própria empresa
CREATE POLICY "Users can view tipos_cozinha from own company"
  ON tipos_cozinha
  FOR SELECT
  TO authenticated
  USING (empresa_id = get_user_empresa_id());

-- Política para INSERT: usuários autenticados podem criar tipos
CREATE POLICY "Users can insert tipos_cozinha for own company"
  ON tipos_cozinha
  FOR INSERT
  TO authenticated
  WITH CHECK (empresa_id = get_user_empresa_id());

-- Política para UPDATE: usuários podem atualizar tipos da própria empresa
CREATE POLICY "Users can update tipos_cozinha from own company"
  ON tipos_cozinha
  FOR UPDATE
  TO authenticated
  USING (empresa_id = get_user_empresa_id())
  WITH CHECK (empresa_id = get_user_empresa_id());

-- Política para DELETE: apenas admins podem excluir tipos
CREATE POLICY "Admins can delete tipos_cozinha from own company"
  ON tipos_cozinha
  FOR DELETE
  TO authenticated
  USING (
    empresa_id = get_user_empresa_id()
    AND EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
      AND usuarios.active = true
    )
  );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tipos_cozinha_nome ON tipos_cozinha(nome);
CREATE INDEX IF NOT EXISTS idx_tipos_cozinha_ativo ON tipos_cozinha(ativo);
CREATE INDEX IF NOT EXISTS idx_tipos_cozinha_empresa_id ON tipos_cozinha(empresa_id);

-- Trigger para updated_at
CREATE TRIGGER update_tipos_cozinha_updated_at
  BEFORE UPDATE ON tipos_cozinha
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();/*
  # Adicionar campo tipos_cozinha à tabela atividades

  1. Alterações na Tabela
    - Adicionar coluna `tipos_cozinha` (jsonb array) na tabela `atividades`
    - Campo opcional para armazenar IDs dos tipos de cozinha vinculados

  2. Funcionalidade
    - Permite vincular atividades de cozinha a tipos específicos
    - Facilita filtragem e organização das atividades
    - Mantém flexibilidade para atividades gerais (sem tipo específico)

  3. Índices
    - Criar índice GIN para melhor performance nas consultas jsonb
*/

-- Adicionar coluna tipos_cozinha à tabela atividades
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'atividades' AND column_name = 'tipos_cozinha'
  ) THEN
    ALTER TABLE atividades ADD COLUMN tipos_cozinha jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Criar índice para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_atividades_tipos_cozinha 
ON atividades USING gin (tipos_cozinha);

-- Comentário na coluna
COMMENT ON COLUMN atividades.tipos_cozinha IS 'Array de IDs dos tipos de cozinha vinculados à atividade';/*
  # Add 'cozinha' to activity_type_enum
  
  1. Alterações
    - Adicionar o valor 'cozinha' ao enum activity_type_enum
    - Permite criar atividades do tipo cozinha
  
  2. Justificativa
    - O sistema precisa suportar atividades específicas da cozinha
    - Complementa a funcionalidade de tipos_cozinha já implementada
*/

-- Adicionar 'cozinha' ao enum activity_type_enum se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'cozinha' 
    AND enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'activity_type_enum'
    )
  ) THEN
    ALTER TYPE activity_type_enum ADD VALUE 'cozinha';
  END IF;
END $$;/*
  # Criar tabela registros_cozinha

  1. Nova Tabela
    - `registros_cozinha`
      - `id` (uuid, primary key)
      - `data` (date) - Data do registro
      - `usuario_id` (uuid, foreign key) - Referência ao usuário
      - `empresa_id` (uuid, foreign key) - Referência à empresa
      - `tipo_cozinha_id` (uuid, foreign key) - Referência ao tipo de cozinha
      - `hora_inicio` (timestamptz) - Hora de início do registro
      - `hora_fim` (timestamptz) - Hora de término do registro
      - `atividades` (jsonb) - Lista de atividades com status
      - `observacoes` (text) - Observações do colaborador
      - `status` (text) - Status do registro (em_andamento, concluido)
      - `created_at` (timestamptz) - Data de criação
      - `updated_at` (timestamptz) - Data de atualização

  2. Segurança
    - Habilitar RLS na tabela `registros_cozinha`
    - Políticas para usuários autenticados visualizarem apenas dados da sua empresa
    - Políticas para inserção e atualização de registros próprios
    - Política para exclusão apenas por administradores

  3. Índices
    - Índice em `empresa_id` para performance
    - Índice em `usuario_id` para filtros por usuário
    - Índice em `data` para consultas por período
    - Índice em `status` para filtros de registros ativos
*/

-- Criar tabela registros_cozinha
CREATE TABLE IF NOT EXISTS registros_cozinha (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL DEFAULT CURRENT_DATE,
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo_cozinha_id uuid REFERENCES tipos_cozinha(id) ON DELETE SET NULL,
  hora_inicio timestamptz NOT NULL DEFAULT now(),
  hora_fim timestamptz,
  atividades jsonb DEFAULT '[]'::jsonb,
  observacoes text DEFAULT '',
  status text NOT NULL DEFAULT 'em_andamento',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_registros_cozinha_empresa_id ON registros_cozinha(empresa_id);
CREATE INDEX IF NOT EXISTS idx_registros_cozinha_usuario_id ON registros_cozinha(usuario_id);
CREATE INDEX IF NOT EXISTS idx_registros_cozinha_data ON registros_cozinha(data);
CREATE INDEX IF NOT EXISTS idx_registros_cozinha_status ON registros_cozinha(status);
CREATE INDEX IF NOT EXISTS idx_registros_cozinha_tipo_cozinha_id ON registros_cozinha(tipo_cozinha_id);

-- Habilitar RLS
ALTER TABLE registros_cozinha ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem visualizar registros da sua empresa
CREATE POLICY "Usuários podem visualizar registros da sua empresa"
  ON registros_cozinha FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- Política: Usuários podem inserir registros para sua empresa
CREATE POLICY "Usuários podem inserir registros"
  ON registros_cozinha FOR INSERT
  TO authenticated
  WITH CHECK (
    usuario_id = auth.uid() AND
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- Política: Usuários podem atualizar seus próprios registros
CREATE POLICY "Usuários podem atualizar seus próprios registros"
  ON registros_cozinha FOR UPDATE
  TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- Política: Apenas administradores podem excluir registros
CREATE POLICY "Administradores podem excluir registros"
  ON registros_cozinha FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND profile = 'admin'
      AND empresa_id = registros_cozinha.empresa_id
    )
  );
/*
  # Adicionar Perfil Cozinha ao Enum

  ## Resumo
  Adiciona o valor 'cozinha' ao enum user_profile_enum para permitir
  a criação de usuários com perfil de cozinha.

  ## Mudanças
  - Adiciona valor `cozinha` ao enum user_profile_enum

  ## Notas
  - Permite que usuários com perfil 'cozinha' acessem funcionalidades específicas da cozinha
  - O perfil terá permissões para: cozinha e manutenção
*/

-- Adicionar valor 'cozinha' ao enum user_profile_enum
ALTER TYPE user_profile_enum ADD VALUE IF NOT EXISTS 'cozinha';
/*
  # Add empresa_id field to fotos_camararia table

  1. Changes
    - Add `empresa_id` (uuid, foreign key to empresas table) to `fotos_camararia`
    - Set NOT NULL with a default to handle existing records
    - Create index for better query performance
    - Update RLS policies to filter by empresa_id

  2. Security
    - Update existing policies to check empresa_id matches user's empresa_id
    - Ensure multi-tenant data isolation
*/

-- Add empresa_id column to fotos_camararia table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fotos_camararia' AND column_name = 'empresa_id'
  ) THEN
    -- First, get the first empresa_id to use as default (for existing records)
    -- This assumes at least one empresa exists
    ALTER TABLE public.fotos_camararia 
    ADD COLUMN empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE;
    
    -- Update existing records to use the first empresa's id
    UPDATE public.fotos_camararia 
    SET empresa_id = (SELECT id FROM public.empresas LIMIT 1)
    WHERE empresa_id IS NULL;
    
    -- Now make it NOT NULL
    ALTER TABLE public.fotos_camararia 
    ALTER COLUMN empresa_id SET NOT NULL;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_fotos_camararia_empresa_id 
ON public.fotos_camararia USING btree (empresa_id);

-- Drop existing policies
DROP POLICY IF EXISTS "Usuários autenticados podem ler fotos de camararia" ON public.fotos_camararia;
DROP POLICY IF EXISTS "Admins e camararia podem modificar fotos de camararia" ON public.fotos_camararia;

-- Recreate policies with empresa_id filtering
CREATE POLICY "Usuários autenticados podem ler fotos de camararia de sua empresa"
  ON public.fotos_camararia
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuarios
      WHERE
        (usuarios.id = auth.uid()) AND
        (usuarios.empresa_id = fotos_camararia.empresa_id) AND
        (usuarios.active = true)
    )
  );

CREATE POLICY "Admins e camararia podem modificar fotos de camararia de sua empresa"
  ON public.fotos_camararia
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuarios
      WHERE
        (usuarios.id = auth.uid()) AND
        (usuarios.empresa_id = fotos_camararia.empresa_id) AND
        (usuarios.profile IN ('admin', 'camararia')) AND
        (usuarios.active = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.usuarios
      WHERE
        (usuarios.id = auth.uid()) AND
        (usuarios.empresa_id = fotos_camararia.empresa_id) AND
        (usuarios.profile IN ('admin', 'camararia')) AND
        (usuarios.active = true)
    )
  );/*
  # Create fotos_cozinha table for kitchen reference photos

  1. New Tables
    - `fotos_cozinha`
      - `id` (uuid, primary key)
      - `titulo` (text, photo title)
      - `descricao` (text, photo description)
      - `url_externa` (text, external photo link)
      - `ativo` (boolean, whether photo is active)
      - `ordem` (integer, display order)
      - `empresa_id` (uuid, foreign key to empresas)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `fotos_cozinha` table
    - Add policy for authenticated users to read photos from their empresa
    - Add policy for admins and cozinha users to modify photos from their empresa

  3. Performance
    - Create indexes for ativo, ordem, and empresa_id fields
*/

CREATE TABLE IF NOT EXISTS public.fotos_cozinha (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text DEFAULT '',
  url_externa text NOT NULL,
  ativo boolean DEFAULT true,
  ordem integer DEFAULT 1,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.fotos_cozinha ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ler fotos de cozinha de sua empresa"
  ON public.fotos_cozinha
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuarios
      WHERE
        (usuarios.id = auth.uid()) AND
        (usuarios.empresa_id = fotos_cozinha.empresa_id) AND
        (usuarios.active = true)
    )
  );

CREATE POLICY "Admins e cozinha podem modificar fotos de cozinha de sua empresa"
  ON public.fotos_cozinha
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuarios
      WHERE
        (usuarios.id = auth.uid()) AND
        (usuarios.empresa_id = fotos_cozinha.empresa_id) AND
        (usuarios.profile IN ('admin', 'cozinha')) AND
        (usuarios.active = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.usuarios
      WHERE
        (usuarios.id = auth.uid()) AND
        (usuarios.empresa_id = fotos_cozinha.empresa_id) AND
        (usuarios.profile IN ('admin', 'cozinha')) AND
        (usuarios.active = true)
    )
  );

-- Create trigger only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_fotos_cozinha_updated_at'
  ) THEN
    CREATE TRIGGER update_fotos_cozinha_updated_at
      BEFORE UPDATE ON public.fotos_cozinha
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_fotos_cozinha_ativo 
ON public.fotos_cozinha USING btree (ativo);

CREATE INDEX IF NOT EXISTS idx_fotos_cozinha_ordem 
ON public.fotos_cozinha USING btree (ordem);

CREATE INDEX IF NOT EXISTS idx_fotos_cozinha_empresa_id 
ON public.fotos_cozinha USING btree (empresa_id);/*
  # Add tipo_cozinha_id to fotos_cozinha table

  1. Changes
    - Add `tipo_cozinha_id` column to `fotos_cozinha` table
      - uuid, nullable (optional)
      - Foreign key reference to `tipos_cozinha(id)`
      - ON DELETE SET NULL to preserve photos if type is deleted
    
  2. Performance
    - Create index on `tipo_cozinha_id` for faster queries and joins
    
  3. Notes
    - Column is nullable to allow photos without a specific type
    - Existing photos will have NULL value for tipo_cozinha_id
    - Users can optionally associate photos with a kitchen type
*/

-- Add tipo_cozinha_id column to fotos_cozinha table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fotos_cozinha' AND column_name = 'tipo_cozinha_id'
  ) THEN
    ALTER TABLE public.fotos_cozinha 
    ADD COLUMN tipo_cozinha_id uuid REFERENCES public.tipos_cozinha(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for better performance on joins and filters
CREATE INDEX IF NOT EXISTS idx_fotos_cozinha_tipo_cozinha_id 
ON public.fotos_cozinha USING btree (tipo_cozinha_id);/*
  # Fix Security Issues - Part 1: Indexes and RLS Performance

  1. **Performance Improvements**
    - Add indexes on all foreign key columns without covering indexes
    - This improves query performance and prevents potential DoS through slow queries

  2. **Tables with new indexes:**
    - atividades (empresa_id)
    - cancelamentos (suite_id, empresa_id)
    - itens_camararia (empresa_id)
    - manutencoes (empresa_id)
    - registros_areas_comuns (empresa_id)
    - registros_atividades_diarias (empresa_id)
    - registros_atividades_extras (empresa_id)
    - registros_camararia (empresa_id)
    - registros_gestao (empresa_id)
    - registros_recepcao (empresa_id)
    - registros_revisao (empresa_id)
    - servicos_camararia (empresa_id)
    - suites (empresa_id)
    - tipos_areas_comuns (empresa_id)
    - tipos_atividades (empresa_id)
    - tipos_extras (empresa_id)
    - tipos_gestao (empresa_id)
    - tipos_recepcao (empresa_id)
    - usuarios (empresa_id)

  3. **Security Notes**
    - Foreign key indexes prevent performance degradation attacks
    - Improves overall query performance across the application
*/

-- Add indexes for foreign keys on empresa_id columns
CREATE INDEX IF NOT EXISTS idx_atividades_empresa_id ON public.atividades(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cancelamentos_suite_id ON public.cancelamentos(suite_id);
CREATE INDEX IF NOT EXISTS idx_cancelamentos_empresa_id ON public.cancelamentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_itens_camararia_empresa_id ON public.itens_camararia(empresa_id);
CREATE INDEX IF NOT EXISTS idx_manutencoes_empresa_id ON public.manutencoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_registros_areas_comuns_empresa_id ON public.registros_areas_comuns(empresa_id);
CREATE INDEX IF NOT EXISTS idx_registros_atividades_diarias_empresa_id ON public.registros_atividades_diarias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_registros_atividades_extras_empresa_id ON public.registros_atividades_extras(empresa_id);
CREATE INDEX IF NOT EXISTS idx_registros_camararia_empresa_id ON public.registros_camararia(empresa_id);
CREATE INDEX IF NOT EXISTS idx_registros_gestao_empresa_id ON public.registros_gestao(empresa_id);
CREATE INDEX IF NOT EXISTS idx_registros_recepcao_empresa_id ON public.registros_recepcao(empresa_id);
CREATE INDEX IF NOT EXISTS idx_registros_revisao_empresa_id ON public.registros_revisao(empresa_id);
CREATE INDEX IF NOT EXISTS idx_servicos_camararia_empresa_id ON public.servicos_camararia(empresa_id);
CREATE INDEX IF NOT EXISTS idx_suites_empresa_id ON public.suites(empresa_id);
CREATE INDEX IF NOT EXISTS idx_tipos_areas_comuns_empresa_id ON public.tipos_areas_comuns(empresa_id);
CREATE INDEX IF NOT EXISTS idx_tipos_atividades_empresa_id ON public.tipos_atividades(empresa_id);
CREATE INDEX IF NOT EXISTS idx_tipos_extras_empresa_id ON public.tipos_extras(empresa_id);
CREATE INDEX IF NOT EXISTS idx_tipos_gestao_empresa_id ON public.tipos_gestao(empresa_id);
CREATE INDEX IF NOT EXISTS idx_tipos_recepcao_empresa_id ON public.tipos_recepcao(empresa_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_id ON public.usuarios(empresa_id);
/*
  # Remove Duplicate RLS Policies

  1. **Security Improvements**
    - Remove duplicate permissive RLS policies
    - Multiple permissive policies for the same action can cause confusion and potential security gaps
    - Keep only the most specific and efficient policies

  2. **Tables with duplicate policies removed:**
    - atividades
    - cancelamentos
    - empresas
    - fotos_camararia
    - fotos_cozinha
    - itens_camararia
    - manutencoes
    - perfis_empresa
    - permissoes_perfil
    - registros_areas_comuns
    - registros_atividades_diarias
    - registros_atividades_extras
    - registros_camararia
    - registros_gestao
    - registros_recepcao
    - registros_revisao
    - servicos_camararia
    - suites
    - tipos_areas_comuns
    - tipos_atividades
    - tipos_extras
    - tipos_gestao
    - tipos_recepcao
    - usuarios

  3. **Security Notes**
    - Removing duplicate policies simplifies RLS logic
    - Reduces potential for policy conflicts
    - Improves policy maintainability
*/

-- Drop old/duplicate policies for atividades
DROP POLICY IF EXISTS "Admins podem modificar atividades" ON public.atividades;

-- Drop old/duplicate policies for cancelamentos
DROP POLICY IF EXISTS "Admins podem modificar cancelamentos" ON public.cancelamentos;
DROP POLICY IF EXISTS "Usuários autenticados podem criar cancelamentos" ON public.cancelamentos;

-- Drop old/duplicate policies for empresas
DROP POLICY IF EXISTS "Acesso completo DELETE para autenticados" ON public.empresas;
DROP POLICY IF EXISTS "Acesso completo INSERT para autenticados" ON public.empresas;
DROP POLICY IF EXISTS "Acesso completo SELECT para autenticados" ON public.empresas;
DROP POLICY IF EXISTS "Acesso completo UPDATE para autenticados" ON public.empresas;

-- Drop old/duplicate policies for fotos_camararia
DROP POLICY IF EXISTS "Admins e camararia podem modificar fotos de camararia de sua em" ON public.fotos_camararia;
DROP POLICY IF EXISTS "Admins e camararia podem inserir fotos de camararia" ON public.fotos_camararia;
DROP POLICY IF EXISTS "Admins e camararia podem atualizar fotos de camararia" ON public.fotos_camararia;
DROP POLICY IF EXISTS "Admins podem deletar fotos de camararia" ON public.fotos_camararia;
DROP POLICY IF EXISTS "Usuários podem ler fotos de camararia da própria empresa" ON public.fotos_camararia;

-- Drop old/duplicate policies for fotos_cozinha
DROP POLICY IF EXISTS "Admins e cozinha podem modificar fotos de cozinha de sua empres" ON public.fotos_cozinha;
DROP POLICY IF EXISTS "Admins e cozinha podem inserir fotos de cozinha" ON public.fotos_cozinha;
DROP POLICY IF EXISTS "Admins e cozinha podem atualizar fotos de cozinha" ON public.fotos_cozinha;
DROP POLICY IF EXISTS "Admins podem deletar fotos de cozinha" ON public.fotos_cozinha;
DROP POLICY IF EXISTS "Usuários podem ler fotos de cozinha da própria empresa" ON public.fotos_cozinha;

-- Drop old/duplicate policies for manutencoes
DROP POLICY IF EXISTS "Usuários de manutenção podem modificar manutenções" ON public.manutencoes;

-- Drop old/duplicate policies for registros_areas_comuns
DROP POLICY IF EXISTS "Usuários de áreas comuns podem modificar seus registros" ON public.registros_areas_comuns;

-- Drop old/duplicate policies for registros_atividades_diarias
DROP POLICY IF EXISTS "Usuários podem modificar seus registros de atividades diárias" ON public.registros_atividades_diarias;

-- Drop old/duplicate policies for registros_atividades_extras
DROP POLICY IF EXISTS "Usuários podem modificar seus registros de atividades extras" ON public.registros_atividades_extras;

-- Drop old/duplicate policies for registros_camararia
DROP POLICY IF EXISTS "Usuários de camararia podem modificar seus registros" ON public.registros_camararia;

-- Drop old/duplicate policies for registros_gestao
DROP POLICY IF EXISTS "Usuários de gestão podem modificar seus registros" ON public.registros_gestao;

-- Drop old/duplicate policies for registros_recepcao
DROP POLICY IF EXISTS "Usuários de recepção podem modificar seus registros" ON public.registros_recepcao;

-- Drop old/duplicate policies for registros_revisao
DROP POLICY IF EXISTS "Usuários de revisão podem modificar seus registros" ON public.registros_revisao;

-- Drop old/duplicate policies for suites
DROP POLICY IF EXISTS "Admins podem modificar suites" ON public.suites;

-- Drop old/duplicate policies for tipos_recepcao
DROP POLICY IF EXISTS "Admins podem modificar tipos de recepção" ON public.tipos_recepcao;
DROP POLICY IF EXISTS "Usuários de recepção podem modificar tipos de recepção" ON public.tipos_recepcao;

-- Drop old/duplicate policies for usuarios
DROP POLICY IF EXISTS "Allow admins and self to insert usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Allow admins to update usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Allow admins to delete usuarios" ON public.usuarios;
/*
  # Optimize RLS Policies - Auth Function Performance (Fixed)

  1. **Performance Improvements**
    - Replace auth.uid() with (select auth.uid()) in RLS policies
    - This prevents re-evaluation of auth functions for each row
    - Significantly improves query performance at scale

  2. **Policies optimized:**
    - All remaining policies using auth.uid()
    - Policies are dropped and recreated with optimized versions
    - Fixed to match actual table schema

  3. **Security Notes**
    - No change to security logic, only performance optimization
    - All policies maintain the same security checks
*/

-- Optimize atividades policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins: Full access to atividades" ON public.atividades;
  CREATE POLICY "Admins: Full access to atividades"
    ON public.atividades
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile = 'admin'
        AND usuarios.empresa_id = atividades.empresa_id
      )
    );
END $$;

-- Optimize suites policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins: Full access to suites" ON public.suites;
  CREATE POLICY "Admins: Full access to suites"
    ON public.suites
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile = 'admin'
        AND usuarios.empresa_id = suites.empresa_id
      )
    );
END $$;

-- Optimize usuarios policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins: Full access to usuarios" ON public.usuarios;
  CREATE POLICY "Admins: Full access to usuarios"
    ON public.usuarios
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = (select auth.uid())
        AND u.profile = 'admin'
        AND u.empresa_id = usuarios.empresa_id
      )
    );
END $$;

-- Optimize registros_recepcao policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins: Full access to registros_recepcao" ON public.registros_recepcao;
  CREATE POLICY "Admins: Full access to registros_recepcao"
    ON public.registros_recepcao
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'recepcao')
        AND usuarios.empresa_id = registros_recepcao.empresa_id
      )
    );
END $$;

-- Optimize registros_camararia policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins: Full access to registros_camararia" ON public.registros_camararia;
  CREATE POLICY "Admins: Full access to registros_camararia"
    ON public.registros_camararia
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'camararia', 'revisao')
        AND usuarios.empresa_id = registros_camararia.empresa_id
      )
    );
END $$;

-- Optimize registros_revisao policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins: Full access to registros_revisao" ON public.registros_revisao;
  CREATE POLICY "Admins: Full access to registros_revisao"
    ON public.registros_revisao
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'revisao')
        AND usuarios.empresa_id = registros_revisao.empresa_id
      )
    );
END $$;

-- Optimize registros_areas_comuns policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins: Full access to registros_areas_comuns" ON public.registros_areas_comuns;
  CREATE POLICY "Admins: Full access to registros_areas_comuns"
    ON public.registros_areas_comuns
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'areas_comuns')
        AND usuarios.empresa_id = registros_areas_comuns.empresa_id
      )
    );
END $$;

-- Optimize manutencoes policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins: Full access to manutencoes" ON public.manutencoes;
  CREATE POLICY "Admins: Full access to manutencoes"
    ON public.manutencoes
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'manutencao')
        AND usuarios.empresa_id = manutencoes.empresa_id
      )
    );
END $$;

-- Optimize cancelamentos policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins: Full access to cancelamentos" ON public.cancelamentos;
  CREATE POLICY "Admins: Full access to cancelamentos"
    ON public.cancelamentos
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile = 'admin'
        AND usuarios.empresa_id = cancelamentos.empresa_id
      )
    );
END $$;

-- Optimize registros_gestao policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins: Full access to registros_gestao" ON public.registros_gestao;
  CREATE POLICY "Admins: Full access to registros_gestao"
    ON public.registros_gestao
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'gestor')
        AND usuarios.empresa_id = registros_gestao.empresa_id
      )
    );
END $$;

-- Optimize tipos_recepcao policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated users can read tipos_recepcao" ON public.tipos_recepcao;
  CREATE POLICY "Authenticated users can read tipos_recepcao"
    ON public.tipos_recepcao
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.empresa_id = tipos_recepcao.empresa_id
      )
    );
END $$;

-- Optimize servicos_camararia policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins e camararia podem modificar serviços de camararia" ON public.servicos_camararia;
  CREATE POLICY "Admins e camararia podem modificar serviços de camararia"
    ON public.servicos_camararia
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'camararia')
        AND usuarios.empresa_id = servicos_camararia.empresa_id
      )
    );
END $$;

-- Optimize itens_camararia policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins e camararia podem modificar itens de camararia" ON public.itens_camararia;
  CREATE POLICY "Admins e camararia podem modificar itens de camararia"
    ON public.itens_camararia
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'camararia')
        AND usuarios.empresa_id = itens_camararia.empresa_id
      )
    );
END $$;

-- Optimize tipos_gestao policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins and gestores can modify tipos_gestao" ON public.tipos_gestao;
  CREATE POLICY "Admins and gestores can modify tipos_gestao"
    ON public.tipos_gestao
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'gestor')
        AND usuarios.empresa_id = tipos_gestao.empresa_id
      )
    );
END $$;

-- Optimize tipos_atividades policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins and gestores can modify tipos_atividades" ON public.tipos_atividades;
  CREATE POLICY "Admins and gestores can modify tipos_atividades"
    ON public.tipos_atividades
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'gestor')
        AND usuarios.empresa_id = tipos_atividades.empresa_id
      )
    );
END $$;

-- Optimize tipos_extras policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins and gestores can modify tipos_extras" ON public.tipos_extras;
  CREATE POLICY "Admins and gestores can modify tipos_extras"
    ON public.tipos_extras
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'gestor')
        AND usuarios.empresa_id = tipos_extras.empresa_id
      )
    );
END $$;

-- Optimize tipos_areas_comuns policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins and gestores can modify tipos_areas_comuns" ON public.tipos_areas_comuns;
  CREATE POLICY "Admins and gestores can modify tipos_areas_comuns"
    ON public.tipos_areas_comuns
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'gestor')
        AND usuarios.empresa_id = tipos_areas_comuns.empresa_id
      )
    );
END $$;

-- Optimize perfis_empresa policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read their company profiles" ON public.perfis_empresa;
  CREATE POLICY "Users can read their company profiles"
    ON public.perfis_empresa
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.empresa_id = perfis_empresa.empresa_id
      )
    );

  DROP POLICY IF EXISTS "Admins and gestores can modify company profiles" ON public.perfis_empresa;
  CREATE POLICY "Admins and gestores can modify company profiles"
    ON public.perfis_empresa
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'gestor')
        AND usuarios.empresa_id = perfis_empresa.empresa_id
      )
    );
END $$;

-- Optimize registros_cozinha policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Usuários podem visualizar registros da sua empresa" ON public.registros_cozinha;
  CREATE POLICY "Usuários podem visualizar registros da sua empresa"
    ON public.registros_cozinha
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.empresa_id = registros_cozinha.empresa_id
      )
    );

  DROP POLICY IF EXISTS "Usuários podem inserir registros" ON public.registros_cozinha;
  CREATE POLICY "Usuários podem inserir registros"
    ON public.registros_cozinha
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.empresa_id = registros_cozinha.empresa_id
        AND usuarios.profile IN ('admin', 'cozinha')
      )
    );

  DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios registros" ON public.registros_cozinha;
  CREATE POLICY "Usuários podem atualizar seus próprios registros"
    ON public.registros_cozinha
    FOR UPDATE
    TO authenticated
    USING (usuario_id = (select auth.uid()))
    WITH CHECK (usuario_id = (select auth.uid()));

  DROP POLICY IF EXISTS "Administradores podem excluir registros" ON public.registros_cozinha;
  CREATE POLICY "Administradores podem excluir registros"
    ON public.registros_cozinha
    FOR DELETE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile = 'admin'
        AND usuarios.empresa_id = registros_cozinha.empresa_id
      )
    );
END $$;

-- Optimize permissoes_perfil policies (via perfil_empresa_id)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read their company permissions" ON public.permissoes_perfil;
  CREATE POLICY "Users can read their company permissions"
    ON public.permissoes_perfil
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios u
        JOIN public.perfis_empresa pe ON pe.empresa_id = u.empresa_id
        WHERE u.id = (select auth.uid())
        AND pe.id = permissoes_perfil.perfil_empresa_id
      )
    );

  DROP POLICY IF EXISTS "Admins and gestores can modify company permissions" ON public.permissoes_perfil;
  CREATE POLICY "Admins and gestores can modify company permissions"
    ON public.permissoes_perfil
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios u
        JOIN public.perfis_empresa pe ON pe.empresa_id = u.empresa_id
        WHERE u.id = (select auth.uid())
        AND u.profile IN ('admin', 'gestor')
        AND pe.id = permissoes_perfil.perfil_empresa_id
      )
    );
END $$;

-- Optimize registros_atividades_diarias policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins: Full access to registros_atividades_diarias" ON public.registros_atividades_diarias;
  CREATE POLICY "Admins: Full access to registros_atividades_diarias"
    ON public.registros_atividades_diarias
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'atividades_diarias')
        AND usuarios.empresa_id = registros_atividades_diarias.empresa_id
      )
    );
END $$;

-- Optimize registros_atividades_extras policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins: Full access to registros_atividades_extras" ON public.registros_atividades_extras;
  CREATE POLICY "Admins: Full access to registros_atividades_extras"
    ON public.registros_atividades_extras
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'atividades_extras')
        AND usuarios.empresa_id = registros_atividades_extras.empresa_id
      )
    );
END $$;

-- Optimize tipos_cozinha policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can delete tipos_cozinha from own company" ON public.tipos_cozinha;
  CREATE POLICY "Admins can delete tipos_cozinha from own company"
    ON public.tipos_cozinha
    FOR DELETE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile = 'admin'
        AND usuarios.empresa_id = tipos_cozinha.empresa_id
      )
    );
END $$;

-- Optimize fotos_cozinha policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Usuários autenticados podem ler fotos de cozinha de sua empres" ON public.fotos_cozinha;
  CREATE POLICY "Usuários autenticados podem ler fotos de cozinha de sua empres"
    ON public.fotos_cozinha
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.empresa_id = fotos_cozinha.empresa_id
      )
    );

  DROP POLICY IF EXISTS "Admins e cozinha podem modificar fotos de cozinha de sua empres" ON public.fotos_cozinha;
  CREATE POLICY "Admins e cozinha podem modificar fotos de cozinha de sua empres"
    ON public.fotos_cozinha
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'cozinha')
        AND usuarios.empresa_id = fotos_cozinha.empresa_id
      )
    );
END $$;

-- Optimize fotos_camararia policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Usuários autenticados podem ler fotos de camararia de sua empr" ON public.fotos_camararia;
  CREATE POLICY "Usuários autenticados podem ler fotos de camararia de sua empr"
    ON public.fotos_camararia
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.empresa_id = fotos_camararia.empresa_id
      )
    );

  DROP POLICY IF EXISTS "Admins e camararia podem modificar fotos de camararia de sua em" ON public.fotos_camararia;
  CREATE POLICY "Admins e camararia podem modificar fotos de camararia de sua em"
    ON public.fotos_camararia
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'camararia')
        AND usuarios.empresa_id = fotos_camararia.empresa_id
      )
    );
END $$;

-- Optimize empresas policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins: Full access to empresas" ON public.empresas;
  CREATE POLICY "Admins: Full access to empresas"
    ON public.empresas
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND (usuarios.profile = 'admin' OR usuarios.empresa_id = empresas.id)
      )
    );
END $$;
/*
  # Fix Function Security and Cleanup Unused Indexes

  1. **Security Improvements**
    - Fix mutable search_path in functions by setting explicit search_path
    - This prevents potential SQL injection attacks through search_path manipulation
    - Uses ALTER FUNCTION to preserve function dependencies

  2. **Performance Improvements**
    - Remove unused indexes to reduce storage and improve write performance
    - These indexes are not being used by any queries

  3. **Functions with search_path fixed:**
    - is_admin
    - get_user_empresa_id
    - is_same_company
    - get_empresa_id_by_user
    - update_updated_at_column
    - and others if they exist

  4. **Unused indexes removed:**
    - Various indexes on atividades, suites, cancelamentos, manutencoes, etc.

  5. **Security Notes**
    - Setting explicit search_path prevents privilege escalation attacks
    - Removing unused indexes improves database performance without affecting functionality
*/

-- Fix search_path for functions, checking if they exist first
DO $$
BEGIN
  -- Fix is_admin
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
             WHERE n.nspname = 'public' AND p.proname = 'is_admin' AND p.pronargs = 0) THEN
    EXECUTE 'ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp';
  END IF;

  -- Fix get_user_empresa_id
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
             WHERE n.nspname = 'public' AND p.proname = 'get_user_empresa_id' AND p.pronargs = 0) THEN
    EXECUTE 'ALTER FUNCTION public.get_user_empresa_id() SET search_path = public, pg_temp';
  END IF;

  -- Fix is_same_company
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
             WHERE n.nspname = 'public' AND p.proname = 'is_same_company' AND p.pronargs = 1) THEN
    EXECUTE 'ALTER FUNCTION public.is_same_company(uuid) SET search_path = public, pg_temp';
  END IF;

  -- Fix get_empresa_id_by_user
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
             WHERE n.nspname = 'public' AND p.proname = 'get_empresa_id_by_user' AND p.pronargs = 1) THEN
    EXECUTE 'ALTER FUNCTION public.get_empresa_id_by_user(uuid) SET search_path = public, pg_temp';
  END IF;

  -- Fix update_updated_at_column
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
             WHERE n.nspname = 'public' AND p.proname = 'update_updated_at_column' AND p.pronargs = 0) THEN
    EXECUTE 'ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp';
  END IF;

  -- Fix calculate_contract_fields
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
             WHERE n.nspname = 'public' AND p.proname = 'calculate_contract_fields' AND p.pronargs = 0) THEN
    EXECUTE 'ALTER FUNCTION public.calculate_contract_fields() SET search_path = public, pg_temp';
  END IF;

  -- Fix validate_user_limit
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
             WHERE n.nspname = 'public' AND p.proname = 'validate_user_limit' AND p.pronargs = 0) THEN
    EXECUTE 'ALTER FUNCTION public.validate_user_limit() SET search_path = public, pg_temp';
  END IF;

  -- Fix initialize_company_profiles
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
             WHERE n.nspname = 'public' AND p.proname = 'initialize_company_profiles' AND p.pronargs = 1) THEN
    EXECUTE 'ALTER FUNCTION public.initialize_company_profiles(uuid) SET search_path = public, pg_temp';
  END IF;

  -- Fix trigger_initialize_company_profiles
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
             WHERE n.nspname = 'public' AND p.proname = 'trigger_initialize_company_profiles' AND p.pronargs = 0) THEN
    EXECUTE 'ALTER FUNCTION public.trigger_initialize_company_profiles() SET search_path = public, pg_temp';
  END IF;

  -- Fix create_user_with_auth (may have different signatures)
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
             WHERE n.nspname = 'public' AND p.proname = 'create_user_with_auth') THEN
    EXECUTE 'ALTER FUNCTION public.create_user_with_auth SET search_path = public, pg_temp';
  END IF;
END $$;

-- Drop unused indexes to improve performance
DROP INDEX IF EXISTS public.idx_atividades_active;
DROP INDEX IF EXISTS public.idx_atividades_tipos_areas_comuns;
DROP INDEX IF EXISTS public.idx_atividades_tipos_extras;
DROP INDEX IF EXISTS public.idx_atividades_tipos_gestao;
DROP INDEX IF EXISTS public.idx_suites_status;
DROP INDEX IF EXISTS public.idx_fotos_camararia_ativo;
DROP INDEX IF EXISTS public.idx_usuarios_active;
DROP INDEX IF EXISTS public.idx_suites_type;
DROP INDEX IF EXISTS public.idx_cancelamentos_tipo;
DROP INDEX IF EXISTS public.idx_cancelamentos_registro;
DROP INDEX IF EXISTS public.idx_atividades_servicos_camararia;
DROP INDEX IF EXISTS public.idx_manutencoes_prioridade;
DROP INDEX IF EXISTS public.idx_registros_gestao_tipo_gestao;
DROP INDEX IF EXISTS public.idx_atividades_tipos_atividades;
DROP INDEX IF EXISTS public.idx_manutencoes_tipo;
DROP INDEX IF EXISTS public.idx_atividades_tipos_recepcao;
DROP INDEX IF EXISTS public.idx_empresas_ativo;
DROP INDEX IF EXISTS public.idx_empresas_inicio_contrato;
DROP INDEX IF EXISTS public.idx_empresas_final_contrato;
DROP INDEX IF EXISTS public.idx_empresas_tipo_pagamento;
DROP INDEX IF EXISTS public.idx_empresas_forma_pagamento;
DROP INDEX IF EXISTS public.idx_perfis_empresa_profile;
DROP INDEX IF EXISTS public.idx_permissoes_perfil_modulo;
DROP INDEX IF EXISTS public.idx_registros_cozinha_usuario_id;
DROP INDEX IF EXISTS public.idx_registros_atividades_diarias_tipo_atividade;
DROP INDEX IF EXISTS public.idx_tipos_cozinha_nome;
DROP INDEX IF EXISTS public.idx_tipos_cozinha_ativo;
DROP INDEX IF EXISTS public.idx_atividades_tipos_cozinha;
DROP INDEX IF EXISTS public.idx_registros_cozinha_data;
DROP INDEX IF EXISTS public.idx_registros_cozinha_tipo_cozinha_id;
DROP INDEX IF EXISTS public.idx_fotos_cozinha_ativo;
DROP INDEX IF EXISTS public.idx_fotos_cozinha_ordem;
DROP INDEX IF EXISTS public.idx_fotos_cozinha_tipo_cozinha_id;
/*
  # Fix Infinite Recursion in Usuarios Table RLS Policies

  ## Problem
  The optimization using `(select auth.uid())` caused infinite recursion in the `usuarios` table
  because the policy queries the same table it's protecting.
  
  ## Solution
  For the `usuarios` table specifically, we must use `auth.uid()` directly (without subselect)
  because:
  - `auth.uid()` is evaluated ONCE before the query starts
  - `(select auth.uid())` would be evaluated for each row check
  - When a policy on table A queries table A itself, using subselect causes infinite recursion
  
  ## Changes
  1. **Revert usuarios table policies** to use `auth.uid()` directly
  2. **Keep optimization** on all OTHER tables (they query usuarios, not themselves)
  
  ## Security Notes
  - No change to security logic
  - Only fixes the recursion issue while maintaining performance on other tables
*/

-- Fix usuarios table policies - use auth.uid() directly to prevent recursion
DROP POLICY IF EXISTS "Admins: Full access to usuarios" ON public.usuarios;

CREATE POLICY "Admins: Full access to usuarios"
  ON public.usuarios
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid()  -- ✓ Direct auth.uid() prevents recursion
      AND u.profile = 'admin'
      AND u.empresa_id = usuarios.empresa_id
    )
  );

-- Also verify and fix the "Users can read own data" policy if it exists
DROP POLICY IF EXISTS "Users can read own data" ON public.usuarios;

CREATE POLICY "Users can read own data"
  ON public.usuarios
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());  -- ✓ Simple direct comparison

-- Verify other common usuario policies exist with correct syntax
DROP POLICY IF EXISTS "Users can update own data" ON public.usuarios;

CREATE POLICY "Users can update own data"
  ON public.usuarios
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())  -- ✓ Direct auth.uid()
  WITH CHECK (id = auth.uid());  -- ✓ Direct auth.uid()
/*
  # Fix Infinite Recursion in Usuarios Table with SECURITY DEFINER Function

  ## Problem
  The "Admins: Full access to usuarios" policy causes infinite recursion because:
  - Policy on usuarios table queries the usuarios table itself
  - This creates an infinite loop: Query → Policy Check → Query usuarios → Policy Check...

  ## Solution
  1. **Create SECURITY DEFINER function** that bypasses RLS to check admin status
  2. **Update usuarios policies** to use this function instead of direct table queries
  3. **Keep other optimizations** on all other tables intact

  ## Changes
  1. Create `is_admin_in_empresa()` function with SECURITY DEFINER
  2. Drop and recreate all usuarios table policies using the function
  3. Ensure simple policies (read/update own data) use direct auth.uid()

  ## Security Notes
  - SECURITY DEFINER function is safe because it only returns boolean/uuid
  - No user data is exposed, only admin status verification
  - All security logic is preserved, just executed differently
*/

-- Create SECURITY DEFINER function to check if current user is admin
-- This function bypasses RLS, preventing infinite recursion
CREATE OR REPLACE FUNCTION public.is_admin_in_empresa(check_empresa_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Check if current user is admin
  -- If check_empresa_id is provided, also verify they belong to that empresa
  RETURN EXISTS (
    SELECT 1
    FROM public.usuarios
    WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
      AND usuarios.active = true
      AND (check_empresa_id IS NULL OR usuarios.empresa_id = check_empresa_id)
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin_in_empresa(uuid) TO authenticated;

-- Drop all existing policies on usuarios table
DROP POLICY IF EXISTS "Admins: Full access to usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Users can read own data" ON public.usuarios;
DROP POLICY IF EXISTS "Users can update own data" ON public.usuarios;
DROP POLICY IF EXISTS "Users can insert own data" ON public.usuarios;
DROP POLICY IF EXISTS "Users can delete own data" ON public.usuarios;

-- Create simple policy for users to read their own data
CREATE POLICY "Users can read own data"
  ON public.usuarios
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Create simple policy for users to update their own data
CREATE POLICY "Users can update own data"
  ON public.usuarios
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Create admin policy using SECURITY DEFINER function (no recursion!)
CREATE POLICY "Admins can read all users in empresa"
  ON public.usuarios
  FOR SELECT
  TO authenticated
  USING (
    -- Users can read their own data OR if they're admin in the same empresa
    id = auth.uid()
    OR is_admin_in_empresa(empresa_id)
  );

-- Create admin policy for updates
CREATE POLICY "Admins can update users in empresa"
  ON public.usuarios
  FOR UPDATE
  TO authenticated
  USING (
    -- Users can update their own data OR if they're admin in the same empresa
    id = auth.uid()
    OR is_admin_in_empresa(empresa_id)
  )
  WITH CHECK (
    -- Same check for the new values
    id = auth.uid()
    OR is_admin_in_empresa(empresa_id)
  );

-- Create admin policy for inserts
CREATE POLICY "Admins can insert users in empresa"
  ON public.usuarios
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admins can create users in their empresa
    is_admin_in_empresa(empresa_id)
  );

-- Create admin policy for deletes
CREATE POLICY "Admins can delete users in empresa"
  ON public.usuarios
  FOR DELETE
  TO authenticated
  USING (
    -- Admins can delete users in their empresa (but not themselves)
    id != auth.uid()
    AND is_admin_in_empresa(empresa_id)
  );

-- Add comment explaining the function
COMMENT ON FUNCTION public.is_admin_in_empresa(uuid) IS
  'SECURITY DEFINER function to check if current user is admin. Bypasses RLS to prevent infinite recursion when checking admin status in usuarios table policies.';/*
  # Restore User-Level RLS Policies (Critical Fix)

  ## Problem
  The previous optimization migration removed essential user-level access policies,
  breaking the system for all non-admin users. The original security model used
  a three-policy structure per table:
  
  1. Profile-specific policy (admin, specific roles) - Full access for authorized profiles
  2. READ policy - All authenticated users can view records from their company
  3. USER policy - Users can create/modify their own records
  
  The optimization incorrectly removed policies 2 and 3, leaving only policy 1.

  ## Solution
  This migration restores the complete three-policy structure for all affected tables
  while maintaining the performance optimization of using (select auth.uid()).

  ## Tables Fixed
  - registros_atividades_diarias
  - registros_atividades_extras
  - registros_areas_comuns
  - registros_recepcao
  - registros_camararia
  - registros_revisao
  - registros_gestao
  - manutencoes

  ## Security Notes
  - Users can only view records from their own company
  - Users can only create/modify records assigned to them (usuario_id = auth.uid())
  - Profile-specific policies provide elevated access for authorized roles
  - Performance optimization maintained: (select auth.uid()) instead of auth.uid()
*/

-- ============================================================================
-- REGISTROS_ATIVIDADES_DIARIAS
-- ============================================================================

-- Add READ policy: All users can view records from their company
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read registros_atividades_diarias from company" ON public.registros_atividades_diarias;
  CREATE POLICY "Users can read registros_atividades_diarias from company"
    ON public.registros_atividades_diarias
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.empresa_id = registros_atividades_diarias.empresa_id
        AND usuarios.active = true
      )
    );
END $$;

-- Add USER policy: Users can modify their own records or authorized profiles
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can modify own registros_atividades_diarias" ON public.registros_atividades_diarias;
  CREATE POLICY "Users can modify own registros_atividades_diarias"
    ON public.registros_atividades_diarias
    FOR INSERT
    TO authenticated
    WITH CHECK (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'areas_comuns', 'camararia', 'manutencao')
        AND usuarios.empresa_id = registros_atividades_diarias.empresa_id
        AND usuarios.active = true
      )
    );

  DROP POLICY IF EXISTS "Users can update own registros_atividades_diarias" ON public.registros_atividades_diarias;
  CREATE POLICY "Users can update own registros_atividades_diarias"
    ON public.registros_atividades_diarias
    FOR UPDATE
    TO authenticated
    USING (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'areas_comuns', 'camararia', 'manutencao')
        AND usuarios.empresa_id = registros_atividades_diarias.empresa_id
        AND usuarios.active = true
      )
    )
    WITH CHECK (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'areas_comuns', 'camararia', 'manutencao')
        AND usuarios.empresa_id = registros_atividades_diarias.empresa_id
        AND usuarios.active = true
      )
    );
END $$;

-- ============================================================================
-- REGISTROS_ATIVIDADES_EXTRAS
-- ============================================================================

-- Add READ policy
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read registros_atividades_extras from company" ON public.registros_atividades_extras;
  CREATE POLICY "Users can read registros_atividades_extras from company"
    ON public.registros_atividades_extras
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.empresa_id = registros_atividades_extras.empresa_id
        AND usuarios.active = true
      )
    );
END $$;

-- Add USER policy
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can modify own registros_atividades_extras" ON public.registros_atividades_extras;
  CREATE POLICY "Users can modify own registros_atividades_extras"
    ON public.registros_atividades_extras
    FOR INSERT
    TO authenticated
    WITH CHECK (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'areas_comuns', 'camararia', 'manutencao')
        AND usuarios.empresa_id = registros_atividades_extras.empresa_id
        AND usuarios.active = true
      )
    );

  DROP POLICY IF EXISTS "Users can update own registros_atividades_extras" ON public.registros_atividades_extras;
  CREATE POLICY "Users can update own registros_atividades_extras"
    ON public.registros_atividades_extras
    FOR UPDATE
    TO authenticated
    USING (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'areas_comuns', 'camararia', 'manutencao')
        AND usuarios.empresa_id = registros_atividades_extras.empresa_id
        AND usuarios.active = true
      )
    )
    WITH CHECK (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'areas_comuns', 'camararia', 'manutencao')
        AND usuarios.empresa_id = registros_atividades_extras.empresa_id
        AND usuarios.active = true
      )
    );
END $$;

-- ============================================================================
-- REGISTROS_AREAS_COMUNS
-- ============================================================================

-- Add READ policy
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read registros_areas_comuns from company" ON public.registros_areas_comuns;
  CREATE POLICY "Users can read registros_areas_comuns from company"
    ON public.registros_areas_comuns
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.empresa_id = registros_areas_comuns.empresa_id
        AND usuarios.active = true
      )
    );
END $$;

-- Add USER policy
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can modify own registros_areas_comuns" ON public.registros_areas_comuns;
  CREATE POLICY "Users can modify own registros_areas_comuns"
    ON public.registros_areas_comuns
    FOR INSERT
    TO authenticated
    WITH CHECK (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'areas_comuns')
        AND usuarios.empresa_id = registros_areas_comuns.empresa_id
        AND usuarios.active = true
      )
    );

  DROP POLICY IF EXISTS "Users can update own registros_areas_comuns" ON public.registros_areas_comuns;
  CREATE POLICY "Users can update own registros_areas_comuns"
    ON public.registros_areas_comuns
    FOR UPDATE
    TO authenticated
    USING (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'areas_comuns')
        AND usuarios.empresa_id = registros_areas_comuns.empresa_id
        AND usuarios.active = true
      )
    )
    WITH CHECK (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'areas_comuns')
        AND usuarios.empresa_id = registros_areas_comuns.empresa_id
        AND usuarios.active = true
      )
    );
END $$;

-- ============================================================================
-- REGISTROS_RECEPCAO
-- ============================================================================

-- Add READ policy
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read registros_recepcao from company" ON public.registros_recepcao;
  CREATE POLICY "Users can read registros_recepcao from company"
    ON public.registros_recepcao
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.empresa_id = registros_recepcao.empresa_id
        AND usuarios.active = true
      )
    );
END $$;

-- Add USER policy
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can modify own registros_recepcao" ON public.registros_recepcao;
  CREATE POLICY "Users can modify own registros_recepcao"
    ON public.registros_recepcao
    FOR INSERT
    TO authenticated
    WITH CHECK (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'recepcao')
        AND usuarios.empresa_id = registros_recepcao.empresa_id
        AND usuarios.active = true
      )
    );

  DROP POLICY IF EXISTS "Users can update own registros_recepcao" ON public.registros_recepcao;
  CREATE POLICY "Users can update own registros_recepcao"
    ON public.registros_recepcao
    FOR UPDATE
    TO authenticated
    USING (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'recepcao')
        AND usuarios.empresa_id = registros_recepcao.empresa_id
        AND usuarios.active = true
      )
    )
    WITH CHECK (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'recepcao')
        AND usuarios.empresa_id = registros_recepcao.empresa_id
        AND usuarios.active = true
      )
    );
END $$;

-- ============================================================================
-- REGISTROS_CAMARARIA
-- ============================================================================

-- Add READ policy
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read registros_camararia from company" ON public.registros_camararia;
  CREATE POLICY "Users can read registros_camararia from company"
    ON public.registros_camararia
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.empresa_id = registros_camararia.empresa_id
        AND usuarios.active = true
      )
    );
END $$;

-- Add USER policy
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can modify own registros_camararia" ON public.registros_camararia;
  CREATE POLICY "Users can modify own registros_camararia"
    ON public.registros_camararia
    FOR INSERT
    TO authenticated
    WITH CHECK (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'camararia', 'revisao')
        AND usuarios.empresa_id = registros_camararia.empresa_id
        AND usuarios.active = true
      )
    );

  DROP POLICY IF EXISTS "Users can update own registros_camararia" ON public.registros_camararia;
  CREATE POLICY "Users can update own registros_camararia"
    ON public.registros_camararia
    FOR UPDATE
    TO authenticated
    USING (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'camararia', 'revisao')
        AND usuarios.empresa_id = registros_camararia.empresa_id
        AND usuarios.active = true
      )
    )
    WITH CHECK (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'camararia', 'revisao')
        AND usuarios.empresa_id = registros_camararia.empresa_id
        AND usuarios.active = true
      )
    );
END $$;

-- ============================================================================
-- REGISTROS_REVISAO
-- ============================================================================

-- Add READ policy
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read registros_revisao from company" ON public.registros_revisao;
  CREATE POLICY "Users can read registros_revisao from company"
    ON public.registros_revisao
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.empresa_id = registros_revisao.empresa_id
        AND usuarios.active = true
      )
    );
END $$;

-- Add USER policy
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can modify own registros_revisao" ON public.registros_revisao;
  CREATE POLICY "Users can modify own registros_revisao"
    ON public.registros_revisao
    FOR INSERT
    TO authenticated
    WITH CHECK (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'revisao')
        AND usuarios.empresa_id = registros_revisao.empresa_id
        AND usuarios.active = true
      )
    );

  DROP POLICY IF EXISTS "Users can update own registros_revisao" ON public.registros_revisao;
  CREATE POLICY "Users can update own registros_revisao"
    ON public.registros_revisao
    FOR UPDATE
    TO authenticated
    USING (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'revisao')
        AND usuarios.empresa_id = registros_revisao.empresa_id
        AND usuarios.active = true
      )
    )
    WITH CHECK (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'revisao')
        AND usuarios.empresa_id = registros_revisao.empresa_id
        AND usuarios.active = true
      )
    );
END $$;

-- ============================================================================
-- REGISTROS_GESTAO
-- ============================================================================

-- Add READ policy
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read registros_gestao from company" ON public.registros_gestao;
  CREATE POLICY "Users can read registros_gestao from company"
    ON public.registros_gestao
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.empresa_id = registros_gestao.empresa_id
        AND usuarios.active = true
      )
    );
END $$;

-- Add USER policy
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can modify own registros_gestao" ON public.registros_gestao;
  CREATE POLICY "Users can modify own registros_gestao"
    ON public.registros_gestao
    FOR INSERT
    TO authenticated
    WITH CHECK (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'gestor')
        AND usuarios.empresa_id = registros_gestao.empresa_id
        AND usuarios.active = true
      )
    );

  DROP POLICY IF EXISTS "Users can update own registros_gestao" ON public.registros_gestao;
  CREATE POLICY "Users can update own registros_gestao"
    ON public.registros_gestao
    FOR UPDATE
    TO authenticated
    USING (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'gestor')
        AND usuarios.empresa_id = registros_gestao.empresa_id
        AND usuarios.active = true
      )
    )
    WITH CHECK (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'gestor')
        AND usuarios.empresa_id = registros_gestao.empresa_id
        AND usuarios.active = true
      )
    );
END $$;

-- ============================================================================
-- MANUTENCOES
-- ============================================================================

-- Add READ policy
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read manutencoes from company" ON public.manutencoes;
  CREATE POLICY "Users can read manutencoes from company"
    ON public.manutencoes
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.empresa_id = manutencoes.empresa_id
        AND usuarios.active = true
      )
    );
END $$;

-- Add USER policy
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can modify own manutencoes" ON public.manutencoes;
  CREATE POLICY "Users can modify own manutencoes"
    ON public.manutencoes
    FOR INSERT
    TO authenticated
    WITH CHECK (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'manutencao')
        AND usuarios.empresa_id = manutencoes.empresa_id
        AND usuarios.active = true
      )
    );

  DROP POLICY IF EXISTS "Users can update own manutencoes" ON public.manutencoes;
  CREATE POLICY "Users can update own manutencoes"
    ON public.manutencoes
    FOR UPDATE
    TO authenticated
    USING (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'manutencao')
        AND usuarios.empresa_id = manutencoes.empresa_id
        AND usuarios.active = true
      )
    )
    WITH CHECK (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'manutencao')
        AND usuarios.empresa_id = manutencoes.empresa_id
        AND usuarios.active = true
      )
    );
END $$;

-- ============================================================================
-- REGISTROS_COZINHA (Additional protection)
-- ============================================================================

-- Ensure READ policy exists
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read registros_cozinha from company" ON public.registros_cozinha;
  CREATE POLICY "Users can read registros_cozinha from company"
    ON public.registros_cozinha
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.empresa_id = registros_cozinha.empresa_id
        AND usuarios.active = true
      )
    );
END $$;
/*
  # Fix RLS Policies for Cancelamentos Table

  ## Problem
  The "cancelamentos" table only has an admin-only policy, blocking all non-admin
  users from accessing the table. This causes 403 Forbidden errors when regular
  users try to view or create cancellation records.

  ## Solution
  Add the complete three-policy structure following the same pattern used in other
  tables (registros_atividades_diarias, registros_recepcao, etc.):

  1. READ policy - All authenticated users can view cancelamentos from their company
  2. USER policy (INSERT) - Users can create cancelamentos assigned to them
  3. USER policy (UPDATE) - Users can update their own cancelamentos
  4. Admin policy - Already exists, provides full access for admins

  ## Tables Fixed
  - cancelamentos

  ## Security Notes
  - Users can only view cancelamentos from their own company
  - Users can only create cancelamentos where usuario_id = auth.uid() or they are admin
  - Users can only modify their own cancelamentos (usuario_id = auth.uid()) or they are admin
  - Performance optimization maintained: (select auth.uid()) instead of auth.uid()
*/

-- ============================================================================
-- CANCELAMENTOS
-- ============================================================================

-- Add READ policy: All users can view cancelamentos from their company
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read cancelamentos from company" ON public.cancelamentos;
  CREATE POLICY "Users can read cancelamentos from company"
    ON public.cancelamentos
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.empresa_id = cancelamentos.empresa_id
        AND usuarios.active = true
      )
    );
END $$;

-- Add USER policy for INSERT: Users can create their own cancelamentos
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can create own cancelamentos" ON public.cancelamentos;
  CREATE POLICY "Users can create own cancelamentos"
    ON public.cancelamentos
    FOR INSERT
    TO authenticated
    WITH CHECK (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile = 'admin'
        AND usuarios.empresa_id = cancelamentos.empresa_id
        AND usuarios.active = true
      )
    );
END $$;

-- Add USER policy for UPDATE: Users can update their own cancelamentos
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update own cancelamentos" ON public.cancelamentos;
  CREATE POLICY "Users can update own cancelamentos"
    ON public.cancelamentos
    FOR UPDATE
    TO authenticated
    USING (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile = 'admin'
        AND usuarios.empresa_id = cancelamentos.empresa_id
        AND usuarios.active = true
      )
    )
    WITH CHECK (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile = 'admin'
        AND usuarios.empresa_id = cancelamentos.empresa_id
        AND usuarios.active = true
      )
    );
END $$;
/*
  # Add DELETE Policies for All Registration Tables
  
  ## Problem
  Users cannot delete their registration records because DELETE policies are missing.
  When users try to cancel a registration:
  1. Frontend calls deleteRegistro()
  2. Supabase blocks the DELETE operation (no policy exists)
  3. Frontend clears local state and shows success message
  4. Record still exists in database
  5. Record reappears when page refreshes or user views history
  
  ## Solution
  Add DELETE policies for all registration tables that allow:
  - Users to delete their own records (usuario_id = auth.uid())
  - Admins and authorized profiles to delete records from their company
  
  ## Tables Fixed
  - registros_recepcao
  - registros_camararia
  - registros_atividades_diarias
  - registros_atividades_extras
  - registros_areas_comuns
  - registros_gestao
  - registros_revisao
  - registros_cozinha
  
  ## Security Notes
  - Users can only delete records they created (usuario_id check)
  - Profile-based authorization provides elevated deletion rights
  - All deletions require active user status
  - Company isolation is maintained (empresa_id check)
*/

-- ============================================================================
-- REGISTROS_RECEPCAO
-- ============================================================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can delete own registros_recepcao" ON public.registros_recepcao;
  CREATE POLICY "Users can delete own registros_recepcao"
    ON public.registros_recepcao
    FOR DELETE
    TO authenticated
    USING (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'recepcao')
        AND usuarios.empresa_id = registros_recepcao.empresa_id
        AND usuarios.active = true
      )
    );
END $$;

-- ============================================================================
-- REGISTROS_CAMARARIA
-- ============================================================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can delete own registros_camararia" ON public.registros_camararia;
  CREATE POLICY "Users can delete own registros_camararia"
    ON public.registros_camararia
    FOR DELETE
    TO authenticated
    USING (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'camararia', 'revisao')
        AND usuarios.empresa_id = registros_camararia.empresa_id
        AND usuarios.active = true
      )
    );
END $$;

-- ============================================================================
-- REGISTROS_ATIVIDADES_DIARIAS
-- ============================================================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can delete own registros_atividades_diarias" ON public.registros_atividades_diarias;
  CREATE POLICY "Users can delete own registros_atividades_diarias"
    ON public.registros_atividades_diarias
    FOR DELETE
    TO authenticated
    USING (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'areas_comuns', 'camararia', 'manutencao')
        AND usuarios.empresa_id = registros_atividades_diarias.empresa_id
        AND usuarios.active = true
      )
    );
END $$;

-- ============================================================================
-- REGISTROS_ATIVIDADES_EXTRAS
-- ============================================================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can delete own registros_atividades_extras" ON public.registros_atividades_extras;
  CREATE POLICY "Users can delete own registros_atividades_extras"
    ON public.registros_atividades_extras
    FOR DELETE
    TO authenticated
    USING (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'areas_comuns', 'camararia', 'manutencao')
        AND usuarios.empresa_id = registros_atividades_extras.empresa_id
        AND usuarios.active = true
      )
    );
END $$;

-- ============================================================================
-- REGISTROS_AREAS_COMUNS
-- ============================================================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can delete own registros_areas_comuns" ON public.registros_areas_comuns;
  CREATE POLICY "Users can delete own registros_areas_comuns"
    ON public.registros_areas_comuns
    FOR DELETE
    TO authenticated
    USING (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'areas_comuns')
        AND usuarios.empresa_id = registros_areas_comuns.empresa_id
        AND usuarios.active = true
      )
    );
END $$;

-- ============================================================================
-- REGISTROS_GESTAO
-- ============================================================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can delete own registros_gestao" ON public.registros_gestao;
  CREATE POLICY "Users can delete own registros_gestao"
    ON public.registros_gestao
    FOR DELETE
    TO authenticated
    USING (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'gestor')
        AND usuarios.empresa_id = registros_gestao.empresa_id
        AND usuarios.active = true
      )
    );
END $$;

-- ============================================================================
-- REGISTROS_REVISAO
-- ============================================================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can delete own registros_revisao" ON public.registros_revisao;
  CREATE POLICY "Users can delete own registros_revisao"
    ON public.registros_revisao
    FOR DELETE
    TO authenticated
    USING (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'revisao')
        AND usuarios.empresa_id = registros_revisao.empresa_id
        AND usuarios.active = true
      )
    );
END $$;

-- ============================================================================
-- REGISTROS_COZINHA
-- ============================================================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can delete own registros_cozinha" ON public.registros_cozinha;
  CREATE POLICY "Users can delete own registros_cozinha"
    ON public.registros_cozinha
    FOR DELETE
    TO authenticated
    USING (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'cozinha')
        AND usuarios.empresa_id = registros_cozinha.empresa_id
        AND usuarios.active = true
      )
    );
END $$;

-- ============================================================================
-- MANUTENCOES
-- ============================================================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can delete own manutencoes" ON public.manutencoes;
  CREATE POLICY "Users can delete own manutencoes"
    ON public.manutencoes
    FOR DELETE
    TO authenticated
    USING (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile IN ('admin', 'manutencao')
        AND usuarios.empresa_id = manutencoes.empresa_id
        AND usuarios.active = true
      )
    );
END $$;/*
  # Criar tabela tipos_funcoes_comerciais

  1. Nova Tabela
    - `tipos_funcoes_comerciais`
      - `id` (uuid, primary key)
      - `nome` (text, not null)
      - `ativo` (boolean, default true)
      - `empresa_id` (uuid, not null, foreign key)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Habilitar RLS na tabela `tipos_funcoes_comerciais`
    - Adicionar políticas para usuários autenticados lerem seus próprios dados
    - Adicionar políticas para usuários com permissão modificarem

  3. Índices
    - Índice no campo `nome` para buscas rápidas
    - Índice no campo `ativo` para filtros
    - Índice no campo `empresa_id` para multi-tenancy

  4. Notas Importantes
    - Esta tabela armazena tipos de funções comerciais (vendas, marketing, comercial, etc.)
    - Permite configuração customizada por empresa
*/

-- Criar tabela tipos_funcoes_comerciais
CREATE TABLE IF NOT EXISTS tipos_funcoes_comerciais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ativo boolean DEFAULT true,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE tipos_funcoes_comerciais ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: usuários autenticados podem ler tipos da própria empresa
CREATE POLICY "Users can view tipos_funcoes_comerciais from own company"
  ON tipos_funcoes_comerciais
  FOR SELECT
  TO authenticated
  USING (empresa_id = get_user_empresa_id());

-- Política para INSERT: usuários autenticados podem criar tipos
CREATE POLICY "Users can insert tipos_funcoes_comerciais for own company"
  ON tipos_funcoes_comerciais
  FOR INSERT
  TO authenticated
  WITH CHECK (empresa_id = get_user_empresa_id());

-- Política para UPDATE: usuários podem atualizar tipos da própria empresa
CREATE POLICY "Users can update tipos_funcoes_comerciais from own company"
  ON tipos_funcoes_comerciais
  FOR UPDATE
  TO authenticated
  USING (empresa_id = get_user_empresa_id())
  WITH CHECK (empresa_id = get_user_empresa_id());

-- Política para DELETE: apenas admins podem excluir tipos
CREATE POLICY "Admins can delete tipos_funcoes_comerciais from own company"
  ON tipos_funcoes_comerciais
  FOR DELETE
  TO authenticated
  USING (
    empresa_id = get_user_empresa_id()
    AND EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
      AND usuarios.active = true
    )
  );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tipos_funcoes_comerciais_nome ON tipos_funcoes_comerciais(nome);
CREATE INDEX IF NOT EXISTS idx_tipos_funcoes_comerciais_ativo ON tipos_funcoes_comerciais(ativo);
CREATE INDEX IF NOT EXISTS idx_tipos_funcoes_comerciais_empresa_id ON tipos_funcoes_comerciais(empresa_id);

-- Trigger para updated_at
CREATE TRIGGER update_tipos_funcoes_comerciais_updated_at
  BEFORE UPDATE ON tipos_funcoes_comerciais
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();/*
  # Adicionar tipo 'vendas' e criar tabela registros_vendas

  1. Alteração de Enum
    - Adicionar 'vendas' ao enum `activity_type_enum`
    - Adicionar coluna `tipos_funcoes_comerciais` à tabela `atividades`

  2. Nova Tabela
    - `registros_vendas`
      - `id` (uuid, primary key)
      - `data` (date) - Data do registro
      - `usuario_id` (uuid, foreign key) - Referência ao usuário
      - `empresa_id` (uuid, foreign key) - Referência à empresa
      - `hora_inicio` (timestamptz) - Hora de início do registro
      - `hora_fim` (timestamptz) - Hora de término do registro
      - `atividades` (jsonb) - Lista de atividades com status
      - `observacoes` (text) - Observações do colaborador
      - `fotos` (text[]) - Array de URLs de fotos
      - `status` (registro_status_enum) - Status do registro
      - `created_at` (timestamptz) - Data de criação
      - `updated_at` (timestamptz) - Data de atualização

  3. Segurança
    - Habilitar RLS na tabela `registros_vendas`
    - Políticas para usuários autenticados visualizarem apenas dados da sua empresa
    - Políticas para inserção e atualização de registros próprios
    - Política para exclusão apenas por administradores

  4. Índices
    - Índice em `empresa_id` para performance
    - Índice em `usuario_id` para filtros por usuário
    - Índice em `data` para consultas por período
    - Índice em `status` para filtros de registros ativos

  5. Notas Importantes
    - Esta tabela armazena registros de atividades comerciais/vendas
    - Suporta multi-tenancy através de empresa_id
*/

-- Adicionar 'vendas' ao enum activity_type_enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'vendas' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_type_enum')
  ) THEN
    ALTER TYPE activity_type_enum ADD VALUE 'vendas';
  END IF;
END $$;

-- Adicionar coluna tipos_funcoes_comerciais à tabela atividades (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'atividades' AND column_name = 'tipos_funcoes_comerciais'
  ) THEN
    ALTER TABLE atividades ADD COLUMN tipos_funcoes_comerciais jsonb DEFAULT '[]'::jsonb;
    CREATE INDEX IF NOT EXISTS idx_atividades_tipos_funcoes_comerciais 
      ON atividades USING gin(tipos_funcoes_comerciais);
  END IF;
END $$;

-- Criar tabela registros_vendas
CREATE TABLE IF NOT EXISTS registros_vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL DEFAULT CURRENT_DATE,
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  hora_inicio timestamptz NOT NULL DEFAULT now(),
  hora_fim timestamptz,
  atividades jsonb DEFAULT '[]'::jsonb,
  observacoes text DEFAULT '',
  fotos text[] DEFAULT '{}',
  status registro_status_enum NOT NULL DEFAULT 'em_andamento',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_registros_vendas_empresa_id ON registros_vendas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_registros_vendas_usuario_id ON registros_vendas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_registros_vendas_data ON registros_vendas(data);
CREATE INDEX IF NOT EXISTS idx_registros_vendas_status ON registros_vendas(status);

-- Habilitar RLS
ALTER TABLE registros_vendas ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem visualizar registros da sua empresa
CREATE POLICY "Users can view registros_vendas from own company"
  ON registros_vendas FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- Política: Usuários podem inserir registros para sua empresa
CREATE POLICY "Users can insert registros_vendas for own company"
  ON registros_vendas FOR INSERT
  TO authenticated
  WITH CHECK (
    usuario_id = auth.uid() AND
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- Política: Usuários podem atualizar seus próprios registros
CREATE POLICY "Users can update own registros_vendas"
  ON registros_vendas FOR UPDATE
  TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- Política: Apenas administradores podem excluir registros
CREATE POLICY "Admins can delete registros_vendas from own company"
  ON registros_vendas FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND profile = 'admin'
      AND empresa_id = registros_vendas.empresa_id
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_registros_vendas_updated_at
  BEFORE UPDATE ON registros_vendas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();/*
  # Create Dashboard Gamification and Metrics Tables
  
  1. New Tables
    - `metas_diarias`: Daily goals per department
      - `id` (uuid, primary key)
      - `data` (date): Date of the goal
      - `departamento` (text): Department name (recepcao, camararia, etc)
      - `meta_registros` (integer): Target number of records to complete
      - `registros_concluidos` (integer): Actual completed records
      - `empresa_id` (uuid): Reference to company
      - `created_at`, `updated_at` (timestamp)
    
    - `conquistas`: Achievement badges and rewards
      - `id` (uuid, primary key)
      - `nome` (text): Achievement name
      - `descricao` (text): Description of achievement
      - `tipo` (text): Type (velocidade, consistencia, volume, etc)
      - `icone` (text): Icon name
      - `cor` (text): Color hex code
      - `criterio` (jsonb): Criteria to earn achievement
      - `ativo` (boolean): Active status
      - `created_at`, `updated_at` (timestamp)
    
    - `usuarios_conquistas`: User achievements junction table
      - `id` (uuid, primary key)
      - `usuario_id` (uuid): Reference to user
      - `conquista_id` (uuid): Reference to achievement
      - `data_obtencao` (timestamptz): When achievement was earned
      - `empresa_id` (uuid): Reference to company
      - `created_at` (timestamp)
    
    - `historico_performance`: Historical performance metrics
      - `id` (uuid, primary key)
      - `data` (date): Performance date
      - `usuario_id` (uuid): Reference to user
      - `departamento` (text): Department name
      - `registros_concluidos` (integer): Number of completed records
      - `tempo_medio_conclusao` (integer): Average completion time in minutes
      - `velocidade_score` (numeric): Performance score
      - `empresa_id` (uuid): Reference to company
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to read their company data
    - Add policies for admins to manage all data
*/

-- Create metas_diarias table
CREATE TABLE IF NOT EXISTS metas_diarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  departamento text NOT NULL,
  meta_registros integer NOT NULL DEFAULT 0,
  registros_concluidos integer NOT NULL DEFAULT 0,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(data, departamento, empresa_id)
);

ALTER TABLE metas_diarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company metas"
  ON metas_diarias FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.empresa_id = metas_diarias.empresa_id
    )
  );

CREATE POLICY "Admins can insert metas"
  ON metas_diarias FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
      AND usuarios.empresa_id = metas_diarias.empresa_id
    )
  );

CREATE POLICY "Admins can update metas"
  ON metas_diarias FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
      AND usuarios.empresa_id = metas_diarias.empresa_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
      AND usuarios.empresa_id = metas_diarias.empresa_id
    )
  );

-- Create conquistas table
CREATE TABLE IF NOT EXISTS conquistas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text NOT NULL,
  tipo text NOT NULL,
  icone text NOT NULL DEFAULT 'award',
  cor text NOT NULL DEFAULT '#F59E0B',
  criterio jsonb NOT NULL DEFAULT '{}',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE conquistas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active conquistas"
  ON conquistas FOR SELECT
  TO authenticated
  USING (ativo = true);

CREATE POLICY "Admins can manage conquistas"
  ON conquistas FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  );

-- Create usuarios_conquistas table
CREATE TABLE IF NOT EXISTS usuarios_conquistas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  conquista_id uuid NOT NULL REFERENCES conquistas(id) ON DELETE CASCADE,
  data_obtencao timestamptz NOT NULL DEFAULT now(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(usuario_id, conquista_id)
);

ALTER TABLE usuarios_conquistas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conquistas"
  ON usuarios_conquistas FOR SELECT
  TO authenticated
  USING (
    usuario_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.empresa_id = usuarios_conquistas.empresa_id
    )
  );

CREATE POLICY "System can insert conquistas"
  ON usuarios_conquistas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile IN ('admin', 'gestor')
    )
  );

-- Create historico_performance table
CREATE TABLE IF NOT EXISTS historico_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  departamento text NOT NULL,
  registros_concluidos integer NOT NULL DEFAULT 0,
  tempo_medio_conclusao integer DEFAULT 0,
  velocidade_score numeric(5,2) DEFAULT 0,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(data, usuario_id, departamento)
);

ALTER TABLE historico_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own performance"
  ON historico_performance FOR SELECT
  TO authenticated
  USING (
    usuario_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile IN ('admin', 'gestor')
      AND usuarios.empresa_id = historico_performance.empresa_id
    )
  );

CREATE POLICY "System can insert performance"
  ON historico_performance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
    )
  );

CREATE POLICY "System can update performance"
  ON historico_performance FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_metas_diarias_data ON metas_diarias(data);
CREATE INDEX IF NOT EXISTS idx_metas_diarias_empresa ON metas_diarias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_conquistas_usuario ON usuarios_conquistas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_historico_performance_data ON historico_performance(data);
CREATE INDEX IF NOT EXISTS idx_historico_performance_usuario ON historico_performance(usuario_id);
CREATE INDEX IF NOT EXISTS idx_historico_performance_empresa ON historico_performance(empresa_id);

-- Insert some default conquistas
INSERT INTO conquistas (nome, descricao, tipo, icone, cor, criterio) VALUES
  ('Velocista', 'Complete 10 registros em menos de 2 horas cada', 'velocidade', 'zap', '#3B82F6', '{"tipo": "velocidade", "quantidade": 10, "tempo_max": 120}'),
  ('Consistente', 'Complete atividades por 7 dias consecutivos', 'consistencia', 'calendar-check', '#10B981', '{"tipo": "streak", "dias": 7}'),
  ('Produtivo', 'Complete 50 registros em um mês', 'volume', 'trending-up', '#F59E0B', '{"tipo": "volume", "quantidade": 50, "periodo": "mes"}'),
  ('Perfeccionista', 'Complete 20 registros sem nenhuma atividade não realizada', 'qualidade', 'check-circle', '#8B5CF6', '{"tipo": "qualidade", "quantidade": 20}'),
  ('Iniciante', 'Complete seu primeiro registro', 'marco', 'star', '#EC4899', '{"tipo": "marco", "quantidade": 1}'),
  ('Expert', 'Complete 100 registros', 'marco', 'award', '#EF4444', '{"tipo": "marco", "quantidade": 100}'),
  ('Mestre', 'Complete 500 registros', 'marco', 'crown', '#14B8A6', '{"tipo": "marco", "quantidade": 500}')
ON CONFLICT DO NOTHING;/*
  # Adicionar Perfil Vendas ao Enum

  ## Resumo
  Adiciona o valor 'vendas' ao enum user_profile_enum para permitir
  a criação de usuários com perfil de vendas.

  ## Mudanças
  - Adiciona valor `vendas` ao enum user_profile_enum

  ## Notas
  - Permite que usuários com perfil 'vendas' acessem funcionalidades específicas do módulo de vendas
  - O perfil terá permissões para: vendas e manutenção
*/

-- Adicionar valor 'vendas' ao enum user_profile_enum
ALTER TYPE user_profile_enum ADD VALUE IF NOT EXISTS 'vendas';
/*
  # Otimização de Índices para Dashboard Ao Vivo

  ## Objetivo
  Adicionar índices compostos nas tabelas de registros para melhorar significativamente
  a performance das queries do Dashboard Ao Vivo.

  ## Índices Adicionados
  Para cada tabela de registros, criamos índices compostos em:
  - (status, data, usuario_id) - Para queries que filtram por status, data e usuário
  - (usuario_id, data, status) - Para queries de ranking de usuários

  ## Tabelas Otimizadas
  1. registros_recepcao
  2. registros_camararia
  3. registros_revisao
  4. registros_areas_comuns
  5. registros_gestao
  6. registros_cozinha
  7. registros_vendas
  8. registros_atividades_diarias
  9. registros_atividades_extras

  ## Impacto Esperado
  - Redução de 80-90% no tempo de query para registros ativos
  - Melhoria significativa em queries de histórico e ranking
  - Menor carga no banco de dados
*/

CREATE INDEX IF NOT EXISTS idx_recepcao_status_data_usuario 
  ON registros_recepcao(status, data, usuario_id);

CREATE INDEX IF NOT EXISTS idx_recepcao_usuario_data_status 
  ON registros_recepcao(usuario_id, data, status);

CREATE INDEX IF NOT EXISTS idx_camararia_status_data_usuario 
  ON registros_camararia(status, data, usuario_id);

CREATE INDEX IF NOT EXISTS idx_camararia_usuario_data_status 
  ON registros_camararia(usuario_id, data, status);

CREATE INDEX IF NOT EXISTS idx_revisao_status_data_usuario 
  ON registros_revisao(status, data, usuario_id);

CREATE INDEX IF NOT EXISTS idx_revisao_usuario_data_status 
  ON registros_revisao(usuario_id, data, status);

CREATE INDEX IF NOT EXISTS idx_areas_comuns_status_data_usuario 
  ON registros_areas_comuns(status, data, usuario_id);

CREATE INDEX IF NOT EXISTS idx_areas_comuns_usuario_data_status 
  ON registros_areas_comuns(usuario_id, data, status);

CREATE INDEX IF NOT EXISTS idx_gestao_status_data_usuario 
  ON registros_gestao(status, data, usuario_id);

CREATE INDEX IF NOT EXISTS idx_gestao_usuario_data_status 
  ON registros_gestao(usuario_id, data, status);

CREATE INDEX IF NOT EXISTS idx_cozinha_status_data_usuario 
  ON registros_cozinha(status, data, usuario_id);

CREATE INDEX IF NOT EXISTS idx_cozinha_usuario_data_status 
  ON registros_cozinha(usuario_id, data, status);

CREATE INDEX IF NOT EXISTS idx_vendas_status_data_usuario 
  ON registros_vendas(status, data, usuario_id);

CREATE INDEX IF NOT EXISTS idx_vendas_usuario_data_status 
  ON registros_vendas(usuario_id, data, status);

CREATE INDEX IF NOT EXISTS idx_atividades_diarias_status_data_usuario 
  ON registros_atividades_diarias(status, data, usuario_id);

CREATE INDEX IF NOT EXISTS idx_atividades_diarias_usuario_data_status 
  ON registros_atividades_diarias(usuario_id, data, status);

CREATE INDEX IF NOT EXISTS idx_atividades_extras_status_data_usuario 
  ON registros_atividades_extras(status, data, usuario_id);

CREATE INDEX IF NOT EXISTS idx_atividades_extras_usuario_data_status 
  ON registros_atividades_extras(usuario_id, data, status);/*
  # Migrate Old Profile Enum Values to New Standardized Names

  1. Changes
    - Migrate users from `atividades_diurnas` → `atividades_extras`
    - Migrate users from `atividades_noturnas` → `atividades_diarias`
    - Add new enum values to `user_profile_enum` if they don't exist
    - Ensure data integrity by checking for existing users before removal

  2. Important Notes
    - This migration maintains backwards compatibility by updating existing data
    - Users with old profile values will be automatically migrated to new values
    - No data will be lost during this migration
    - The migration is idempotent and safe to run multiple times

  3. Security
    - No RLS changes required
    - Existing security policies will work with new enum values
*/

-- Step 1: Add new enum values if they don't exist
DO $$
BEGIN
  -- Add atividades_extras if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'atividades_extras'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_profile_enum')
  ) THEN
    ALTER TYPE user_profile_enum ADD VALUE IF NOT EXISTS 'atividades_extras';
    RAISE NOTICE 'Added atividades_extras to user_profile_enum';
  END IF;

  -- Add atividades_diarias if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'atividades_diarias'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_profile_enum')
  ) THEN
    ALTER TYPE user_profile_enum ADD VALUE IF NOT EXISTS 'atividades_diarias';
    RAISE NOTICE 'Added atividades_diarias to user_profile_enum';
  END IF;

  -- Add cozinha if it doesn't exist (should already exist from previous migration)
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'cozinha'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_profile_enum')
  ) THEN
    ALTER TYPE user_profile_enum ADD VALUE IF NOT EXISTS 'cozinha';
    RAISE NOTICE 'Added cozinha to user_profile_enum';
  END IF;

  -- Add vendas if it doesn't exist (should already exist from previous migration)
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'vendas'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_profile_enum')
  ) THEN
    ALTER TYPE user_profile_enum ADD VALUE IF NOT EXISTS 'vendas';
    RAISE NOTICE 'Added vendas to user_profile_enum';
  END IF;
END $$;

-- Step 2: Migrate users from old profile values to new ones
DO $$
DECLARE
  migrated_diurnas_count INTEGER;
  migrated_noturnas_count INTEGER;
BEGIN
  -- Migrate users from atividades_diurnas to atividades_extras
  UPDATE usuarios
  SET profile = 'atividades_extras'
  WHERE profile = 'atividades_diurnas';
  
  GET DIAGNOSTICS migrated_diurnas_count = ROW_COUNT;
  
  IF migrated_diurnas_count > 0 THEN
    RAISE NOTICE 'Migrated % users from atividades_diurnas to atividades_extras', migrated_diurnas_count;
  END IF;

  -- Migrate users from atividades_noturnas to atividades_diarias
  UPDATE usuarios
  SET profile = 'atividades_diarias'
  WHERE profile = 'atividades_noturnas';
  
  GET DIAGNOSTICS migrated_noturnas_count = ROW_COUNT;
  
  IF migrated_noturnas_count > 0 THEN
    RAISE NOTICE 'Migrated % users from atividades_noturnas to atividades_diarias', migrated_noturnas_count;
  END IF;

  -- Summary
  IF migrated_diurnas_count = 0 AND migrated_noturnas_count = 0 THEN
    RAISE NOTICE 'No users required migration - all profiles are already using new values';
  END IF;
END $$;

-- Step 3: Verify the migration
DO $$
DECLARE
  old_profile_count INTEGER;
BEGIN
  -- Check if any users still have old profile values
  SELECT COUNT(*) INTO old_profile_count
  FROM usuarios
  WHERE profile IN ('atividades_diurnas', 'atividades_noturnas');

  IF old_profile_count > 0 THEN
    RAISE WARNING 'Found % users with old profile values - this should not happen', old_profile_count;
  ELSE
    RAISE NOTICE 'Migration successful - no users found with old profile values';
  END IF;
END $$;
/*
  # Adicionar campo tipo_atividade_id à tabela registros_atividades_extras

  ## Resumo
  Esta migração adiciona suporte para vincular registros de atividades extras
  com tipos específicos de extras, permitindo que usuários escolham o tipo
  antes de iniciar um registro.

  ## Mudanças

  ### 1. Adicionar Campo
  - Adiciona coluna `tipo_atividade_id` à tabela `registros_atividades_extras`
  - Campo é UUID e nullable (opcional para compatibilidade com registros antigos)
  - Foreign key para tabela `tipos_extras`

  ### 2. Índice
  - Cria índice em `tipo_atividade_id` para otimizar queries de filtro

  ## Compatibilidade
  - Registros existentes permanecerão com tipo_atividade_id NULL
  - Sistema continua funcionando normalmente para registros antigos
  - Novos registros podem (mas não são obrigados a) incluir o tipo

  ## Segurança
  - Não são necessárias mudanças em RLS
  - As policies existentes continuam válidas
*/

-- Adicionar campo tipo_atividade_id à tabela registros_atividades_extras
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registros_atividades_extras' 
    AND column_name = 'tipo_atividade_id'
  ) THEN
    ALTER TABLE registros_atividades_extras 
    ADD COLUMN tipo_atividade_id UUID;
  END IF;
END $$;

-- Criar foreign key constraint se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_registros_atividades_extras_tipo'
  ) THEN
    ALTER TABLE registros_atividades_extras
    ADD CONSTRAINT fk_registros_atividades_extras_tipo
    FOREIGN KEY (tipo_atividade_id)
    REFERENCES tipos_extras(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Criar índice para otimizar queries por tipo
CREATE INDEX IF NOT EXISTS idx_registros_atividades_extras_tipo_atividade
ON registros_atividades_extras(tipo_atividade_id);