/*
  # Adicionar Novos Valores ao Enum de Perfis

  ## Resumo
  Adiciona os novos valores de perfil ao enum user_profile_enum para permitir
  a padronização da nomenclatura.

  ## Mudanças
  - Adiciona valor `atividades_diarias` ao enum
  - Adiciona valor `atividades_extras` ao enum

  ## Notas
  - Esta é a primeira parte de uma migração em duas etapas
  - Os valores antigos serão mantidos até a próxima migration
  - PostgreSQL requer que novos valores enum sejam commitados antes do uso
*/

-- Adicionar novos valores ao enum user_profile_enum
ALTER TYPE user_profile_enum ADD VALUE IF NOT EXISTS 'atividades_diarias';
ALTER TYPE user_profile_enum ADD VALUE IF NOT EXISTS 'atividades_extras';