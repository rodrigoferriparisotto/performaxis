import React, { useEffect, useState } from 'react';
import { Calendar, RotateCcw, Users, Gauge, BadgeCheck, Clock, CheckCircle2, TrendingUp, Ban, Target, Hourglass, Trophy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LoadingState, EmptyState } from '../ui/Estados';
import { FaixaBadge, SeloBadge, estiloFaixa, faixaValida, fmtNum } from './meritocracia';

interface PerformanceMensalProps {
  empresaId: string;
  perfil?: string;
}

interface PerformanceData {
  id: string;
  usuario_id: string;
  empresa_id: string;
  mes: number;
  ano: number;
  indice_medio: number | null;
  faixa: string | null;
  selo_100: boolean | null;
  ranking_posicao: number | null;
  total_dias_trabalhados: number | null;
  dias_escala: number | null;
  dias_sem_uso: number | null;
  dias_acima_80: number | null;
  dias_no_horario: number | null;
  dias_fechou_tudo: number | null;
  media_efetividade: number | null;
  total_horas_mes: number | null;
  total_vezes_primeiro_lugar: number | null;
  usuario?: {
    name: string;
    profile?: string;
  };
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios);

const PerformanceMensal: React.FC<PerformanceMensalProps> = ({ empresaId, perfil }) => {
  const [performances, setPerformances] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const dataAtual = new Date();
  const [mesSelecionado, setMesSelecionado] = useState<number>(dataAtual.getMonth() + 1);
  const [anoSelecionado, setAnoSelecionado] = useState<number>(dataAtual.getFullYear());

  useEffect(() => {
    carregarPerformances();
  }, [empresaId, mesSelecionado, anoSelecionado, perfil]);

  const carregarPerformances = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('performance_mensal')
        .select(`
          *,
          usuario:usuarios(name, profile)
        `)
        .eq('empresa_id', empresaId)
        .eq('mes', mesSelecionado)
        .eq('ano', anoSelecionado)
        .order('indice_medio', { ascending: false, nullsFirst: false });

      if (error) throw error;

      let lista = (data || []) as PerformanceData[];

      if (perfil && lista.length > 0) {
        lista = lista.filter((p) => p.usuario?.profile === perfil);
      }

      setPerformances(lista);
    } catch (error) {
      console.error('Erro ao carregar performances mensais:', error);
      setPerformances([]);
    } finally {
      setLoading(false);
    }
  };

  const anosDisponiveis = [0, 1, 2].map((i) => dataAtual.getFullYear() - i);

  const voltarParaMesAtual = () => {
    setMesSelecionado(dataAtual.getMonth() + 1);
    setAnoSelecionado(dataAtual.getFullYear());
  };

  const calcularResumo = () => {
    const comIndice = performances.filter((p) => p.indice_medio !== null);
    const media = comIndice.length
      ? comIndice.reduce((acc, p) => acc + Number(p.indice_medio), 0) / comIndice.length
      : null;
    const contar = (f: string) => performances.filter((p) => faixaValida(p.faixa) === f).length;
    return {
      media,
      ouro: contar('ouro'),
      prata: contar('prata'),
      bronze: contar('bronze'),
      selo: performances.filter((p) => p.selo_100).length,
    };
  };

  const resumo = calcularResumo();
  const ehMesAtual = mesSelecionado === dataAtual.getMonth() + 1 && anoSelecionado === dataAtual.getFullYear();

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg p-4 sm:p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-3 rounded-lg">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">Resultado do Mês</h3>
            <p className="text-sm text-gray-600">{MESES[mesSelecionado - 1]} de {anoSelecionado}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(parseInt(e.target.value))}
            className="flex-1 md:flex-none bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            {MESES.map((nome, i) => (
              <option key={nome} value={i + 1}>
                {nome}
              </option>
            ))}
          </select>

          <select
            value={anoSelecionado}
            onChange={(e) => setAnoSelecionado(parseInt(e.target.value))}
            className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            {anosDisponiveis.map((ano) => (
              <option key={ano} value={ano}>
                {ano}
              </option>
            ))}
          </select>

          {!ehMesAtual && (
            <button
              onClick={voltarParaMesAtual}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-sm hover:shadow-md hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              Mês Atual
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg">
          <LoadingState texto="Carregando resultado do mês..." compacto />
        </div>
      ) : performances.length === 0 ? (
        <div className="bg-white rounded-lg">
          <EmptyState
            icon={Calendar}
            titulo="Nenhum resultado consolidado neste mês"
            descricao="O resultado do mês é a média dos índices diários de cada pessoa."
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-600" />
                <p className="text-xs text-gray-600">Pessoas</p>
              </div>
              <p className="text-2xl font-bold text-gray-800">{performances.length}</p>
            </div>

            <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <Gauge className="w-4 h-4 text-indigo-600" />
                <p className="text-xs text-gray-600">Índice médio</p>
              </div>
              <p className="text-2xl font-bold text-indigo-600">{fmtNum(resumo.media)}</p>
            </div>

            <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
              <p className="text-xs text-gray-600 mb-1.5">Faixas do mês</p>
              <div className="flex flex-wrap gap-1 text-xs font-semibold">
                <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-900">{resumo.ouro} Ouro</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{resumo.prata} Prata</span>
                <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-800">{resumo.bronze} Bronze</span>
              </div>
            </div>

            <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <BadgeCheck className="w-4 h-4 text-emerald-600" />
                <p className="text-xs text-gray-600">Selo 100%</p>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{resumo.selo}</p>
            </div>
          </div>

          {ehMesAtual && (
            <p className="text-xs text-gray-500 mb-3">
              Mês em andamento: faixa e selo ainda podem mudar até o último dia.
            </p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {performances.map((perf) => {
              const estilo = estiloFaixa(perf.faixa);
              const diasEscala = Number(perf.dias_escala || 0);
              const noHorario = Number(perf.dias_no_horario || 0);
              const fechouTudo = Number(perf.dias_fechou_tudo || 0);
              const acima80 = Number(perf.dias_acima_80 || 0);
              const semUso = Number(perf.dias_sem_uso || 0);
              const trabalhados = Number(perf.total_dias_trabalhados || 0);
              const primeiros = Number(perf.total_vezes_primeiro_lugar || 0);

              return (
                <div
                  key={perf.id}
                  className={`bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 ${estilo.borda} p-3 sm:p-4 ${
                    perf.selo_100 ? 'ring-1 ring-emerald-300' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-bold text-gray-800 text-base truncate">
                        {perf.usuario?.name || 'Funcionário'}
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <FaixaBadge faixa={perf.faixa} />
                        {perf.selo_100 && <SeloBadge />}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-4xl font-extrabold leading-none ${estilo.numero}`}>
                        {fmtNum(perf.indice_medio)}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-gray-500 mt-1">índice médio</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-3 text-xs text-gray-700">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                      {diasEscala > 0
                        ? `${noHorario}/${diasEscala} dias no horário`
                        : 'Sem escala no mês'}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                      {fechouTudo}/{trabalhados} fechou tudo
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                      {acima80} {plural(acima80, 'dia', 'dias')} acima de 80
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      Efetividade {fmtNum(perf.media_efetividade)}%
                    </span>
                    {semUso > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-red-600 font-medium">
                        <Ban className="w-3.5 h-3.5 flex-shrink-0" />
                        {semUso} {plural(semUso, 'dia', 'dias')} sem uso
                        {Number(perf.indice_medio || 0) >= 90 && ' · faixa limitada a Prata'}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 pt-2 border-t border-gray-100 text-[11px] text-gray-500">
                    {perf.ranking_posicao ? (
                      <span title="Posição no mês, na empresa">{perf.ranking_posicao}º no mês</span>
                    ) : null}
                    <span>{trabalhados} {plural(trabalhados, 'dia trabalhado', 'dias trabalhados')}</span>
                    {primeiros > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        {primeiros}x 1º do dia
                      </span>
                    )}
                    {Number(perf.total_horas_mes || 0) > 0 && (
                      <span className="inline-flex items-center gap-1" title="Apenas informativo — não entra no índice">
                        <Hourglass className="w-3 h-3" />
                        {fmtNum(perf.total_horas_mes)}h
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default PerformanceMensal;
