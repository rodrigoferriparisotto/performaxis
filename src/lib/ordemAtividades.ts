// Mantém a ordem do cadastro igual à que a equipe vê: atividades com horário
// previsto na ordem do relógio; as sem horário depois, na ordem arrastada.
import { atividadeService } from '../services/supabaseService';
import { ordenarRotina } from '../utils/rotina';

type ComOrdem = { id: string; order_position: number; horario_previsto?: string | null };

export async function alinharOrdemComHorario<T extends ComOrdem>(lista: T[]): Promise<T[]> {
  const base = [...lista].sort((a, b) => (a.order_position ?? 0) - (b.order_position ?? 0));
  const ordenada = ordenarRotina(base).map((a, i) => ({ ...a, order_position: i + 1 }));
  // grava só quem mudou de posição
  const mudou = ordenada.filter((a) => base.find((b) => b.id === a.id)?.order_position !== a.order_position);
  if (mudou.length > 0) {
    await atividadeService.reorderAtividades(mudou.map((a) => ({ id: a.id, order_position: a.order_position })));
  }
  return ordenada;
}
