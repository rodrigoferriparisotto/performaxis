// Escala de trabalho do funcionário (mesma regra das funções turnos_da_escala /
// turnos_do_dia no banco, que disparam o aviso de início de turno).
import { DIAS_SEMANA } from './rotina';

export interface TurnoSemanal {
  dias: string[];
  inicio: string; // 'HH:MM'
}

export type Escala =
  | { tipo: 'semanal'; turnos: TurnoSemanal[] }
  | { tipo: 'ciclo'; trabalha: number; folga: number; referencia: string; inicio: string };

export const PRESETS_CICLO = [
  { rotulo: '12x36', trabalha: 1, folga: 1 },
  { rotulo: '24x48', trabalha: 1, folga: 2 },
  { rotulo: '2x2', trabalha: 2, folga: 2 },
  { rotulo: '6x1', trabalha: 6, folga: 1 },
];

const diaDaSemana = (d: Date) => DIAS_SEMANA[d.getUTCDay()];
const paraData = (iso: string) => new Date(`${iso}T12:00:00Z`);
const paraIso = (d: Date) => d.toISOString().slice(0, 10);

/** Horários de início previstos num dia ('aaaa-mm-dd'), sem considerar exceções. */
export function turnosDoDia(escala: Escala | null | undefined, diaIso: string): string[] {
  if (!escala) return [];
  const dia = paraData(diaIso);
  if (escala.tipo === 'ciclo') {
    if (!escala.inicio || !escala.referencia) return [];
    const trabalha = Math.max(1, escala.trabalha || 1);
    const ciclo = trabalha + Math.max(0, escala.folga ?? 1);
    const diff = Math.round((dia.getTime() - paraData(escala.referencia).getTime()) / 86_400_000);
    const pos = ((diff % ciclo) + ciclo) % ciclo;
    return pos < trabalha ? [escala.inicio] : [];
  }
  const nome = diaDaSemana(dia);
  return escala.turnos.filter((t) => t.inicio && t.dias.includes(nome)).map((t) => t.inicio).sort();
}

/** Próximos dias de trabalho a partir de hoje (para conferir a escala na tela). */
export function proximosDiasDeTrabalho(escala: Escala | null | undefined, hojeIso: string, quantidade = 6): { dia: string; turnos: string[] }[] {
  const lista: { dia: string; turnos: string[] }[] = [];
  const d = paraData(hojeIso);
  for (let i = 0; i < 60 && lista.length < quantidade; i++) {
    const iso = paraIso(new Date(d.getTime() + i * 86_400_000));
    const turnos = turnosDoDia(escala, iso);
    if (turnos.length) lista.push({ dia: iso, turnos });
  }
  return lista;
}

/** Escala válida para gravar (ou null se incompleta / sem escala). */
export function escalaParaSalvar(escala: Escala | null): Escala | null {
  if (!escala) return null;
  if (escala.tipo === 'ciclo') return escala.inicio && escala.referencia ? escala : null;
  const turnos = escala.turnos.filter((t) => t.inicio && t.dias.length > 0);
  return turnos.length ? { tipo: 'semanal', turnos } : null;
}
