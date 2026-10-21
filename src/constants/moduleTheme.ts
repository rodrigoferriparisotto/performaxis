// Tema único de cor por módulo. Fonte da verdade para qualquer tela que
// mostre módulos (abas, ícones, gráficos, badges, relatórios).
//
// As classes Tailwind ficam escritas POR EXTENSO de propósito: o Tailwind só
// gera classes que encontra literalmente no código, então montar
// `bg-${cor}-100` em tempo de execução faz a cor sumir da tela.

export type ModuloChave =
  | 'recepcao'
  | 'camararia'
  | 'revisao'
  | 'areas_comuns'
  | 'cozinha'
  | 'gestao'
  | 'vendas'
  | 'atividades_extras'
  | 'atividades_diarias'
  | 'manutencao';

export interface TemaModulo {
  chave: ModuloChave;
  nome: string;
  /** cor para gráficos (recharts) e PDFs */
  hex: string;
  /** fundo claro + texto: ícone em "chip" */
  chip: string;
  /** badge/pílula com texto escuro */
  badge: string;
  /** aba ativa sublinhada */
  aba: string;
  /** botão primário do módulo */
  botao: string;
  /** spinner de carregamento */
  spinner: string;
  /** anel de foco de campos */
  foco: string;
  /** caixa suave de destaque */
  suave: string;
}

export const TEMAS_MODULO: Record<ModuloChave, TemaModulo> = {
  recepcao: {
    chave: 'recepcao', nome: 'Recepção', hex: '#2563EB',
    chip: 'bg-blue-100 text-blue-600', badge: 'bg-blue-100 text-blue-800',
    aba: 'border-blue-500 text-blue-600', botao: 'bg-blue-600 hover:bg-blue-700 text-white',
    spinner: 'border-blue-600', foco: 'focus:ring-blue-500', suave: 'bg-blue-50 border-blue-200',
  },
  camararia: {
    chave: 'camararia', nome: 'Governança', hex: '#16A34A',
    chip: 'bg-green-100 text-green-600', badge: 'bg-green-100 text-green-800',
    aba: 'border-green-500 text-green-600', botao: 'bg-green-600 hover:bg-green-700 text-white',
    spinner: 'border-green-600', foco: 'focus:ring-green-500', suave: 'bg-green-50 border-green-200',
  },
  revisao: {
    chave: 'revisao', nome: 'Revisão', hex: '#CA8A04',
    chip: 'bg-yellow-100 text-yellow-600', badge: 'bg-yellow-100 text-yellow-800',
    aba: 'border-yellow-500 text-yellow-600', botao: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    spinner: 'border-yellow-600', foco: 'focus:ring-yellow-500', suave: 'bg-yellow-50 border-yellow-200',
  },
  areas_comuns: {
    chave: 'areas_comuns', nome: 'Áreas Comuns', hex: '#4F46E5',
    chip: 'bg-indigo-100 text-indigo-600', badge: 'bg-indigo-100 text-indigo-800',
    aba: 'border-indigo-500 text-indigo-600', botao: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    spinner: 'border-indigo-600', foco: 'focus:ring-indigo-500', suave: 'bg-indigo-50 border-indigo-200',
  },
  cozinha: {
    chave: 'cozinha', nome: 'Cozinha', hex: '#0D9488',
    chip: 'bg-teal-100 text-teal-600', badge: 'bg-teal-100 text-teal-800',
    aba: 'border-teal-500 text-teal-600', botao: 'bg-teal-600 hover:bg-teal-700 text-white',
    spinner: 'border-teal-600', foco: 'focus:ring-teal-500', suave: 'bg-teal-50 border-teal-200',
  },
  gestao: {
    chave: 'gestao', nome: 'Gestão', hex: '#9333EA',
    chip: 'bg-purple-100 text-purple-600', badge: 'bg-purple-100 text-purple-800',
    aba: 'border-purple-500 text-purple-600', botao: 'bg-purple-600 hover:bg-purple-700 text-white',
    spinner: 'border-purple-600', foco: 'focus:ring-purple-500', suave: 'bg-purple-50 border-purple-200',
  },
  vendas: {
    chave: 'vendas', nome: 'Vendas', hex: '#DB2777',
    chip: 'bg-pink-100 text-pink-600', badge: 'bg-pink-100 text-pink-800',
    aba: 'border-pink-500 text-pink-600', botao: 'bg-pink-600 hover:bg-pink-700 text-white',
    spinner: 'border-pink-600', foco: 'focus:ring-pink-500', suave: 'bg-pink-50 border-pink-200',
  },
  atividades_extras: {
    chave: 'atividades_extras', nome: 'Atividades Extras', hex: '#0284C7',
    chip: 'bg-sky-100 text-sky-600', badge: 'bg-sky-100 text-sky-800',
    aba: 'border-sky-500 text-sky-600', botao: 'bg-sky-600 hover:bg-sky-700 text-white',
    spinner: 'border-sky-600', foco: 'focus:ring-sky-500', suave: 'bg-sky-50 border-sky-200',
  },
  atividades_diarias: {
    chave: 'atividades_diarias', nome: 'Atividades Diárias', hex: '#475569',
    chip: 'bg-slate-100 text-slate-600', badge: 'bg-slate-100 text-slate-800',
    aba: 'border-slate-500 text-slate-600', botao: 'bg-slate-600 hover:bg-slate-700 text-white',
    spinner: 'border-slate-600', foco: 'focus:ring-slate-500', suave: 'bg-slate-50 border-slate-200',
  },
  manutencao: {
    chave: 'manutencao', nome: 'Manutenção', hex: '#EA580C',
    chip: 'bg-orange-100 text-orange-600', badge: 'bg-orange-100 text-orange-800',
    aba: 'border-orange-500 text-orange-600', botao: 'bg-orange-600 hover:bg-orange-700 text-white',
    spinner: 'border-orange-600', foco: 'focus:ring-orange-500', suave: 'bg-orange-50 border-orange-200',
  },
};

/** Ordem padrão de exibição dos módulos em listas, gráficos e relatórios. */
export const ORDEM_MODULOS: ModuloChave[] = [
  'recepcao', 'camararia', 'revisao', 'areas_comuns', 'cozinha',
  'gestao', 'vendas', 'atividades_extras', 'atividades_diarias', 'manutencao',
];

const POR_NOME: Record<string, TemaModulo> = Object.fromEntries(
  Object.values(TEMAS_MODULO).map((t) => [t.nome, t])
);

/** Tema a partir do nome exibido (ex.: 'Governança'); útil em telas que só têm o rótulo. */
export function temaPorNome(nome: string): TemaModulo | undefined {
  return POR_NOME[nome];
}
