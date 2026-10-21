import { useEffect, useState, useSyncExternalStore } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import {
  assinarFeedback,
  lerAvisos,
  lerConfirmacoes,
  removerAviso,
  TipoAviso,
} from '../../lib/feedback';

const ESTILO: Record<TipoAviso, { caixa: string; Icone: typeof Info; icone: string }> = {
  sucesso: { caixa: 'bg-green-50 border-green-200 text-green-900', Icone: CheckCircle, icone: 'text-green-600' },
  erro: { caixa: 'bg-red-50 border-red-200 text-red-900', Icone: XCircle, icone: 'text-red-600' },
  aviso: { caixa: 'bg-amber-50 border-amber-200 text-amber-900', Icone: AlertTriangle, icone: 'text-amber-600' },
  info: { caixa: 'bg-blue-50 border-blue-200 text-blue-900', Icone: Info, icone: 'text-blue-600' },
};

/** Avisos empilhados no topo + diálogo de confirmação. Montar uma vez no App. */
export function CamadaDeFeedback() {
  const avisos = useSyncExternalStore(assinarFeedback, lerAvisos);
  const confirmacoes = useSyncExternalStore(assinarFeedback, lerConfirmacoes);
  const pedido = confirmacoes[0];

  return (
    <>
      <div
        className="fixed top-3 inset-x-0 z-[90] flex flex-col items-center gap-2 px-3 pointer-events-none"
        aria-live="polite"
      >
        {avisos.map((a) => {
          const { caixa, Icone, icone } = ESTILO[a.tipo];
          return (
            <div
              key={a.id}
              role={a.tipo === 'erro' ? 'alert' : 'status'}
              className={`pointer-events-auto w-full max-w-md flex items-start gap-3 border rounded-lg shadow-lg px-4 py-3 ${caixa}`}
            >
              <Icone className={`w-5 h-5 flex-shrink-0 mt-0.5 ${icone}`} />
              <p className="flex-1 text-sm whitespace-pre-line">{a.texto}</p>
              <button
                onClick={() => removerAviso(a.id)}
                aria-label="Fechar aviso"
                className="p-1 -m-1 opacity-60 hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {pedido && <DialogoConfirmacao key={pedido.id} {...pedido} />}
    </>
  );
}

function DialogoConfirmacao({
  texto,
  perigoso,
  textoConfirmar,
  resolver,
}: {
  texto: string;
  perigoso: boolean;
  textoConfirmar: string;
  resolver: (ok: boolean) => void;
}) {
  const [respondido, setRespondido] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') responder(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const responder = (ok: boolean) => {
    if (respondido) return;
    setRespondido(true);
    resolver(ok);
  };

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={() => responder(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className={`w-6 h-6 flex-shrink-0 ${perigoso ? 'text-red-600' : 'text-blue-600'}`} />
          <p className="text-gray-800 whitespace-pre-line">{texto}</p>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 mt-6">
          <button
            onClick={() => responder(false)}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Voltar
          </button>
          <button
            autoFocus
            onClick={() => responder(true)}
            className={`flex-1 px-4 py-2.5 rounded-lg text-white font-semibold ${
              perigoso ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
