/** Porcentagem das suítes que não são check-in sorteadas para revisão. */
export const PERCENTUAL_AMOSTRA_REVISAO = 20;

export type PrioridadeRevisao = 'obrigatoria' | 'sorteada' | 'opcional';

/**
 * Check-in é sempre revisado; das demais, ~20% são sorteadas. O sorteio usa o
 * id do registro, então é estável (não muda ao recarregar a tela).
 */
export function prioridadeRevisao(registro: { id: string; tipo_servico?: string | null }): PrioridadeRevisao {
  if (registro.tipo_servico === 'check_in') return 'obrigatoria';
  const n = parseInt(registro.id.replace(/-/g, '').slice(0, 8), 16);
  return Number.isFinite(n) && n % 100 < PERCENTUAL_AMOSTRA_REVISAO ? 'sorteada' : 'opcional';
}

const ORDEM: Record<PrioridadeRevisao, number> = { obrigatoria: 0, sorteada: 1, opcional: 2 };

export function ordenarFilaRevisao<T extends { id: string; tipo_servico?: string | null }>(lista: T[]): T[] {
  return [...lista].sort((a, b) => ORDEM[prioridadeRevisao(a)] - ORDEM[prioridadeRevisao(b)]);
}
