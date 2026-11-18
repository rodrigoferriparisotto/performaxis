// Itens de checklist dos registros: 'pendente' | 'realizada' | 'nao_realizada'
// | 'nao_aplicavel'. "Não se aplica" = o item não teve demanda no dia (ex.:
// check-in sem hóspede); ele sai da conta, igual à nota diária no banco:
// qualidade = realizadas / (itens − não se aplica).

export const STATUS_NAO_APLICAVEL = 'nao_aplicavel';
export const ROTULO_NAO_APLICAVEL = 'Não se aplica';

export interface ProgressoChecklist {
  realizadas: number;
  naoAplicaveis: number;
  /** itens que contam: total − não se aplica */
  aplicaveis: number;
  /** aplicáveis ainda não feitos (pendentes ou não realizados) */
  pendentes: number;
  /** realizadas / aplicáveis, 0–100 (100 quando todos os itens são "não se aplica") */
  percentual: number;
}

export function progressoChecklist(atividades: { status?: string | null }[] | null | undefined): ProgressoChecklist {
  const lista = atividades || [];
  const realizadas = lista.filter((a) => a.status === 'realizada').length;
  const naoAplicaveis = lista.filter((a) => a.status === STATUS_NAO_APLICAVEL).length;
  const aplicaveis = lista.length - naoAplicaveis;
  const percentual = aplicaveis > 0
    ? Math.round((realizadas / aplicaveis) * 100)
    : lista.length > 0 ? 100 : 0;
  return { realizadas, naoAplicaveis, aplicaveis, pendentes: aplicaveis - realizadas, percentual };
}

/** Toque no item: pendente ↔ realizada; um item "não se aplica" volta para realizada. */
export function alternarRealizada(status: string): string {
  return status === 'pendente' || status === STATUS_NAO_APLICAVEL ? 'realizada' : 'pendente';
}

/** Botão "Não se aplica": liga (de pendente ou realizada) e desliga (volta para pendente). */
export function alternarNaoAplicavel(status: string): string {
  return status === STATUS_NAO_APLICAVEL ? 'pendente' : STATUS_NAO_APLICAVEL;
}
