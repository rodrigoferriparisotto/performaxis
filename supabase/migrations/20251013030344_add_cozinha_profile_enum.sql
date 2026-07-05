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
