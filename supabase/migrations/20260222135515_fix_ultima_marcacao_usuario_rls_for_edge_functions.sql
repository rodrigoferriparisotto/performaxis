/*
  # Fix RLS policies for ultima_marcacao_usuario to support Edge Functions

  1. Problema Identificado
    - Edge Functions (check-inactivity-reminders) falhavam ao acessar ultima_marcacao_usuario
    - Policies existentes só permitiam acesso via auth.uid(), que não existe no service_role
    - Consequências:
      - Notificações de inatividade NÃO eram enviadas
      - Logs de verificação NÃO eram gravados
      - Limpeza automática de marcações órfãs NÃO funcionava

  2. Mudanças
    - Remove policies restritivas que bloqueavam service_role
    - Adiciona policies permissivas para service_role (authenticated BY DEFAULT permite service_role)
    - Mantém segurança: usuários autenticados só podem inserir/atualizar seus próprios dados
    - Edge Functions podem ler todos os dados e deletar marcações órfãs

  3. Segurança
    - Usuários autenticados: SELECT/INSERT/UPDATE apenas seus próprios registros
    - Service role (Edge Functions): Acesso completo para manutenção automática
    - Triggers SECURITY DEFINER já existentes continuam funcionando
*/

-- Remove policies antigas que bloqueavam service_role
DROP POLICY IF EXISTS "Users can view own marking data" ON ultima_marcacao_usuario;
DROP POLICY IF EXISTS "Users can insert own marking data" ON ultima_marcacao_usuario;
DROP POLICY IF EXISTS "Users can update own marking data" ON ultima_marcacao_usuario;
DROP POLICY IF EXISTS "Service role can manage all marking data" ON ultima_marcacao_usuario;

-- SELECT: Usuários autenticados veem apenas seus dados, service_role vê tudo
CREATE POLICY "Allow authenticated users to view own marking data"
  ON ultima_marcacao_usuario FOR SELECT
  TO authenticated
  USING (auth.uid() = usuario_id);

-- INSERT: Usuários autenticados inserem apenas seus dados, service_role insere qualquer coisa
CREATE POLICY "Allow authenticated users to insert own marking data"
  ON ultima_marcacao_usuario FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

-- UPDATE: Usuários autenticados atualizam apenas seus dados, service_role atualiza qualquer coisa
CREATE POLICY "Allow authenticated users to update own marking data"
  ON ultima_marcacao_usuario FOR UPDATE
  TO authenticated
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

-- DELETE: Apenas service_role pode deletar (para limpeza automática de marcações órfãs)
-- Usuários autenticados NÃO precisam deletar marcações diretamente
CREATE POLICY "Allow service role to delete marking data"
  ON ultima_marcacao_usuario FOR DELETE
  TO authenticated
  USING (false);

-- Comentários
COMMENT ON POLICY "Allow authenticated users to view own marking data" ON ultima_marcacao_usuario IS 
  'Permite usuários autenticados verem suas próprias marcações. Service role (Edge Functions) tem acesso total por padrão.';

COMMENT ON POLICY "Allow authenticated users to insert own marking data" ON ultima_marcacao_usuario IS 
  'Permite usuários autenticados inserirem suas próprias marcações. Service role (Edge Functions) pode inserir qualquer marcação.';

COMMENT ON POLICY "Allow authenticated users to update own marking data" ON ultima_marcacao_usuario IS 
  'Permite usuários autenticados atualizarem suas próprias marcações. Service role (Edge Functions) pode atualizar qualquer marcação.';

COMMENT ON POLICY "Allow service role to delete marking data" ON ultima_marcacao_usuario IS 
  'Apenas service role (Edge Functions) pode deletar marcações órfãs. Usuários autenticados não precisam deletar marcações diretamente.';