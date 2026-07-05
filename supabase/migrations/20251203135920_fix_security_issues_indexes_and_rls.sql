/*
  # Fix Security Issues - Part 1: Indexes and RLS Performance

  1. **Performance Improvements**
    - Add indexes on all foreign key columns without covering indexes
    - This improves query performance and prevents potential DoS through slow queries

  2. **Tables with new indexes:**
    - atividades (empresa_id)
    - cancelamentos (suite_id, empresa_id)
    - itens_camararia (empresa_id)
    - manutencoes (empresa_id)
    - registros_areas_comuns (empresa_id)
    - registros_atividades_diarias (empresa_id)
    - registros_atividades_extras (empresa_id)
    - registros_camararia (empresa_id)
    - registros_gestao (empresa_id)
    - registros_recepcao (empresa_id)
    - registros_revisao (empresa_id)
    - servicos_camararia (empresa_id)
    - suites (empresa_id)
    - tipos_areas_comuns (empresa_id)
    - tipos_atividades (empresa_id)
    - tipos_extras (empresa_id)
    - tipos_gestao (empresa_id)
    - tipos_recepcao (empresa_id)
    - usuarios (empresa_id)

  3. **Security Notes**
    - Foreign key indexes prevent performance degradation attacks
    - Improves overall query performance across the application
*/

-- Add indexes for foreign keys on empresa_id columns
CREATE INDEX IF NOT EXISTS idx_atividades_empresa_id ON public.atividades(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cancelamentos_suite_id ON public.cancelamentos(suite_id);
CREATE INDEX IF NOT EXISTS idx_cancelamentos_empresa_id ON public.cancelamentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_itens_camararia_empresa_id ON public.itens_camararia(empresa_id);
CREATE INDEX IF NOT EXISTS idx_manutencoes_empresa_id ON public.manutencoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_registros_areas_comuns_empresa_id ON public.registros_areas_comuns(empresa_id);
CREATE INDEX IF NOT EXISTS idx_registros_atividades_diarias_empresa_id ON public.registros_atividades_diarias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_registros_atividades_extras_empresa_id ON public.registros_atividades_extras(empresa_id);
CREATE INDEX IF NOT EXISTS idx_registros_camararia_empresa_id ON public.registros_camararia(empresa_id);
CREATE INDEX IF NOT EXISTS idx_registros_gestao_empresa_id ON public.registros_gestao(empresa_id);
CREATE INDEX IF NOT EXISTS idx_registros_recepcao_empresa_id ON public.registros_recepcao(empresa_id);
CREATE INDEX IF NOT EXISTS idx_registros_revisao_empresa_id ON public.registros_revisao(empresa_id);
CREATE INDEX IF NOT EXISTS idx_servicos_camararia_empresa_id ON public.servicos_camararia(empresa_id);
CREATE INDEX IF NOT EXISTS idx_suites_empresa_id ON public.suites(empresa_id);
CREATE INDEX IF NOT EXISTS idx_tipos_areas_comuns_empresa_id ON public.tipos_areas_comuns(empresa_id);
CREATE INDEX IF NOT EXISTS idx_tipos_atividades_empresa_id ON public.tipos_atividades(empresa_id);
CREATE INDEX IF NOT EXISTS idx_tipos_extras_empresa_id ON public.tipos_extras(empresa_id);
CREATE INDEX IF NOT EXISTS idx_tipos_gestao_empresa_id ON public.tipos_gestao(empresa_id);
CREATE INDEX IF NOT EXISTS idx_tipos_recepcao_empresa_id ON public.tipos_recepcao(empresa_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_id ON public.usuarios(empresa_id);
