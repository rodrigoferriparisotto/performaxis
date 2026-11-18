import { MinusCircle } from 'lucide-react';
import { ROTULO_NAO_APLICAVEL } from '../../lib/checklist';

interface Props {
  ativo: boolean;
  onClick: () => void;
  disabled?: boolean;
}

/**
 * Chip ao lado do item do checklist: marca/desmarca "Não se aplica" (item sem
 * demanda no dia). Fica fora do botão principal do item, para o toque em um
 * não acionar o outro.
 */
export function BotaoNaoSeAplica({ ativo, onClick, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={ativo}
      title={ativo ? 'Desmarcar "Não se aplica"' : 'Marcar como "Não se aplica" (sem demanda hoje)'}
      className={`shrink-0 w-20 flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg border-2 text-xs font-medium leading-tight text-center transition-colors duration-200 disabled:opacity-50 ${
        ativo
          ? 'bg-gray-600 border-gray-600 text-white hover:bg-gray-700'
          : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700'
      }`}
    >
      <MinusCircle className="w-4 h-4" />
      <span>{ROTULO_NAO_APLICAVEL}</span>
    </button>
  );
}
