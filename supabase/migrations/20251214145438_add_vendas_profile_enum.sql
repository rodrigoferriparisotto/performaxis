/*
  # Adicionar Perfil Vendas ao Enum

  ## Resumo
  Adiciona o valor 'vendas' ao enum user_profile_enum para permitir
  a criação de usuários com perfil de vendas.

  ## Mudanças
  - Adiciona valor `vendas` ao enum user_profile_enum

  ## Notas
  - Permite que usuários com perfil 'vendas' acessem funcionalidades específicas do módulo de vendas
  - O perfil terá permissões para: vendas e manutenção
*/

-- Adicionar valor 'vendas' ao enum user_profile_enum
ALTER TYPE user_profile_enum ADD VALUE IF NOT EXISTS 'vendas';
