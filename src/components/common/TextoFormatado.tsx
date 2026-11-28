import { Fragment, ReactNode } from 'react';
import { ExternalLink, MapPin } from 'lucide-react';

// Formatação mínima para textos escritos pela gestão (ex.: fichas do Concierge):
//   **texto**        → negrito
//   * item / - item  → tópico (lista com marcador)
//   linha em branco  → espaço entre blocos
//   https://...      → link clicável; sozinho na linha vira botão
//   mapa do Google (My Maps) sozinho na linha → mapa na tela + botão "Abrir mapa"
// Não interpreta HTML: tudo vira texto do React (sem risco de injeção).

const RE_TOPICO = /^\s*[*•-]\s+(.*)$/;
const RE_URL = /(https?:\/\/[^\s<>"']+)/g;

/** Tira pontuação colada no fim do link ("veja https://x.com." → sem o ponto). */
const limparUrl = (url: string) => url.replace(/[.,;:!?)\]]+$/, '');

const urlValida = (url: string) => {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u : null;
  } catch {
    return null;
  }
};

const dominio = (u: URL) => u.hostname.replace(/^www\./, '');

/** Mapa do Google My Maps (google.com/maps/d/...?mid=...): endereços para embutir e para abrir. */
function mapaGoogle(u: URL): { embed: string; abrir: string } | null {
  if (!/(^|\.)google\.[a-z.]+$/.test(u.hostname) || !u.pathname.startsWith('/maps/d/')) return null;
  const mid = u.searchParams.get('mid');
  if (!mid || !/^[\w-]+$/.test(mid)) return null;
  return {
    embed: `https://www.google.com/maps/d/embed?mid=${mid}`,
    abrir: `https://www.google.com/maps/d/viewer?mid=${mid}`,
  };
}

const ehMapa = (u: URL) =>
  (/(^|\.)google\.[a-z.]+$/.test(u.hostname) && u.pathname.startsWith('/maps')) || /^(maps\.app\.goo\.gl|goo\.gl)$/.test(u.hostname);

function Link({ url, children }: { url: string; children: ReactNode }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline underline-offset-2 break-all">
      {children}
    </a>
  );
}

/** Links dentro de um trecho de texto. */
function comLinks(texto: string, chave: string): ReactNode[] {
  return texto.split(RE_URL).map((p, i) => {
    if (i % 2 === 0) return <Fragment key={`${chave}-${i}`}>{p}</Fragment>;
    const url = limparUrl(p);
    const resto = p.slice(url.length);
    const u = urlValida(url);
    if (!u) return <Fragment key={`${chave}-${i}`}>{p}</Fragment>;
    return (
      <Fragment key={`${chave}-${i}`}>
        <Link url={u.href}>{ehMapa(u) ? 'abrir no mapa' : dominio(u)}</Link>
        {resto}
      </Fragment>
    );
  });
}

/** Negrito (**assim**) e links dentro da linha. */
function inline(linha: string): ReactNode[] {
  return linha.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith('**') && p.endsWith('**') && p.length > 4 ? (
      <strong key={i} className="font-semibold text-gray-900">
        {comLinks(p.slice(2, -2), `b${i}`)}
      </strong>
    ) : (
      <Fragment key={i}>{comLinks(p, `t${i}`)}</Fragment>
    )
  );
}

/** Link sozinho na linha: mapa embutido (My Maps) ou botão. */
function BlocoLink({ u }: { u: URL }) {
  const mapa = mapaGoogle(u);
  const botao = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-800 hover:bg-slate-100 no-underline';
  if (mapa) {
    return (
      <div className="space-y-2">
        <iframe
          src={mapa.embed}
          title="Mapa"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full h-64 rounded-lg border border-slate-200 bg-slate-100"
        />
        <a href={mapa.abrir} target="_blank" rel="noopener noreferrer" className={botao}>
          <MapPin className="w-4 h-4" /> Abrir mapa em tela cheia
        </a>
      </div>
    );
  }
  return (
    <a href={u.href} target="_blank" rel="noopener noreferrer" className={botao}>
      {ehMapa(u) ? <MapPin className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
      {ehMapa(u) ? 'Abrir no mapa' : `Abrir ${dominio(u)}`}
    </a>
  );
}

type Bloco =
  | { tipo: 'texto'; linhas: string[] }
  | { tipo: 'lista'; itens: string[] }
  | { tipo: 'link'; url: URL }
  | { tipo: 'espaco' };

function blocos(texto: string): Bloco[] {
  const saida: Bloco[] = [];
  for (const bruta of texto.replace(/\r/g, '').split('\n')) {
    const linha = bruta.replace(/\s+$/, '');
    const ultimo = saida[saida.length - 1];
    if (!linha.trim()) {
      if (ultimo && ultimo.tipo !== 'espaco') saida.push({ tipo: 'espaco' });
      continue;
    }
    const sozinho = /^\s*https?:\/\/\S+\s*$/.test(linha) ? urlValida(limparUrl(linha.trim())) : null;
    if (sozinho) {
      saida.push({ tipo: 'link', url: sozinho });
      continue;
    }
    const topico = linha.match(RE_TOPICO);
    if (topico) {
      if (ultimo?.tipo === 'lista') ultimo.itens.push(topico[1]);
      else saida.push({ tipo: 'lista', itens: [topico[1]] });
    } else if (ultimo?.tipo === 'texto') {
      ultimo.linhas.push(linha);
    } else {
      saida.push({ tipo: 'texto', linhas: [linha] });
    }
  }
  while (saida[saida.length - 1]?.tipo === 'espaco') saida.pop();
  return saida;
}

export function TextoFormatado({ texto, className = '' }: { texto: string; className?: string }) {
  return (
    <div className={`break-words space-y-1.5 ${className}`}>
      {blocos(texto).map((b, i) =>
        b.tipo === 'espaco' ? (
          <div key={i} className="h-1" />
        ) : b.tipo === 'link' ? (
          <BlocoLink key={i} u={b.url} />
        ) : b.tipo === 'lista' ? (
          <ul key={i} className="list-disc pl-5 space-y-0.5">
            {b.itens.map((item, j) => (
              <li key={j}>{inline(item)}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>
            {b.linhas.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l)}
              </Fragment>
            ))}
          </p>
        )
      )}
    </div>
  );
}

/** Texto sem as marcações (para resumos de uma linha). */
export const semFormatacao = (texto: string) => texto.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/^\s*[*•-]\s+/gm, '');
