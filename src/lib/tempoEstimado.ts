// Tempo estimado (em minutos) definido pela gestão nos cadastros de tipos/serviços.
// Só a gestão vê; usado para comparar com o tempo real de execução.

export const TEMPO_ESTIMADO_MIN = 1;
export const TEMPO_ESTIMADO_MAX = 720;

/** Converte o valor do campo do formulário em minutos inteiros (1–720) ou null se vazio/inválido. */
export function lerTempoEstimado(valor: FormDataEntryValue | null | undefined): number | null {
  if (valor === null || valor === undefined) return null;
  const texto = String(valor).trim().replace(',', '.');
  if (texto === '') return null;
  const numero = Math.round(Number(texto));
  if (!Number.isFinite(numero) || numero <= 0) return null;
  return Math.min(TEMPO_ESTIMADO_MAX, Math.max(TEMPO_ESTIMADO_MIN, numero));
}
