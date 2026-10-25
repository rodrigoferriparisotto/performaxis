/**
 * Nome de exibição da suíte. Cada hotel cadastra de um jeito ("Suíte 1",
 * "101", "Chalé 3"): só acrescenta "Suíte" quando o nome não diz o tipo.
 */
export function nomeSuite(nome: string | null | undefined): string {
  const limpo = (nome ?? '').trim();
  if (!limpo) return 'Suíte';
  if (/^(su[ií]te|quarto|apto|apartamento|chal[eé]|bangal[oô]|cabana|casa|loft|studio|est[uú]dio|uh)\b/i.test(limpo)) {
    return limpo;
  }
  return `Suíte ${limpo}`;
}
