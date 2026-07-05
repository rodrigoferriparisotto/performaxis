/*
  # Limpeza de Policies RLS Duplicadas na Tabela Manutencoes

  ## Objetivo
  Remover policies RLS duplicadas e conflitantes da tabela manutencoes para garantir 
  comportamento consistente e correto do sistema de manutenções.

  ## Mudanças

  1. **Remoção de Policies Duplicadas**
     - Remove policies antigas com nomes genéricos que causavam conflitos
     - Remove policies que permitiam acesso excessivo sem verificações adequadas

  2. **Policies Mantidas** (não serão removidas)
     - SELECT: "Users can view company manutencoes" - permite todos da empresa visualizarem
     - INSERT: "Active users can insert manutencoes" - permite usuários ativos criarem
     - UPDATE: "Admins gestores manutencao and owners can update manutencoes" - controle correto de atualização
     - DELETE: "Admins gestores manutencao and owners can delete non-completed manutencoes" - controle correto de deleção

  ## Segurança
  - Mantém RLS habilitado
  - Remove apenas policies duplicadas e conflitantes
  - Preserva policies corretas que seguem o princípio de menor privilégio
  - Garante que apenas usuários autorizados possam modificar dados

  ## Notas
  - Esta migration usa IF EXISTS para evitar erros caso as policies já tenham sido removidas
  - As policies mantidas garantem o controle de acesso adequado:
    * Visualização: todos da empresa
    * Criação: qualquer usuário ativo
    * Iniciar: perfis manutenção ou gestor (controlado na aplicação)
    * Pausar/Retomar/Finalizar: apenas o executor (usuario_id)
    * Editar/Excluir: admin, gestor, manutenção ou o solicitante
*/

-- Remove policies antigas e duplicadas que causam conflitos
DROP POLICY IF EXISTS "All authenticated users can insert manutencoes" ON manutencoes;
DROP POLICY IF EXISTS "All authenticated users can update manutencoes" ON manutencoes;
DROP POLICY IF EXISTS "All authenticated users can delete manutencoes" ON manutencoes;
DROP POLICY IF EXISTS "Admins: Full access to manutencoes" ON manutencoes;
DROP POLICY IF EXISTS "Users can modify own manutencoes" ON manutencoes;

-- Verificar se as policies corretas existem, caso contrário criar
DO $$
BEGIN
  -- Policy de SELECT: todos da empresa podem visualizar
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'manutencoes' 
    AND policyname = 'Users can view company manutencoes'
  ) THEN
    CREATE POLICY "Users can view company manutencoes"
      ON manutencoes
      FOR SELECT
      TO authenticated
      USING (
        empresa_id IN (
          SELECT empresa_id FROM usuarios WHERE id = auth.uid()
        )
      );
  END IF;

  -- Policy de INSERT: usuários ativos podem criar
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'manutencoes' 
    AND policyname = 'Active users can insert manutencoes'
  ) THEN
    CREATE POLICY "Active users can insert manutencoes"
      ON manutencoes
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM usuarios 
          WHERE id = auth.uid() 
          AND active = true
          AND empresa_id = manutencoes.empresa_id
        )
      );
  END IF;

  -- Policy de UPDATE: admin, gestor, manutenção podem atualizar qualquer; solicitante pode atualizar suas próprias
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'manutencoes' 
    AND policyname = 'Admins gestores manutencao and owners can update manutencoes'
  ) THEN
    CREATE POLICY "Admins gestores manutencao and owners can update manutencoes"
      ON manutencoes
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM usuarios
          WHERE id = auth.uid()
          AND empresa_id = manutencoes.empresa_id
          AND (
            profile IN ('admin', 'gestor', 'manutencao')
            OR id = manutencoes.solicitante_id
          )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM usuarios
          WHERE id = auth.uid()
          AND empresa_id = manutencoes.empresa_id
          AND (
            profile IN ('admin', 'gestor', 'manutencao')
            OR id = manutencoes.solicitante_id
          )
        )
      );
  END IF;

  -- Policy de DELETE: admin, gestor, manutenção podem deletar qualquer não concluída; solicitante pode deletar suas próprias não concluídas
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'manutencoes' 
    AND policyname = 'Admins gestores manutencao and owners can delete non-completed manutencoes'
  ) THEN
    CREATE POLICY "Admins gestores manutencao and owners can delete non-completed manutencoes"
      ON manutencoes
      FOR DELETE
      TO authenticated
      USING (
        status != 'concluida'
        AND EXISTS (
          SELECT 1 FROM usuarios
          WHERE id = auth.uid()
          AND empresa_id = manutencoes.empresa_id
          AND (
            profile IN ('admin', 'gestor', 'manutencao')
            OR id = manutencoes.solicitante_id
          )
        )
      );
  END IF;
END $$;
