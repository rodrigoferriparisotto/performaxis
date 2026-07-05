/*
  # Fix validate_user_limit function to check per company
  
  1. Changes
    - Update validate_user_limit() to check user limit per specific company
    - Use NEW.empresa_id to get the correct company limit
    - Allow users without empresa_id (super admins/gestors)
    - Count only active users from the same company
  
  2. Security
    - Maintains user limit validation per company
    - Prevents exceeding contracted user limits
*/

-- Drop and recreate the function with correct logic
CREATE OR REPLACE FUNCTION validate_user_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    max_usuarios INTEGER;
    current_usuarios INTEGER;
BEGIN
    -- Se o usuário não tem empresa_id (gestores/admins sem vínculo), permitir
    IF NEW.empresa_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Buscar o limite máximo de usuários da empresa ESPECÍFICA
    SELECT numero_usuarios INTO max_usuarios
    FROM empresas
    WHERE id = NEW.empresa_id;
    
    -- Se não encontrou a empresa, não permitir
    IF max_usuarios IS NULL THEN
        RAISE EXCEPTION 'Empresa não encontrada para validação de limite de usuários';
    END IF;
    
    -- Contar usuários ativos existentes DA MESMA EMPRESA
    SELECT COUNT(*) INTO current_usuarios
    FROM usuarios
    WHERE active = true 
      AND empresa_id = NEW.empresa_id;
    
    -- Verificar se o limite seria excedido
    IF current_usuarios >= max_usuarios THEN
        RAISE EXCEPTION 'Limite de usuários atingido para esta empresa. Máximo permitido: % usuários. Usuários ativos atuais: %', 
            max_usuarios, current_usuarios;
    END IF;
    
    RETURN NEW;
END;
$$;