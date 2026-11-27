// Busca do Concierge: roda no aparelho, sem IA e sem custo por pergunta.
// Normaliza (sem acento/maiúscula), tira palavras vazias, expande sinônimos
// e pontua cada ficha pelo título, pelos "jeitos de perguntar", pela
// categoria e pelo conteúdo. "Onde fica a suíte 12" é respondido pelo
// cadastro de suítes.

export type CategoriaConcierge = 'hotel' | 'alimentacao' | 'suites' | 'como_usar' | 'servicos' | 'contatos' | 'regiao' | 'outros';

export const CATEGORIAS_CONCIERGE: { id: CategoriaConcierge; nome: string }[] = [
  { id: 'hotel', nome: 'O hotel' },
  { id: 'alimentacao', nome: 'Alimentação' },
  { id: 'suites', nome: 'Suítes' },
  { id: 'como_usar', nome: 'Como usar' },
  { id: 'servicos', nome: 'Serviços e lazer' },
  { id: 'contatos', nome: 'Contatos' },
  { id: 'regiao', nome: 'Região e passeios' },
  { id: 'outros', nome: 'Outros' },
];

export interface FichaConcierge {
  id: string;
  categoria: CategoriaConcierge;
  titulo: string;
  conteudo: string;
  perguntas: string[];
  fotos: string[];
  visivel_hospede: boolean;
  ativo: boolean;
  ordem: number;
}

export interface SuiteConcierge {
  id: string;
  name: string;
  type?: string | null;
  floor?: number | null;
  como_chegar?: string | null;
}

export const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const VAZIAS = new Set(
  ('a o as os um uma uns umas de da do das dos e em no na nos nas para pra pro por com sem que qual quais quando onde como ' +
  'eu voce vc meu minha tem ter tenho ha e eh esta estao fica ficam se ao aos posso pode podem favor sobre ate the is ' +
  'me te lhe nosso nossa isso esse essa este esta aqui ali la quero queria gostaria saber preciso ' +
    'fazer faz tem tinha algum alguma algo hoje agora')
    .split(' ')
);

// cada grupo: termos equivalentes (já normalizados; sem acento)
const SINONIMOS: string[][] = [
  ['wifi', 'wi fi', 'internet', 'rede', 'senha', 'conexao'],
  ['cafe', 'cafe da manha', 'breakfast', 'desjejum', 'manha'],
  ['checkout', 'check out', 'saida', 'sair', 'devolver chave'],
  ['checkin', 'check in', 'entrada', 'chegada', 'chegar'],
  ['tv', 'televisao', 'televisor', 'canal', 'canais', 'controle', 'netflix', 'streaming'],
  ['ar', 'ar condicionado', 'climatizador', 'aquecedor', 'temperatura', 'frio', 'calor'],
  ['estacionamento', 'garagem', 'carro', 'vaga', 'estacionar'],
  ['cardapio', 'menu', 'comida', 'restaurante', 'jantar', 'almoco', 'lanche', 'refeicao', 'room service'],
  ['telefone', 'ramal', 'contato', 'ligar', 'whatsapp', 'numero'],
  ['cofre', 'seguranca', 'guardar'],
  ['toalha', 'toalhas', 'roupa de cama', 'enxoval', 'travesseiro', 'cobertor'],
  ['lavanderia', 'lavar roupa', 'passar roupa'],
  ['piscina', 'banho', 'aquecida'],
  ['spa', 'massagem', 'sauna', 'ofuro'],
  ['passeio', 'passeios', 'turismo', 'vinicola', 'vinicolas', 'regiao', 'cidade', 'atracao'],
  ['farmacia', 'remedio', 'medico', 'hospital', 'emergencia'],
  ['pet', 'cachorro', 'gato', 'animal'],
  ['horario', 'horarios', 'hora', 'abre', 'fecha', 'funciona', 'funcionamento'],
];

// termo → todos os termos do seu grupo
const MAPA_SINONIMOS = new Map<string, string[]>();
for (const grupo of SINONIMOS) for (const t of grupo) MAPA_SINONIMOS.set(t, grupo);

const tokens = (texto: string) => normalizar(texto).split(' ').filter((t) => t && !VAZIAS.has(t));

/** Termos da pergunta já com sinônimos (inclui expressões de duas palavras como "cafe da manha"). */
function termosDaPergunta(pergunta: string): string[][] {
  const norm = normalizar(pergunta);
  const lista = tokens(pergunta);
  const termos: string[][] = [];
  const usados = new Set<string>();
  // expressões compostas presentes na frase
  for (const [termo, grupo] of MAPA_SINONIMOS) {
    if (termo.includes(' ') && norm.includes(termo) && !usados.has(grupo[0])) {
      termos.push(grupo);
      usados.add(grupo[0]);
    }
  }
  for (const t of lista) {
    const grupo = MAPA_SINONIMOS.get(t);
    if (grupo) {
      if (!usados.has(grupo[0])) {
        termos.push(grupo);
        usados.add(grupo[0]);
      }
    } else {
      termos.push([t]);
    }
  }
  return termos;
}

const contem = (texto: string, termo: string) => {
  if (termo.includes(' ')) return texto.includes(termo);
  // palavra inteira ou começo de palavra (ex.: "estacion" acha "estacionamento")
  return new RegExp(`(^|\\s)${termo}`).test(texto);
};

