import { useEffect, useState, useSyncExternalStore } from 'react';
import { ClipboardCheck, Timer } from 'lucide-react';
import { assinarEncerramento, juntarObservacao, lerEncerramento } from '../../lib/encerramento';

/** Diálogo único de conferência do encerramento (montado no App). */
export function DialogoEncerramento() {
  const pergunta = useSyncExternalStore(assinarEncerramento, lerEncerramento);
  const [minutos, setMinutos] = useState('');
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    setMinutos('');
    setObservacao('');
    setErro('');
  }, [pergunta?.id]);

  if (!pergunta) return null;

  const confirmar = () => {
    let minutosInformados: number | null = null;
    if (pergunta.rapido) {
      const n = Math.round(Number(minutos));
      if (!Number.isFinite(n) || n < 1 || n > 720) {
        setErro('Informe quantos minutos você levou (de 1 a 720).');
        return;
      }
      minutosInformados = n;
    }
    if (pergunta.pedirObservacao && observacao.trim().length < 3) {
      setErro('Escreva uma observação sobre o que não foi feito.');
      return;
    }
    pergunta.resolver({
      minutosInformados,
      observacao: juntarObservacao(pergunta.observacaoAtual, observacao),
    });
  };

  return (
    <div className="fixed inset-0 z-[95] bg-black/50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl shadow-xl p-5 space-y-4 max-h-[calc(100dvh-0.5rem)] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-800">Antes de encerrar</h3>

        {pergunta.rapido && (
          <div className="space-y-2">
            <p className="flex gap-2 text-sm text-gray-700">
              <Timer className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <span>
                Percebemos que levou menos de 5 minutos. <strong>Quanto tempo você levou neste trabalho?</strong>
              </span>
            </p>
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={720}
                autoFocus
                value={minutos}
                onChange={(e) => setMinutos(e.target.value)}
                placeholder="ex.: 25"
                className="w-full px-3 py-2.5 pr-20 border border-gray-300 rounded-md text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">minutos</span>
            </div>
          </div>
        )}

        {pergunta.pedirObservacao && (
          <div className="space-y-2">
            <p className="flex gap-2 text-sm text-gray-700">
              <ClipboardCheck className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span>
                {pergunta.itensNaoFeitos === 1
                  ? '1 atividade não foi marcada como feita.'
                  : `${pergunta.itensNaoFeitos} atividades não foram marcadas como feitas.`}{' '}
                <strong>Deixe uma observação:</strong>
              </span>
            </p>
            <textarea
              rows={3}
              autoFocus={!pergunta.rapido}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex.: faltou material, hóspede no quarto, não se aplicava hoje..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
          <button
            type="button"
            onClick={() => pergunta.resolver(null)}
            className="sm:flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={confirmar}
            className="sm:flex-1 px-4 py-2.5 rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Encerrar registro
          </button>
        </div>
      </div>
    </div>
  );
}
