/*
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
