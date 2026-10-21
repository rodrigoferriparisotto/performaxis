// Avisos (toasts) e confirmações do app — substituem alert() e confirm()
// nativos do navegador. Funcionam de qualquer lugar (telas, hooks e
// services), porque são um módulo com assinantes, não um hook React.
// Quem desenha na tela é <CamadaDeFeedback/> (montado uma vez no App).

export type TipoAviso = 'sucesso' | 'erro' | 'aviso' | 'info';

export interface Aviso {
  id: number;
  tipo: TipoAviso;
  texto: string;
}

export interface PedidoConfirmacao {
  id: number;
  texto: string;
  perigoso: boolean;
  textoConfirmar: string;
  resolver: (ok: boolean) => void;
}

type Ouvinte = () => void;

let proximoId = 1;
let avisos: Aviso[] = [];
let confirmacoes: PedidoConfirmacao[] = [];
const ouvintes = new Set<Ouvinte>();

function avisarOuvintes() {
  ouvintes.forEach((o) => o());
}

export function assinarFeedback(o: Ouvinte): () => void {
  ouvintes.add(o);
  return () => ouvintes.delete(o);
}

export function lerAvisos(): Aviso[] {
  return avisos;
}

export function lerConfirmacoes(): PedidoConfirmacao[] {
  return confirmacoes;
}

function inferirTipo(texto: string): TipoAviso {
  const t = texto.toLowerCase();
  if (/(^|\b)(erro|falha|falhou|não foi possível|nao foi possivel|inválid|invalid|negado|sem permissão)/.test(t)) return 'erro';
  if (/(sucesso|salv[oa]|criad[oa]|atualizad[oa]|excluíd[oa]|removid[oa]|enviad[oa]|concluíd[oa]|finalizad[oa]|cadastrad[oa]|publicad[oa]|copiad[oa])/.test(t)) return 'sucesso';
  if (/(atenção|selecione|preencha|informe|obrigatóri|necessári|máximo|mínimo|aguarde|já existe|não há|nenhum)/.test(t)) return 'aviso';
  return 'info';
}

export function removerAviso(id: number) {
  avisos = avisos.filter((a) => a.id !== id);
  avisarOuvintes();
}

/**
 * Mostra um aviso não bloqueante. Se o tipo não for informado, é deduzido
 * do texto ("Erro ao...", "...com sucesso" etc.).
 */
export function notificar(mensagem: unknown, tipo?: TipoAviso) {
  const texto = String(mensagem ?? '').trim();
  if (!texto) return;
  const aviso: Aviso = { id: proximoId++, tipo: tipo ?? inferirTipo(texto), texto };
  avisos = [...avisos.slice(-3), aviso];
  avisarOuvintes();
  const duracao = aviso.tipo === 'erro' ? 7000 : aviso.tipo === 'aviso' ? 5500 : 4000;
  setTimeout(() => removerAviso(aviso.id), duracao);
}

/**
 * Pergunta de confirmação em modal próprio. Devolve uma Promise<boolean>:
 *   if (!await confirmar('Excluir este item?')) return;
 */
export function confirmar(
  mensagem: unknown,
  opcoes: { perigoso?: boolean; textoConfirmar?: string } = {}
): Promise<boolean> {
  const texto = String(mensagem ?? '').trim();
  const perigoso =
    opcoes.perigoso ?? /(excluir|exclusão|remover|apagar|deletar|cancelar|desativar|limpar|inativar)/i.test(texto);
  return new Promise<boolean>((resolve) => {
    const pedido: PedidoConfirmacao = {
      id: proximoId++,
      texto,
      perigoso,
      textoConfirmar: opcoes.textoConfirmar ?? (perigoso ? 'Sim, confirmar' : 'Confirmar'),
      resolver: (ok: boolean) => {
        confirmacoes = confirmacoes.filter((c) => c.id !== pedido.id);
        avisarOuvintes();
        resolve(ok);
      },
    };
    confirmacoes = [...confirmacoes, pedido];
    avisarOuvintes();
  });
}
