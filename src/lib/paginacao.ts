// O Supabase (PostgREST) devolve no máximo 1.000 linhas por consulta e NÃO
// avisa quando corta. Com hotel grande (centenas de suítes, um mês de
// registros) listas e relatórios ficariam incompletos sem erro nenhum.
// Use estes helpers em toda consulta que pode passar de 1.000 linhas.

export const TAMANHO_PAGINA = 1000;
// ids por lote em .in(): a lista vai na URL e URL muito longa falha
export const TAMANHO_LOTE_IDS = 150;

type Resposta<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

/**
 * Busca todas as páginas. `montar(de, ate)` deve devolver a consulta já com
 * filtros, uma ordem ESTÁVEL (termine com .order('id')) e `.range(de, ate)`.
 * Ex.: todasPaginas((de, ate) => supabase.from('x').select('*').eq('empresa_id', e).order('id').range(de, ate))
 * Lança o erro do Supabase (quem chama decide como avisar).
 */
export async function todasPaginas<T>(montar: (de: number, ate: number) => Resposta<T>, tamanho = TAMANHO_PAGINA): Promise<T[]> {
  const tudo: T[] = [];
  for (let de = 0; ; de += tamanho) {
    const { data, error } = await montar(de, de + tamanho - 1);
    if (error) throw error;
    const linhas = data || [];
    tudo.push(...linhas);
    if (linhas.length < tamanho) break;
  }
  return tudo;
}

/**
 * Divide uma lista grande de ids em lotes para usar com .in().
 * Ex.: emLotes(ids, (lote) => supabase.from('usuarios').select('id, name').in('id', lote))
 */
export async function emLotes<T, I = string>(ids: I[], buscar: (lote: I[]) => Resposta<T>, tamanho = TAMANHO_LOTE_IDS): Promise<T[]> {
  const tudo: T[] = [];
  for (let i = 0; i < ids.length; i += tamanho) {
    const { data, error } = await buscar(ids.slice(i, i + tamanho));
    if (error) throw error;
    tudo.push(...(data || []));
  }
  return tudo;
}
