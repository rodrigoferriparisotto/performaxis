/*
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
$$;