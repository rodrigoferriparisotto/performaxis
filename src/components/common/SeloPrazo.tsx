import { AlarmClock, Hourglass } from 'lucide-react';
import { situacaoPrazo, textoPrazo } from '../../utils/prazoManutencao';

/** Selo de prazo da manutenção: atrasada (vermelho), vence em <24h (âmbar), ok (cinza). */
export function SeloPrazo({ criadoEm, prioridade }: { criadoEm?: string | null; prioridade: string }) {
  const s = situacaoPrazo(criadoEm, prioridade);
  if (!s) return null;
  const cor = s.atrasada
    ? 'bg-red-100 text-red-700'
    : s.horasRestantes < 24
    ? 'bg-amber-100 text-amber-800'
    : 'bg-gray-100 text-gray-700';
  const Icone = s.atrasada ? AlarmClock : Hourglass;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cor}`}>
      <Icone className="w-3 h-3" /> {textoPrazo(s)}
    </span>
  );
}
