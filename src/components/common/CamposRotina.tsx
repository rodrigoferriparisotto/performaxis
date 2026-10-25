import { Clock, Timer } from 'lucide-react';
import { DIAS_SEMANA } from '../../utils/rotina';

interface Props {
  /** valores atuais (edição) */
  horario?: string | null;
  duracao?: number | null;
  /** quando informados, mostra também a escolha dos dias da semana */
  dias?: string[];
  onDiasChange?: (dias: string[]) => void;
}

const ABREVIADO: Record<string, string> = {
  domingo: 'Dom',
  'segunda-feira': 'Seg',
  'terça-feira': 'Ter',
  'quarta-feira': 'Qua',
  'quinta-feira': 'Qui',
  'sexta-feira': 'Sex',
  sábado: 'Sáb',
};

/**
 * Campos de rotina do cadastro de atividade. Os inputs têm name
 * horario_previsto / duracao_prevista_min para serem lidos com FormData.
 */
export function CamposRotina({ horario, duracao, dias, onDiasChange }: Props) {
  const alternarDia = (dia: string) => {
    if (!dias || !onDiasChange) return;
    onDiasChange(dias.includes(dia) ? dias.filter((d) => d !== dia) : [...dias, dia]);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            <Clock className="w-4 h-4" /> Horário previsto
          </label>
          <input
            type="time"
            name="horario_previsto"
            defaultValue={horario ? horario.slice(0, 5) : ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Vazio = sem horário fixo</p>
        </div>
        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            <Timer className="w-4 h-4" /> Duração prevista
          </label>
          <div className="relative">
            <input
              type="number"
              name="duracao_prevista_min"
              min={1}
              max={720}
              inputMode="numeric"
              defaultValue={duracao ?? ''}
              placeholder="ex.: 15"
              className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">min</span>
          </div>
        </div>
      </div>

      {dias && onDiasChange && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Dias da semana</p>
          <div className="flex flex-wrap gap-1.5">
            {DIAS_SEMANA.map((dia) => {
              const ativo = dias.includes(dia);
              return (
                <button
                  key={dia}
                  type="button"
                  onClick={() => alternarDia(dia)}
                  className={`px-3 py-1.5 rounded-full border text-sm ${
                    ativo ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {ABREVIADO[dia]}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-1">Nenhum marcado = todos os dias</p>
        </div>
      )}
    </div>
  );
}

/** Lê os campos de rotina de um FormData (string vazia vira null). */
export function lerCamposRotina(formData: FormData) {
  const horario = String(formData.get('horario_previsto') ?? '').trim();
  const duracao = Number(formData.get('duracao_prevista_min'));
  return {
    horario_previsto: horario || null,
    duracao_prevista_min: Number.isFinite(duracao) && duracao > 0 ? Math.min(Math.round(duracao), 720) : null,
  };
}
