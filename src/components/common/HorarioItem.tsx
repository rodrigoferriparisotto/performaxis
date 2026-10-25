import { useSyncExternalStore } from 'react';
import { AlarmClock, Clock, Timer } from 'lucide-react';
import { formatarDuracao, formatarHorarioPrevisto, situacaoHorario } from '../../utils/rotina';

// um único relógio de minuto para todas as tarefas da tela
let minutoAtual = Date.now();
const ouvintes = new Set<() => void>();
let intervalo: number | null = null;
function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  if (intervalo === null) {
    intervalo = window.setInterval(() => {
      minutoAtual = Date.now();
      ouvintes.forEach((o) => o());
    }, 30_000);
  }
  return () => {
    ouvintes.delete(ouvinte);
    if (ouvintes.size === 0 && intervalo !== null) {
      window.clearInterval(intervalo);
      intervalo = null;
    }
  };
}
const useMinuto = () => useSyncExternalStore(assinar, () => minutoAtual);

interface Props {
  horario?: string | null;
  duracao?: number | null;
  status?: string;
  /** horário sugerido pela rotina, para tarefas sem horário fixo ('HH:MM') */
  sugerido?: string | null;
}

/** Selo de horário previsto da tarefa: no horário / agora / atrasada. */
export function HorarioItem({ horario, duracao, status = 'pendente', sugerido }: Props) {
  const agora = useMinuto();
  const situacao = situacaoHorario(horario, status, new Date(agora));
  const textoDuracao = formatarDuracao(duracao);

  if (situacao === 'sem_horario' && !sugerido && !textoDuracao) return null;

  const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium';
  let selo: JSX.Element | null = null;

  if (situacao === 'atrasada') {
    selo = (
      <span className={`${base} bg-red-100 text-red-700`}>
        <AlarmClock className="w-3 h-3" /> Atrasada · previsto {formatarHorarioPrevisto(horario)}
      </span>
    );
  } else if (situacao === 'agora') {
    selo = (
      <span className={`${base} bg-amber-100 text-amber-800`}>
        <AlarmClock className="w-3 h-3" /> Agora · {formatarHorarioPrevisto(horario)}
      </span>
    );
  } else if (situacao === 'futura' || situacao === 'feita') {
    selo = (
      <span className={`${base} bg-gray-100 text-gray-700`}>
        <Clock className="w-3 h-3" /> {formatarHorarioPrevisto(horario)}
      </span>
    );
  } else if (sugerido) {
    selo = (
      <span className={`${base} bg-blue-50 text-blue-700`} title="Horário sugerido pela rotina">
        <Clock className="w-3 h-3" /> sugerido {formatarHorarioPrevisto(sugerido)}
      </span>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-1.5 mt-1">
      {selo}
      {textoDuracao && (
        <span className={`${base} bg-gray-50 text-gray-500`}>
          <Timer className="w-3 h-3" /> {textoDuracao}
        </span>
      )}
    </span>
  );
}
