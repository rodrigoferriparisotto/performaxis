/*
  # Sistema de Lembretes por Inatividade

  ## Resumo
  Implementa sistema de notificações automáticas quando usuários ficam inativos por períodos prolongados.

  ## Alterações

  1. Tabelas Modificadas
    - `configuracoes_lembretes_usuario`
      - Nova coluna: `ativar_lembretes_inatividade` (boolean) - Controla se lembretes de inatividade estão ativos (default: true)

  2. Novas Tabelas
    - `lembretes_inatividade_enviados`
      - `id` (uuid, primary key) - Identificador único
      - `usuario_id` (uuid) - Referência ao usuário que recebeu o lembrete
      - `empresa_id` (uuid) - Referência à empresa do usuário
      - `minutos_inatividade` (integer) - Quantidade de minutos de inatividade quando lembrete foi enviado (30, 60, 90, 120...)
      - `enviado_em` (timestamptz) - Timestamp de quando o lembrete foi enviado
      - `created_at` (timestamptz) - Timestamp de criação do registro

  3. Índices
    - Índice composto em `lembretes_inatividade_enviados` para consultas otimizadas por usuario_id e enviado_em
    - Índice em empresa_id para filtragem por empresa

  4. Segurança (RLS)
    - Políticas RLS restritivas em `lembretes_inatividade_enviados`
    - Usuários só podem visualizar seus próprios lembretes
    - Usuários autenticados podem inserir lembretes para si mesmos
    - Admins e gestores podem visualizar lembretes de sua empresa

  ## Notas Importantes
  - Lembretes de inatividade são enviados em marcos de 30 minutos (30min, 60min, 90min, 120min, etc)
  - Sistema detecta automaticamente quando usuário está inativo através de event listeners no navegador
  - Urgência escalona conforme tempo de inatividade aumenta
  - Configuração padrão deixa lembretes de inatividade ATIVADOS
*/

-- Adicionar coluna de controle de lembretes de inatividade
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'configuracoes_lembretes_usuario'
    AND column_name = 'ativar_lembretes_inatividade'
  ) THEN
    ALTER TABLE configuracoes_lembretes_usuario
    ADD COLUMN ativar_lembretes_inatividade boolean DEFAULT true NOT NULL;
  END IF;
END $$;

-- Criar tabela de lembretes de inatividade enviados
CREATE TABLE IF NOT EXISTS lembretes_inatividade_enviados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  minutos_inatividade integer NOT NULL CHECK (minutos_inatividade > 0),
  enviado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_lembretes_inatividade_usuario_enviado
  ON lembretes_inatividade_enviados(usuario_id, enviado_em DESC);

CREATE INDEX IF NOT EXISTS idx_lembretes_inatividade_empresa
  ON lembretes_inatividade_enviados(empresa_id);

CREATE INDEX IF NOT EXISTS idx_lembretes_inatividade_created
  ON lembretes_inatividade_enviados(created_at);

-- Ativar RLS
ALTER TABLE lembretes_inatividade_enviados ENABLE ROW LEVEL SECURITY;

-- Política SELECT: Usuário vê apenas seus próprios lembretes
CREATE POLICY "Users can view own inactivity reminders"
  ON lembretes_inatividade_enviados
  FOR SELECT
  TO authenticated
  USING (auth.uid() = usuario_id);

-- Política SELECT: Admin e gestor veem lembretes da empresa
CREATE POLICY "Admins and managers can view company inactivity reminders"
  ON lembretes_inatividade_enviados
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.empresa_id = lembretes_inatividade_enviados.empresa_id
      AND usuarios.profile IN ('admin', 'gestor')
    )
  );

-- Política INSERT: Usuários autenticados podem inserir lembretes para si mesmos
CREATE POLICY "Users can insert own inactivity reminders"
  ON lembretes_inatividade_enviados
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

-- Política DELETE: Usuários podem deletar seus próprios lembretes antigos
CREATE POLICY "Users can delete own old inactivity reminders"
  ON lembretes_inatividade_enviados
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = usuario_id
    AND created_at < now() - interval '7 days'
  );

-- Adicionar comentários para documentação
COMMENT ON TABLE lembretes_inatividade_enviados IS 'Registra lembretes enviados por inatividade do usuário';
COMMENT ON COLUMN lembretes_inatividade_enviados.minutos_inatividade IS 'Minutos de inatividade quando lembrete foi enviado (30, 60, 90, 120, etc)';
COMMENT ON COLUMN configuracoes_lembretes_usuario.ativar_lembretes_inatividade IS 'Controla se usuário recebe lembretes quando fica inativo';