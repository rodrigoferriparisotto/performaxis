import { useEffect, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatarData, getDataAtual, subtractDaysBrazil } from '../../utils/dateUtils';
import { LoadingState } from '../ui/Estados';

interface LinhaResumo {
  data: string;
  programadas: number;
  executadas: number;
  nao_executadas: number;
  pendentes: number;
  manuais: number;
}

/** Programado × executado da governança nos últimos 7 dias (inclui hoje). */
export default function ResumoProgramacao({ atualizarEm }: { atualizarEm?: unknown }) {
  const [linhas, setLinhas] = useState<LinhaResumo[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    (async () => {
      setCarregando(true);
      const { data, error } = await supabase.rpc('programacao_resumo', {
        p_inicio: subtractDaysBrazil(6),
        p_fim: getDataAtual(),
      });
      if (ativo) {
        setLinhas(error ? [] : (data as LinhaResumo[]) || []);
        setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [atualizarEm]);

  const total = linhas.reduce(
    (t, l) => ({ prog: t.prog + l.programadas, exec: t.exec + l.executadas, nao: t.nao + l.nao_executadas }),
    { prog: 0, exec: 0, nao: 0 }
  );
  const pct = (exec: number, prog: number) => (prog > 0 ? Math.round((100 * exec) / prog) : null);
  const pctSemana = pct(total.exec, total.prog);

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-100 rounded-lg">
            <ClipboardCheck className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Programado × executado</h2>
            <p className="text-sm text-gray-600">Últimos 7 dias</p>
          </div>
        </div>
        {pctSemana !== null && (
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-800">{pctSemana}%</p>
            <p className="text-xs text-gray-500">
              {total.exec} de {total.prog} programadas executadas
            </p>
          </div>
        )}
      </div>

      {carregando ? (
        <LoadingState compacto />
      ) : linhas.length === 0 ? (
        <p className="p-6 text-sm text-gray-500">Nenhuma programação nos últimos 7 dias.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Dia</th>
                <th className="px-3 py-2 text-right font-medium">Programadas</th>
                <th className="px-3 py-2 text-right font-medium">Executadas</th>
                <th className="px-3 py-2 text-right font-medium">Não executadas</th>
                <th className="px-3 py-2 text-right font-medium" title="Registros abertos sem programação">Avulsos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {linhas.map((l) => {
                const p = pct(l.executadas, l.programadas);
                const hoje = l.data === getDataAtual();
                return (
                  <tr key={l.data}>
                    <td className="px-4 py-2 text-gray-800 whitespace-nowrap">
                      {formatarData(l.data)} {hoje && <span className="text-xs text-blue-600">(hoje)</span>}
                    </td>
                    <td className="px-3 py-2 text-right">{l.programadas}</td>
                    <td className="px-3 py-2 text-right text-green-700">
                      {l.executadas}
                      {p !== null && <span className="text-xs text-gray-500"> ({p}%)</span>}
                    </td>
                    <td className={`px-3 py-2 text-right ${l.nao_executadas > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                      {hoje && l.pendentes > 0 ? <span className="text-amber-600">{l.pendentes} pendente(s)</span> : l.nao_executadas}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">{l.manuais}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
