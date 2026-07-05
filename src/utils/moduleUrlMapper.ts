export type ModuloType =
  | 'recepcao'
  | 'gestao'
  | 'cozinha'
  | 'areas_comuns'
  | 'camararia'
  | 'revisao'
  | 'vendas'
  | 'noturnas'
  | 'atividades_extras'
  | 'atividades_diarias'
  | 'manutencao';

const MODULE_URL_MAP: Record<ModuloType, string> = {
  'recepcao': 'recepcao',
  'gestao': 'gestao',
  'cozinha': 'cozinha',
  'areas_comuns': 'areas-comuns',
  'camararia': 'camararia',
  'revisao': 'revisao',
  'vendas': 'vendas',
  'noturnas': 'noturnas',
  'atividades_extras': 'atividades-extras',
  'atividades_diarias': 'atividades-diarias',
  'manutencao': 'manutencao'
};

const MODULE_HISTORICO_MAP: Record<ModuloType, string> = {
  'recepcao': 'historico-recepcao',
  'gestao': 'historico-gestao',
  'cozinha': 'historico-cozinha',
  'areas_comuns': 'historico-areas-comuns',
  'camararia': 'historico-camararia',
  'revisao': 'historico-revisao',
  'vendas': 'historico-vendas',
  'noturnas': 'historico-noturnas',
  'atividades_extras': 'historico-atividades-extras',
  'atividades_diarias': 'historico-atividades-diarias',
  'manutencao': 'historico-manutencao'
};

export function mapModuloToUrl(modulo: string | null): string {
  if (!modulo) {
    return 'dashboard';
  }

  const normalizedModulo = modulo.toLowerCase() as ModuloType;

  return MODULE_URL_MAP[normalizedModulo] || 'dashboard';
}

export function mapModuloToHistoricoUrl(modulo: string | null): string {
  if (!modulo) {
    return 'dashboard';
  }

  const normalizedModulo = modulo.toLowerCase() as ModuloType;

  return MODULE_HISTORICO_MAP[normalizedModulo] || 'dashboard';
}

export function isValidModulo(modulo: string): modulo is ModuloType {
  return modulo.toLowerCase() in MODULE_URL_MAP;
}
