import { useEffect, useState } from 'react';
import { CalendarX2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { notificar } from '../../lib/feedback';
import { useAuth } from '../../contexts/AuthContext';

// Dia da escala sem nenhum registro: ao abrir o app a pessoa diz se estava de
// folga (a folga é aleatória, depende da ocupação). Folga sai da conta; se
// trabalhou, o dia fica como "sem uso".

const CHAVE_ADIADO = 'performaxis_dias_sem_uso_adiado';

const rotuloDia = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC', weekday: 'long', day: '2-digit', month: '2-digit' });

export function PerguntaDiasSemUso() {
  const { user } = useAuth();
  const [dias, setDias] = useState<string[]>([]);
  const [respondendo, setRespondendo] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !user.empresaId) return;
    try {
      if (sessionStorage.getItem(CHAVE_ADIADO) === user.id) return;
    } catch {
      /* sem sessionStorage: pergunta mesmo assim */
    }
    supabase.rpc('dias_sem_uso_pendentes').then(({ data }) => {
      setDias(((data as { data: string }[]) || []).map((d) => d.data));
    });
  }, [user?.id, user?.empresaId]);

  const responder = async (dia: string, folga: boolean) => {
    setRespondendo(dia);
    const { error } = await supabase.rpc('responder_dia_sem_uso', { p_data: dia, p_folga: folga });
    setRespondendo(null);
    if (error) {
      notificar('Não foi possível salvar a resposta. Tente novamente.', 'erro');
      return;
    }
    setDias((lista) => lista.filter((d) => d !== dia));
  };

  const depois = () => {
    try {
      sessionStorage.setItem(CHAVE_ADIADO, user?.id || '');
    } catch {
      /* ignora */
    }
    setDias([]);
  };

  if (dias.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[9997] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <CalendarX2 className="w-6 h-6 text-amber-700" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">
              {dias.length === 1 ? 'Um dia sem registro' : `${dias.length} dias sem registro`}
            </h2>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            {dias.length === 1 ? 'Neste dia da sua escala' : 'Nestes dias da sua escala'} não encontramos nenhum registro seu.
            Se estava de <strong>folga</strong>, toque em Folga. Se trabalhou e esqueceu de registrar, toque em
            <strong> Trabalhei</strong>: o dia fica como sem uso do sistema.
          </p>
        </div>
        <ul className="px-5 pb-3 space-y-2">
          {dias.map((dia) => (
            <li key={dia} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2">
              <span className="text-sm font-medium text-gray-800 capitalize">{rotuloDia(dia)}</span>
              <span className="flex gap-2">
                <button
                  onClick={() => responder(dia, true)}
                  disabled={respondendo === dia}
                  className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                >
                  Folga
                </button>
                <button
                  onClick={() => responder(dia, false)}
                  disabled={respondendo === dia}
                  className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Trabalhei
                </button>
              </span>
            </li>
          ))}
        </ul>
        <div className="px-5 py-3 border-t border-gray-200 flex justify-end">
          <button onClick={depois} className="text-sm text-gray-500 hover:text-gray-700">
            Responder depois
          </button>
        </div>
      </div>
    </div>
  );
}
