// Conferência antes de encerrar um registro:
//  - durou menos de 5 min → pergunta quanto tempo a pessoa levou (registro
//    feito depois do trabalho); o valor vai para minutos_informados
//  - sobrou item sem fazer → pede uma observação final (uma só, não por item)
// Uso: const r = await revisarEncerramento({...}); if (!r) return; // cancelou

export const LIMITE_REGISTRO_RAPIDO_MIN = 5;

export interface PedidoEncerramento {
  horaInicio: string | null | undefined;
  itensNaoFeitos: number;
  observacao?: string | null;
}

export interface RespostaEncerramento {
  minutosInformados: number | null;
  observacao: string;
}

export interface PerguntaEncerramento {
  id: number;
  rapido: boolean;
  minutosDecorridos: number;
  itensNaoFeitos: number;
  pedirObservacao: boolean;
  resolver: (r: RespostaEncerramento | null) => void;
  observacaoAtual: string;
}

let atual: PerguntaEncerramento | null = null;
let proximoId = 1;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((o) => o());

export const assinarEncerramento = (o: () => void) => {
  ouvintes.add(o);
  return () => ouvintes.delete(o);
};
export const lerEncerramento = () => atual;

/** Marcador interno que o app guarda nas observações (não é texto da pessoa). */
const semMarcadores = (texto: string) => texto.replace(/ORIGEM:PROGRAMADO/g, '').trim();

export function revisarEncerramento(pedido: PedidoEncerramento): Promise<RespostaEncerramento | null> {
  const observacaoAtual = pedido.observacao ?? '';
  const inicio = pedido.horaInicio ? new Date(pedido.horaInicio).getTime() : NaN;
  const minutosDecorridos = Number.isFinite(inicio) ? Math.max(0, Math.floor((Date.now() - inicio) / 60000)) : 0;
  const rapido = Number.isFinite(inicio) && minutosDecorridos < LIMITE_REGISTRO_RAPIDO_MIN;
  const pedirObservacao = pedido.itensNaoFeitos > 0 && semMarcadores(observacaoAtual).length === 0;

  if (!rapido && !pedirObservacao) {
    return Promise.resolve({ minutosInformados: null, observacao: observacaoAtual });
  }

  return new Promise((resolve) => {
    atual = {
      id: proximoId++,
      rapido,
      minutosDecorridos,
      itensNaoFeitos: pedido.itensNaoFeitos,
      pedirObservacao,
      observacaoAtual,
      resolver: (r) => {
        atual = null;
        avisar();
        resolve(r);
      },
    };
    avisar();
  });
}

/** Junta a observação nova às observações que já existiam no registro. */
export function juntarObservacao(existente: string, nova: string): string {
  const n = nova.trim();
  if (!n) return existente;
  return existente.trim() ? `${existente.trim()} | ${n}` : n;
}
