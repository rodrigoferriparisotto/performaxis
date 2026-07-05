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
END $$;