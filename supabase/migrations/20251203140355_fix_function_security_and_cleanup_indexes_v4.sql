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
