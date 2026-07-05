import React, { useEffect, useState } from 'react';
import { Calendar, Trophy, Medal, Star, BarChart3, RotateCcw, Award, Target, TrendingUp, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { subMonths } from 'date-fns';

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
  total_dias_trabalhados: number;
  total_vezes_primeiro_lugar: number;
  total_vezes_segundo_lugar: number;
  total_vezes_terceiro_lugar: number;
  media_pontos_dia: number;
  total_pontos_mes: number;
  media_efetividade: number;
  total_horas_mes: number;
  ranking_posicao: number;
  usuario?: {
    name: string;
  };
}

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
      let query = supabase
        .from('performance_mensal')
        .select(`
          *,
          usuario:usuarios(name, profile)
        `)
        .eq('empresa_id', empresaId)
        .eq('mes', mesSelecionado)
        .eq('ano', anoSelecionado);

      // Ordenar pelos critérios corretos de meritocracia
      const { data, error } = await query
        .order('total_vezes_primeiro_lugar', { ascending: false })
        .order('media_pontos_dia', { ascending: false })
        .order('media_efetividade', { ascending: false })
        .order('total_horas_mes', { ascending: false });

      if (error) throw error;

      let performances = data || [];

      // Filtrar por perfil se especificado
      if (perfil && performances.length > 0) {
        performances = performances.filter((p: any) => p.usuario?.profile === perfil);
      }

      // Recalcular rankings localmente após filtro
      performances = performances.map((perf, index) => ({
        ...perf,
        ranking_posicao: index + 1
      }));

      setPerformances(performances);
    } catch (error) {
      console.error('Erro ao carregar performances mensais:', error);
      setPerformances([]);
    } finally {
      setLoading(false);
    }
  };

  const gerarAnosDisponiveis = () => {
    const anos = [];
    const anoAtual = dataAtual.getFullYear();
    for (let i = 0; i < 3; i++) {
      anos.push(anoAtual - i);
    }
    return anos;
  };

  const handleMesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMesSelecionado(parseInt(e.target.value));
  };

  const handleAnoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAnoSelecionado(parseInt(e.target.value));
  };

  const voltarParaMesAtual = () => {
    setMesSelecionado(dataAtual.getMonth() + 1);
    setAnoSelecionado(dataAtual.getFullYear());
  };

  const anosDisponiveis = gerarAnosDisponiveis();
  const mesesDoAno = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  const getMedalColor = (posicao: number) => {
    switch (posicao) {
      case 1:
        return { bg: 'from-yellow-400 to-yellow-600', ring: 'ring-yellow-400', text: 'text-yellow-800' };
      case 2:
        return { bg: 'from-gray-300 to-gray-500', ring: 'ring-gray-400', text: 'text-gray-800' };
      case 3:
        return { bg: 'from-orange-400 to-orange-600', ring: 'ring-orange-400', text: 'text-orange-800' };
      default:
        return { bg: 'from-blue-400 to-blue-600', ring: 'ring-blue-400', text: 'text-blue-800' };
    }
  };

  const getNomeMes = (mes: number) => {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return meses[mes - 1];
  };

  const getBarColor = (index: number) => {
    const colors = ['#FFD700', '#C0C0C0', '#CD7F32', '#3B82F6', '#8B5CF6'];
    return colors[index % colors.length];
  };

  const prepararDadosGrafico = () => {
    return performances.slice(0, 10).map((perf) => ({
      nome: perf.usuario?.name || 'Funcionário',
      primeiroLugar: perf.total_vezes_primeiro_lugar,
      segundoLugar: perf.total_vezes_segundo_lugar,
      terceiroLugar: perf.total_vezes_terceiro_lugar,
    }));
  };

  const calcularEstatisticasGerais = () => {
    if (performances.length === 0) return { mediaEfetividade: 0, totalDias: 0, totalHoras: 0 };

    const mediaEfetividade = performances.reduce((acc, p) => acc + p.media_efetividade, 0) / performances.length;
    const totalDias = Math.max(...performances.map(p => p.total_dias_trabalhados));
    const totalHoras = performances.reduce((acc, p) => acc + p.total_horas_mes, 0);

    return {
      mediaEfetividade: Math.round(mediaEfetividade * 10) / 10,
      totalDias,
      totalHoras: Math.round(totalHoras * 10) / 10
    };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-bold text-gray-800">Ranking Mensal</h3>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (performances.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">Ranking Mensal</h3>
              <p className="text-sm text-gray-600">{getNomeMes(mesSelecionado)} de {anoSelecionado}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={mesSelecionado}
              onChange={handleMesChange}
              className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {mesesDoAno.map((mes) => (
                <option key={mes.value} value={mes.value}>
                  {mes.label}
                </option>
              ))}
            </select>
            <select
              value={anoSelecionado}
              onChange={handleAnoChange}
              className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {anosDisponiveis.map((ano) => (
                <option key={ano} value={ano}>
                  {ano}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Nenhuma performance consolidada neste mês</p>
          <p className="text-gray-400 text-sm mt-2">Execute o cálculo para gerar as estatísticas mensais</p>
        </div>
      </div>
    );
  }

  const stats = calcularEstatisticasGerais();
  const dadosGrafico = prepararDadosGrafico();

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-3 rounded-lg">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">Ranking Mensal</h3>
              <p className="text-sm text-gray-600">{getNomeMes(mesSelecionado)} de {anoSelecionado}</p>
              {perfil && (
                <p className="text-xs text-blue-600 font-medium mt-1">
                  Ranking filtrado por perfil específico
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={mesSelecionado}
              onChange={handleMesChange}
              className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            >
              {mesesDoAno.map((mes) => (
                <option key={mes.value} value={mes.value}>
                  {mes.label}
                </option>
              ))}
            </select>

            <select
              value={anoSelecionado}
              onChange={handleAnoChange}
              className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            >
              {anosDisponiveis.map((ano) => (
                <option key={ano} value={ano}>
                  {ano}
                </option>
              ))}
            </select>

            {(mesSelecionado !== dataAtual.getMonth() + 1 || anoSelecionado !== dataAtual.getFullYear()) && (
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

        {perfil && (
          <div className="mb-6 bg-blue-100 border-l-4 border-blue-600 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              <p className="text-sm text-blue-800 font-medium">
                <strong>Atenção:</strong> Este ranking está filtrado por um perfil específico.
                Os números de posição (#1, #2, etc.) refletem o ranking dentro deste grupo filtrado,
                baseado no total de vezes que cada funcionário ficou em 1º lugar no ranking diário geral.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-gray-600">Funcionários Ativos</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">{performances.length}</p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-green-600" />
              <p className="text-xs text-gray-600">Efetividade Média</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.mediaEfetividade}%</p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-purple-600" />
              <p className="text-xs text-gray-600">Dias Trabalhados</p>
            </div>
            <p className="text-2xl font-bold text-purple-600">{stats.totalDias}</p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              <p className="text-xs text-gray-600">Total de Horas</p>
            </div>
            <p className="text-2xl font-bold text-orange-600">{stats.totalHoras}h</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {performances.slice(0, 3).map((perf) => {
            const colors = getMedalColor(perf.ranking_posicao);
            return (
              <div
                key={perf.id}
                className={`bg-white rounded-lg p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ring-2 ring-offset-2 ${colors.ring}`}
              >
                <div className="text-center">
                  <div className="flex justify-center mb-3">
                    <div className={`bg-gradient-to-br ${colors.bg} p-4 rounded-full text-white shadow-lg`}>
                      <Medal className="w-10 h-10" />
                    </div>
                  </div>

                  <h4 className="font-bold text-gray-800 text-lg mb-1">{perf.usuario?.name}</h4>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">
                    {perf.ranking_posicao}º Lugar
                  </p>

                  <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-600 mb-1">Vezes em 1º Lugar</p>
                    <p className="text-4xl font-bold text-yellow-600">{perf.total_vezes_primeiro_lugar}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-xs text-gray-500">2º Lugares</p>
                      <p className="text-lg font-semibold text-gray-700">{perf.total_vezes_segundo_lugar}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-xs text-gray-500">3º Lugares</p>
                      <p className="text-lg font-semibold text-gray-700">{perf.total_vezes_terceiro_lugar}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2">
                      <p className="text-xs text-gray-500">Efetividade</p>
                      <p className="text-lg font-semibold text-green-600">{perf.media_efetividade}%</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2">
                      <p className="text-xs text-gray-500">Média Pontos</p>
                      <p className="text-lg font-semibold text-blue-600">{perf.media_pontos_dia.toFixed(1)}</p>
                    </div>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-purple-600" />
                        <p className="text-xs text-purple-600 font-medium">Total Pontos</p>
                      </div>
                      <p className="text-xl font-bold text-purple-600">{perf.total_pontos_mes.toFixed(1)}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {dadosGrafico.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h4 className="text-lg font-bold text-gray-800">Desempenho - Primeiros Lugares</h4>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nome" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="primeiroLugar" name="1º Lugar" fill="#FFD700">
                {dadosGrafico.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-blue-600" />
            <h4 className="text-lg font-bold text-gray-800">Ranking Completo</h4>
          </div>
          <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              <strong>Critério de Ranking:</strong> O ranking é baseado primeiramente no <strong>número de vezes que o funcionário ficou em 1º lugar</strong> no ranking diário.
              Em caso de empate, usa-se a média de pontos, depois a efetividade e por último as horas trabalhadas.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Posição</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Funcionário</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">1º Lugares</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">2º Lugares</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">3º Lugares</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Média Pontos</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Total Pontos</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Efetividade</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Dias</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Horas</th>
              </tr>
            </thead>
            <tbody>
              {performances.map((perf) => {
                const colors = getMedalColor(perf.ranking_posicao);
                return (
                  <tr key={perf.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`bg-gradient-to-br ${colors.bg} p-2 rounded-full text-white shadow-sm`}>
                          {perf.ranking_posicao <= 3 ? (
                            <Medal className="w-4 h-4" />
                          ) : (
                            <span className="text-xs font-bold">#{perf.ranking_posicao}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-gray-800">{perf.usuario?.name}</p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        {perf.total_vezes_primeiro_lugar}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                        {perf.total_vezes_segundo_lugar}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                        {perf.total_vezes_terceiro_lugar}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-semibold text-blue-600">{perf.media_pontos_dia.toFixed(1)}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-semibold text-purple-600">{perf.total_pontos_mes.toFixed(1)}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-semibold text-green-600">{perf.media_efetividade}%</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-gray-700">{perf.total_dias_trabalhados}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-gray-700">{perf.total_horas_mes.toFixed(1)}h</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMensal;
