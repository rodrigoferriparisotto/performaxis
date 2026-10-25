// Rotina das atividades: horário previsto, duração e dia da semana.

const FUSO = 'America/Sao_Paulo';
export const DIAS_SEMANA = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
] as const;

/** Minutos de folga antes de uma tarefa com horário contar como atrasada. */
export const TOLERANCIA_ATRASO_MIN = 10;

/** 'segunda-feira'... no fuso de Brasília (não no fuso do aparelho). */
export function diaSemanaHoje(agora: Date = new Date()): string {
  const nome = agora.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: FUSO });
  return DIAS_SEMANA.find((d) => d === nome.toLowerCase()) ?? nome.toLowerCase();
}

/** Sem dias marcados = todos os dias. */
export function atividadeValeHoje(atividade: { dias_semana?: string[] | null }, dia = diaSemanaHoje()): boolean {
  return !atividade.dias_semana || atividade.dias_semana.length === 0 || atividade.dias_semana.includes(dia);
}

/** 'HH:MM[:SS]' → minutos desde 00:00 (null se vazio/inválido). */
export function minutosDoDia(horario?: string | null): number | null {
  if (!horario) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(horario);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** '16:30:00' → '16h30'; '09:00:00' → '9h'. */
export function formatarHorarioPrevisto(horario?: string | null): string {
  const total = minutosDoDia(horario);
  if (total === null) return '';
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

export function formatarDuracao(min?: number | null): string {
  if (!min) return '';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`;
}

function minutosAgora(agora: Date = new Date()): number {
  const [h, m] = agora
    .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: FUSO })
    .split(':')
    .map(Number);
  return h * 60 + m;
}

export type SituacaoHorario = 'sem_horario' | 'futura' | 'agora' | 'atrasada' | 'feita';

/**
 * Situação de uma tarefa com horário previsto em relação ao relógio de Brasília.
 * 'agora' = da hora prevista até a tolerância; depois disso, 'atrasada'.
 */
export function situacaoHorario(horario: string | null | undefined, statusItem: string, agora = new Date()): SituacaoHorario {
  const previsto = minutosDoDia(horario);
  if (previsto === null) return 'sem_horario';
  if (statusItem === 'realizada' || statusItem === 'nao_realizada') return 'feita';
  const atual = minutosAgora(agora);
  if (atual < previsto) return 'futura';
  if (atual <= previsto + TOLERANCIA_ATRASO_MIN) return 'agora';
  return 'atrasada';
}

/**
 * Ordena como rotina: tarefas com horário na ordem do relógio; as sem horário
 * mantêm a ordem do cadastro e vão para o fim.
 */
export function ordenarRotina<T extends { horario_previsto?: string | null; order_position?: number | null }>(lista: T[]): T[] {
  return lista
    .map((item, indice) => ({ item, indice }))
    .sort((a, b) => {
      const ha = minutosDoDia(a.item.horario_previsto);
      const hb = minutosDoDia(b.item.horario_previsto);
      if (ha !== null && hb !== null && ha !== hb) return ha - hb;
      if (ha !== null && hb === null) return -1;
      if (ha === null && hb !== null) return 1;
      return a.indice - b.indice;
    })
    .map(({ item }) => item);
}

/**
 * Sugere horários para as tarefas sem horário fixo, encaixando-as em sequência
 * a partir de `inicioMin` (minutos do dia) usando a duração prevista
 * (padrão 10 min), sem invadir o horário das tarefas fixas.
 * Devolve um mapa id → 'HH:MM' só para as que receberam sugestão.
 */
export function sugerirHorarios<T extends { id: string; horario_previsto?: string | null; duracao_prevista_min?: number | null }>(
  lista: T[],
  inicioMin: number,
  duracaoPadrao = 10
): Record<string, string> {
  const fixas = lista
    .map((t) => ({ ini: minutosDoDia(t.horario_previsto), dur: t.duracao_prevista_min || duracaoPadrao }))
    .filter((t): t is { ini: number; dur: number } => t.ini !== null)
    .sort((a, b) => a.ini - b.ini);

  const sugestoes: Record<string, string> = {};
  let cursor = inicioMin;
  for (const t of lista) {
    if (minutosDoDia(t.horario_previsto) !== null) continue;
    const dur = t.duracao_prevista_min || duracaoPadrao;
    // pula por cima de tarefas fixas que coincidiriam com este encaixe
    let mudou = true;
    while (mudou) {
      mudou = false;
      for (const f of fixas) {
        if (cursor < f.ini + f.dur && cursor + dur > f.ini) {
          cursor = f.ini + f.dur;
          mudou = true;
        }
      }
    }
    if (cursor >= 24 * 60) break;
    sugestoes[t.id] = `${String(Math.floor(cursor / 60)).padStart(2, '0')}:${String(cursor % 60).padStart(2, '0')}`;
    cursor += dur;
  }
  return sugestoes;
}