export interface ResultadoBusca {
  ficha: FichaConcierge;
  pontos: number;
}

/** As fichas que melhor respondem à pergunta (até `limite`), da mais para a menos relevante. */
export function buscarFichas(pergunta: string, fichas: FichaConcierge[], limite = 3): ResultadoBusca[] {
  const termos = termosDaPergunta(pergunta);
  if (termos.length === 0) return [];
  const nomeCategoria = (c: string) => CATEGORIAS_CONCIERGE.find((x) => x.id === c)?.nome || '';
  const frase = normalizar(pergunta);

  const resultados = fichas
    .filter((f) => f.ativo)
    .map((f) => {
      const titulo = normalizar(f.titulo);
      const perguntas = f.perguntas.map(normalizar).join(' | ');
      const categoria = normalizar(nomeCategoria(f.categoria));
      const conteudo = normalizar(f.conteudo);
      let pontos = 0;
      let acertos = 0;
      for (const grupo of termos) {
        let melhor = 0;
        for (const t of grupo) {
          if (t.length < 2) continue;
          if (contem(titulo, t)) melhor = Math.max(melhor, 4);
          else if (contem(perguntas, t)) melhor = Math.max(melhor, 4);
          else if (contem(categoria, t)) melhor = Math.max(melhor, 1.5);
          else if (contem(conteudo, t)) melhor = Math.max(melhor, 1);
        }
        if (melhor > 0) acertos++;
        pontos += melhor;
      }
      // pergunta igual a um dos "jeitos de perguntar"
      if (f.perguntas.some((p) => normalizar(p) === frase)) pontos += 10;
      // vale mais quando cobre a maior parte da pergunta
      pontos *= 0.5 + 0.5 * (acertos / termos.length);
      return { ficha: f, pontos };
    })
    .filter((r) => r.pontos >= 2)
    .sort((a, b) => b.pontos - a.pontos || a.ficha.ordem - b.ficha.ordem);

  // corta respostas bem mais fracas que a primeira
  const topo = resultados[0]?.pontos || 0;
  return resultados.filter((r) => r.pontos >= topo * 0.45).slice(0, limite);
}

/** "Onde fica a suíte 12?" → a suíte do cadastro (por número/nome), se a pergunta for sobre suíte/quarto. */
export function buscarSuite(pergunta: string, suites: SuiteConcierge[]): SuiteConcierge | null {
  const norm = normalizar(pergunta);
  if (!/\b(suite|quarto|apto|apartamento|uh)\b/.test(norm)) return null;
  const numero = norm.match(/\b(suite|quarto|apto|apartamento|uh)\s*(\w+)/)?.[2];
  if (!numero) return null;
  const alvo = numero.replace(/^0+(?=\d)/, '');
  return (
    suites.find((s) => normalizar(s.name).replace(/^(suite|quarto|apto|apartamento|uh)\s*/, '').replace(/^0+(?=\d)/, '') === alvo) || null
  );
}

/** Fichas modelo para o hotel começar (a gestão completa o conteúdo). */
export const FICHAS_MODELO: Omit<FichaConcierge, 'id' | 'ativo' | 'ordem'>[] = [
  { categoria: 'hotel', titulo: 'Wi-Fi', conteudo: 'Rede: \nSenha: ', perguntas: ['qual a senha do wifi', 'internet', 'rede'], fotos: [], visivel_hospede: true },
  { categoria: 'hotel', titulo: 'Check-in e check-out', conteudo: 'Check-in a partir das __h.\nCheck-out até as __h.', perguntas: ['que horas é o check-in', 'que horas é o check-out', 'horário de saída'], fotos: [], visivel_hospede: true },
  { categoria: 'alimentacao', titulo: 'Café da manhã', conteudo: 'Servido das __h às __h, no ____.', perguntas: ['que horas é o café', 'onde é o café da manhã'], fotos: [], visivel_hospede: true },
  { categoria: 'hotel', titulo: 'Estacionamento', conteudo: '', perguntas: ['onde estaciono', 'tem garagem'], fotos: [], visivel_hospede: true },
  { categoria: 'como_usar', titulo: 'Como usar a TV', conteudo: '1. \n2. \n3. ', perguntas: ['como ligar a tv', 'controle da tv', 'netflix'], fotos: [], visivel_hospede: true },
  { categoria: 'como_usar', titulo: 'Ar-condicionado', conteudo: '', perguntas: ['como ligar o ar', 'temperatura do quarto'], fotos: [], visivel_hospede: true },
  { categoria: 'como_usar', titulo: 'Cofre', conteudo: '', perguntas: ['como usar o cofre', 'senha do cofre'], fotos: [], visivel_hospede: true },
  { categoria: 'contatos', titulo: 'Telefones e ramais', conteudo: 'Recepção: \nEmergência: 192 / 193', perguntas: ['ramal da recepção', 'telefone'], fotos: [], visivel_hospede: true },
  { categoria: 'regiao', titulo: 'Passeios na região', conteudo: '', perguntas: ['o que fazer na cidade', 'vinícolas'], fotos: [], visivel_hospede: true },
];
