import { Plus, Trash2 } from 'lucide-react';
import { DIAS_SEMANA } from '../../utils/rotina';
import { Escala, PRESETS_CICLO, proximosDiasDeTrabalho } from '../../utils/escala';
import { formatarData, getDataAtual } from '../../utils/dateUtils';

const ABREV = (dia: string) => dia.slice(0, 3).replace(/^./, (c) => c.toUpperCase());

interface Props {
  valor: Escala | null;
  onChange: (escala: Escala | null) => void;
}

/** Escala de trabalho: dias fixos com um ou mais turnos, ou ciclo (12x36, 24x48...). */
export function EditorEscala({ valor, onChange }: Props) {
  const tipo = valor?.tipo ?? 'nenhuma';
  const hoje = getDataAtual();

  const escolherTipo = (novo: 'nenhuma' | 'semanal' | 'ciclo') => {
    if (novo === 'nenhuma') return onChange(null);
    if (novo === 'semanal') return onChange({ tipo: 'semanal', turnos: [{ dias: [], inicio: '' }] });
    onChange({ tipo: 'ciclo', trabalha: 1, folga: 1, referencia: hoje, inicio: '' });
  };

  const botaoTipo = (id: 'nenhuma' | 'semanal' | 'ciclo', rotulo: string) => (
    <button
      type="button"
      onClick={() => escolherTipo(id)}
      className={`px-3 py-1.5 rounded-full border text-sm ${
        tipo === id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
      }`}
    >
      {rotulo}
    </button>
  );

  const previa = valor ? proximosDiasDeTrabalho(valor, hoje) : [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {botaoTipo('nenhuma', 'Sem escala')}
        {botaoTipo('semanal', 'Dias fixos')}
        {botaoTipo('ciclo', 'Em ciclo (12x36…)')}
      </div>

      {valor?.tipo === 'semanal' && (
        <div className="space-y-2">
          {valor.turnos.map((turno, i) => (
            <div key={i} className="rounded-md border border-gray-200 p-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Turno {i + 1}</span>
                {valor.turnos.length > 1 && (
                  <button
                    type="button"
                    aria-label="Remover turno"
                    onClick={() => onChange({ ...valor, turnos: valor.turnos.filter((_, j) => j !== i) })}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DIAS_SEMANA.map((dia) => {
                  const ativo = turno.dias.includes(dia);
                  return (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => {
                        const turnos = [...valor.turnos];
                        turnos[i] = { ...turno, dias: ativo ? turno.dias.filter((d) => d !== dia) : [...turno.dias, dia] };
                        onChange({ ...valor, turnos });
                      }}
                      className={`px-2.5 py-1 rounded-full border text-sm ${
                        ativo ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
                      }`}
                    >
                      {ABREV(dia)}
                    </button>
                  );
                })}
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                Início
                <input
                  type="time"
                  value={turno.inicio}
                  onChange={(e) => {
                    const turnos = [...valor.turnos];
                    turnos[i] = { ...turno, inicio: e.target.value };
                    onChange({ ...valor, turnos });
                  }}
                  className="border border-gray-300 rounded-lg px-2 py-1.5"
                />
              </label>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...valor, turnos: [...valor.turnos, { dias: [], inicio: '' }] })}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-blue-300 text-blue-700 text-sm hover:bg-blue-50"
          >
            <Plus className="w-4 h-4" /> Turno
          </button>
        </div>
      )}

      {valor?.tipo === 'ciclo' && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS_CICLO.map((p) => (
              <button
                key={p.rotulo}
                type="button"
                onClick={() => onChange({ ...valor, trabalha: p.trabalha, folga: p.folga })}
                className={`px-2.5 py-1 rounded-full border text-sm ${
                  valor.trabalha === p.trabalha && valor.folga === p.folga
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                {p.rotulo}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 max-w-sm">
            <label className="text-sm text-gray-700">
              Trabalha (dias)
              <input type="number" min={1} max={14} value={valor.trabalha}
                onChange={(e) => onChange({ ...valor, trabalha: Math.max(1, Number(e.target.value) || 1) })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5" />
            </label>
            <label className="text-sm text-gray-700">
              Folga (dias)
              <input type="number" min={0} max={14} value={valor.folga}
                onChange={(e) => onChange({ ...valor, folga: Math.max(0, Number(e.target.value) || 0) })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5" />
            </label>
            <label className="text-sm text-gray-700">
              Um dia em que trabalhou
              <input type="date" value={valor.referencia}
                onChange={(e) => onChange({ ...valor, referencia: e.target.value })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5" />
            </label>
            <label className="text-sm text-gray-700">
              Início
              <input type="time" value={valor.inicio}
                onChange={(e) => onChange({ ...valor, inicio: e.target.value })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5" />
            </label>
          </div>
        </div>
      )}

      {valor && (
        <p className="text-xs text-gray-600">
          {previa.length
            ? <>Próximos dias de trabalho: {previa.map((p) => `${formatarData(p.dia).slice(0, 5)} (${p.turnos.join(' e ')})`).join(' · ')}</>
            : 'Preencha os dias e o horário de início para ver os próximos dias de trabalho.'}
        </p>
      )}
      <p className="text-xs text-gray-500">
        30 min depois do início de cada turno, se a pessoa ainda não iniciou nenhum registro, ela recebe:
        “Por favor, inicie o Performaxis e tenha um excelente dia de trabalho.”
      </p>
    </div>
  );
}
