import { useEffect, useMemo, useState } from 'react';
import { Timer } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getDataAtual, subtractDaysBrazil } from '../../utils/dateUtils';
import { PageHeader } from '../ui/PageHeader';
import { EmptyState, LoadingState } from '../ui/Estados';
import { notificar } from '../../lib/feedback';

interface Linha {
  modulo: string;
  tipo: string;
  usuario_id: string;
  usuario: string;
  registros: number;
  estimado_min: number | null;
  media_real_min: number;
  acima: number;
  rapidos: number;
  informados: number;
}

interface Grupo {
  chave: string;
  modulo: string;
  tipo: string;
  estimado: number | null;
  registros: number;
  mediaReal: number;
  acima: number;
  rapidos: number;
  pessoas: Linha[];
}

const fmtMin = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} min`;

/** variação do tempo real sobre o estimado, em % (positivo = demorou mais) */
function variacao(real: number, estimado: number | null): number | null {
  if (!estimado) return null;
  return Math.round(((real - estimado) / estimado) * 100);
}

function SeloVariacao({ real, estimado }: { real: number; estimado: number | null }) {
  const v = variacao(real, estimado);
  if (v === null) return <span className="text-gray-400">sem estimativa</span>;
  const cor =
    v > 20 ? 'bg-red-100 text-red-700' : v < -50 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-700';
  const texto = v > 0 ? `+${v}%` : `${v}%`;
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cor}`}>{texto}</span>;
}

export default function TempoRealEstimado() {
  const [rascunho, setRascunho] = useState({ inicio: subtractDaysBrazil(30), fim: getDataAtual() });
  const [periodo, setPeriodo] = useState(rascunho);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    (async () => {
      setCarregando(true);
      const { data, error } = await supabase.rpc('tempo_real_vs_estimado', {
        p_inicio: periodo.inicio,
        p_fim: periodo.fim,
      });
      if (!ativo) return;
      if (error) {
        notificar('Não foi possível carregar o relatório de tempos.', 'erro');
        setLinhas([]);
      } else {
        setLinhas((data as Linha[]) || []);
      }
      setCarregando(false);
    })();
    return () => {
      ativo = false;
    };
  }, [periodo]);

  const grupos = useMemo<Grupo[]>(() => {
    const mapa = new Map<string, Grupo>();
    for (const l of linhas) {
      const chave = `${l.modulo}|${l.tipo}`;
      const g = mapa.get(chave) ?? {
        chave, modulo: l.modulo, tipo: l.tipo, estimado: l.estimado_min,
        registros: 0, mediaReal: 0, acima: 0, rapidos: 0, pessoas: [],
      };
      // média ponderada pelo número de registros
      g.mediaReal = (g.mediaReal * g.registros + Number(l.media_real_min) * l.registros) / (g.registros + l.registros);
      g.registros += l.registros;
      g.acima += l.acima;
      g.rapidos += l.rapidos;
      g.estimado = g.estimado ?? l.estimado_min;
      g.pessoas.push(l);
      mapa.set(chave, g);
    }
    return [...mapa.values()];
  }, [linhas]);

  const filtrar = () => {
    if (!rascunho.inicio || !rascunho.fim || rascunho.inicio > rascunho.fim) {
      notificar('Confira as datas: o início precisa ser antes do fim.', 'aviso');
      return;
    }
    setPeriodo({ ...rascunho });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Tempo real × estimado"
        subtitulo="Quanto cada serviço leva de verdade, comparado ao tempo que a gestão estimou"
      />

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-end gap-3">
        <label className="text-sm text-gray-700">
          De
          <input
            type="date"
            value={rascunho.inicio}
            onChange={(e) => setRascunho((r) => ({ ...r, inicio: e.target.value }))}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </label>
        <label className="text-sm text-gray-700">
          Até
          <input
            type="date"
            value={rascunho.fim}
            onChange={(e) => setRascunho((r) => ({ ...r, fim: e.target.value }))}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </label>
        <button onClick={filtrar} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">
          Filtrar
        </button>
        <p className="text-xs text-gray-500 sm:ml-auto">
          <span className="text-red-700 font-medium">vermelho</span>: passou mais de 20% do estimado ·{' '}
          <span className="text-amber-700 font-medium">amarelo</span>: menos da metade do estimado
        </p>
      </div>

      {carregando ? (
        <LoadingState />
      ) : grupos.length === 0 ? (
        <EmptyState icon={Timer} titulo="Nenhum registro concluído no período" />
      ) : (
        grupos.map((g) => (
          <div key={g.chave} className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">{g.modulo}</p>
                <h2 className="text-lg font-semibold text-gray-800">{g.tipo}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span>Estimado: <strong>{fmtMin(g.estimado)}</strong></span>
                <span>Média real: <strong>{fmtMin(g.mediaReal)}</strong></span>
                <SeloVariacao real={g.mediaReal} estimado={g.estimado} />
                <span className="text-gray-500">{g.registros} registro(s)</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Pessoa</th>
                    <th className="px-3 py-2 text-right font-medium">Registros</th>
                    <th className="px-3 py-2 text-right font-medium">Média real</th>
                    <th className="px-3 py-2 text-right font-medium">Variação</th>
                    <th className="px-3 py-2 text-right font-medium" title="Mais de 20% acima do estimado">Demorou mais</th>
                    <th className="px-3 py-2 text-right font-medium" title="Menos da metade do estimado">Rápido demais</th>
                    <th className="px-3 py-2 text-right font-medium" title="Tempo digitado pela pessoa ao encerrar em menos de 5 min">Tempo informado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {g.pessoas.map((p) => (
                    <tr key={p.usuario_id}>
                      <td className="px-4 py-2 text-gray-800 whitespace-nowrap">{p.usuario}</td>
                      <td className="px-3 py-2 text-right">{p.registros}</td>
                      <td className="px-3 py-2 text-right">{fmtMin(Number(p.media_real_min))}</td>
                      <td className="px-3 py-2 text-right"><SeloVariacao real={Number(p.media_real_min)} estimado={p.estimado_min} /></td>
                      <td className={`px-3 py-2 text-right ${p.acima > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}`}>{p.acima}</td>
                      <td className={`px-3 py-2 text-right ${p.rapidos > 0 ? 'text-amber-700 font-medium' : 'text-gray-400'}`}>{p.rapidos}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{p.informados}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
