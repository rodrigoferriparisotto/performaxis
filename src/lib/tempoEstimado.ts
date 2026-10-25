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

// ---------------------------------------------------------------------------
// Os tempos ficam na tabela tempos_estimados, que só a gestão (gestor/admin) lê e grava (RLS).
// Para a equipe as consultas voltam vazias e os campos nem aparecem.
// ---------------------------------------------------------------------------
import { supabase } from './supabase';
import { obterContextoUsuario } from '../services/supabaseService';

export type OrigemTempo =
  | 'servico_camararia'
  | 'tipo_recepcao'
  | 'tipo_gestao'
  | 'tipo_atividade'
  | 'tipo_extra'
  | 'tipo_cozinha';

/** Junta os tempos estimados aos itens (campos tempo_estimado_min / tempo_estimado_revisao_min). */
export async function juntarTemposEstimados<T extends { id: string }>(origem: OrigemTempo, itens: T[]) {
  if (itens.length === 0) return itens;
  const { data, error } = await supabase
    .from('tempos_estimados')
    .select('referencia_id, minutos, minutos_revisao')
    .eq('origem', origem)
    .in('referencia_id', itens.map((i) => i.id));
  if (error || !data?.length) return itens;
  const mapa = new Map(data.map((d) => [d.referencia_id, d]));
  return itens.map((i) => {
    const t = mapa.get(i.id);
    return t ? { ...i, tempo_estimado_min: t.minutos, tempo_estimado_revisao_min: t.minutos_revisao } : i;
  });
}

/** Grava (ou apaga, se ambos vazios) o tempo estimado de um serviço/tipo. */
export async function salvarTempoEstimado(
  origem: OrigemTempo,
  referenciaId: string,
  minutos: number | null,
  minutosRevisao: number | null = null
) {
  if (minutos === null && minutosRevisao === null) {
    await supabase.from('tempos_estimados').delete().eq('origem', origem).eq('referencia_id', referenciaId);
    return;
  }
  const { userData } = await obterContextoUsuario();
  if (!userData?.empresa_id) return;
  await supabase.from('tempos_estimados').upsert(
    {
      origem,
      referencia_id: referenciaId,
      empresa_id: userData.empresa_id,
      minutos,
      minutos_revisao: minutosRevisao,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: 'origem,referencia_id' }
  );
}
