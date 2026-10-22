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
  'noturnas': 'atividades-diarias',
  'atividades_extras': 'atividades-extras',
  'atividades_diarias': 'atividades-diarias',
  'manutencao': 'manutencao'
};

export function mapModuloToUrl(modulo: string | null): string {
  if (!modulo) {
    return 'dashboard';
  }

  const normalizedModulo = modulo.toLowerCase() as ModuloType;

  return MODULE_URL_MAP[normalizedModulo] || 'dashboard';
}

// não existem rotas historico-<módulo>: o histórico é uma aba dentro do módulo
export function mapModuloToHistoricoUrl(modulo: string | null): string {
  return mapModuloToUrl(modulo);
}

export function isValidModulo(modulo: string): modulo is ModuloType {
  return modulo.toLowerCase() in MODULE_URL_MAP;
}
