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
