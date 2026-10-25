// Prazo de manutenção pela prioridade, contado da abertura do chamado
// (mesmos valores da função prazo_manutencao_horas no banco).
export const PRAZO_MANUTENCAO_HORAS: Record<string, number> = { alta: 24, normal: 72, baixa: 168 };

export interface SituacaoPrazo {
  vencimento: Date;
  atrasada: boolean;
  /** horas que faltam (positivo) ou de atraso (negativo) */
  horasRestantes: number;
}

export function situacaoPrazo(criadoEm: string | null | undefined, prioridade: string, agora = new Date()): SituacaoPrazo | null {
  if (!criadoEm) return null;
  const inicio = new Date(criadoEm).getTime();
  if (!Number.isFinite(inicio)) return null;
  const vencimento = new Date(inicio + (PRAZO_MANUTENCAO_HORAS[prioridade] ?? 168) * 3600_000);
  const horasRestantes = (vencimento.getTime() - agora.getTime()) / 3600_000;
  return { vencimento, atrasada: horasRestantes < 0, horasRestantes };
}

const dataCurta = (d: Date) =>
  d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

export function textoPrazo(s: SituacaoPrazo): string {
  const h = Math.abs(s.horasRestantes);
  const quanto = h >= 48 ? `${Math.floor(h / 24)} dias` : h >= 1 ? `${Math.floor(h)}h` : `${Math.max(1, Math.round(h * 60))} min`;
  return s.atrasada ? `Atrasada há ${quanto}` : `Prazo: ${dataCurta(s.vencimento)} (faltam ${quanto})`;
}

/** Ordena com as atrasadas primeiro (mais atrasada no topo), depois por vencimento. */
export function ordenarPorPrazo<T extends { created_at?: string | null; prioridade: string }>(lista: T[]): T[] {
  return [...lista].sort((a, b) => {
    const pa = situacaoPrazo(a.created_at, a.prioridade);
    const pb = situacaoPrazo(b.created_at, b.prioridade);
    return (pa?.horasRestantes ?? Infinity) - (pb?.horasRestantes ?? Infinity);
  });
}
