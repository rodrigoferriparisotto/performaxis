/*
  # Adicionar novos tipos de serviço ao enum

  1. Alterações no Enum
    - Adicionar 'check_in' ao enum tipo_servico_enum
    - Manter compatibilidade com tipos existentes
  
  2. Observações
    - Esta migração permite que cada serviço tenha seu próprio enum
    - Suporta nomes personalizados de serviços
*/

-- Adicionar novos valores ao enum tipo_servico_enum
ALTER TYPE tipo_servico_enum ADD VALUE IF NOT EXISTS 'check_in';

-- Comentário para documentar a mudança
COMMENT ON TYPE tipo_servico_enum IS 'Enum para tipos de serviço da camararia - suporta valores personalizados baseados nos nomes dos serviços cadastrados';