import { Fragment, ReactNode } from 'react';

// Formatação mínima para textos escritos pela gestão (ex.: fichas do Concierge):
//   **texto**        → negrito
//   * item / - item  → tópico (lista com marcador)
//   linha em branco  → espaço entre blocos
// Não interpreta HTML: tudo vira texto do React (sem risco de injeção).

const RE_TOPICO = /^\s*[*•-]\s+(.*)$/;

/** Negrito dentro da linha (**assim**). */
function negrito(linha: string): ReactNode[] {
  const partes = linha.split(/(\*\*[^*]+\*\*)/g);
  return partes.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') && p.length > 4 ? (
      <strong key={i} className="font-semibold text-gray-900">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{p}</Fragment>
    )
  );
}

type Bloco = { tipo: 'texto'; linhas: string[] } | { tipo: 'lista'; itens: string[] } | { tipo: 'espaco' };

function blocos(texto: string): Bloco[] {
  const saida: Bloco[] = [];
  for (const bruta of texto.replace(/\r/g, '').split('\n')) {
    const linha = bruta.replace(/\s+$/, '');
    const ultimo = saida[saida.length - 1];
    if (!linha.trim()) {
      if (ultimo && ultimo.tipo !== 'espaco') saida.push({ tipo: 'espaco' });
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
    <div className={`break-words ${className}`}>
      {blocos(texto).map((b, i) =>
        b.tipo === 'espaco' ? (
          <div key={i} className="h-2" />
        ) : b.tipo === 'lista' ? (
          <ul key={i} className="list-disc pl-5 space-y-0.5">
            {b.itens.map((item, j) => (
              <li key={j}>{negrito(item)}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>
            {b.linhas.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {negrito(l)}
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
