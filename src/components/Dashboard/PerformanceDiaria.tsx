import React, { useEffect, useState } from 'react';
import { Trophy, Star, Target, Clock, Award, Medal, CalendarDays, RotateCcw, Info, CheckCircle2, Users, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getBrazilDateString, subtractDaysBrazil } from '../../utils/dateUtils';

interface PerformanceDiariaProps {
  empresaId: string;
  perfil?: string;
}

interface PerformanceData {
  id: string;
  usuario_id: string;
  empresa_id: string;
  data: string;
  total_atividades_programadas: number;
  total_atividades_realizadas: number;
  percentual_efetividade: number;
  pontos_dia: number;
  total_horas_trabalhadas: number;
  ranking_dia: number;
  usuario?: {
    name: string;
  };
}

const PerformanceDiaria: React.FC<PerformanceDiariaProps> = ({ empresaId, perfil }) => {
  const [performances, setPerformances] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSelecionada, setDataSelecionada] = useState<string>(getBrazilDateString());
  const [inputDataValue, setInputDataValue] = useState<string>(getBrazilDateString());

  useEffect(() => {
    carregarPerformances();
  }, [empresaId, dataSelecionada, perfil]);

  useEffect(() => {
    setInputDataValue(dataSelecionada);
  }, [dataSelecionada]);

  const carregarPerformances = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('performance_diaria')
        .select(`
          *,
          usuario:usuarios(name, profile)
        `)
        .eq('empresa_id', empresaId)
        .eq('data', dataSelecionada);

      const { data, error } = await query.order('ranking_dia', { ascending: true });

      if (error) throw error;

      let performances = data || [];

      if (perfil && performances.length > 0) {
        performances = performances.filter((p: any) => p.usuario?.profile === perfil);
      }

      setPerformances(performances);
    } catch (error) {
      console.error('Erro ao carregar performances:', error);
      setPerformances([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputDataValue(e.target.value);
  };

  const handleBuscarData = () => {
    const dataMinima = subtractDaysBrazil(31);
    const dataMaxima = getBrazilDateString();

    if (inputDataValue && inputDataValue >= dataMinima && inputDataValue <= dataMaxima) {
      setDataSelecionada(inputDataValue);
    } else {
      setInputDataValue(dataSelecionada);
    }
  };

  const voltarParaHoje = () => {
    const hoje = getBrazilDateString();
    setDataSelecionada(hoje);
    setInputDataValue(hoje);
  };

  const dataMinima = subtractDaysBrazil(31);
  const dataMaxima = getBrazilDateString();

  const getMedalColor = (ranking: number) => {
    switch (ranking) {
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

  const renderEstrelasPoments = (pontos: number) => {
    const estrelasCheias = Math.floor(pontos);
    const temMeia = pontos % 1 >= 0.5;
    const stars = [];

    for (let i = 0; i < estrelasCheias; i++) {
      stars.push(<Star key={`full-${i}`} className="w-5 h-5 fill-yellow-400 text-yellow-400" />);
    }

    if (temMeia) {
      stars.push(<Star key="half" className="w-5 h-5 fill-yellow-400 text-yellow-400 opacity-50" />);
    }

    return stars;
  };

  const calcularEstatisticasGerais = () => {
    if (performances.length === 0) return { mediaEfetividade: 0, totalAtividades: 0, totalHoras: 0 };

    const mediaEfetividade = performances.reduce((acc, p) => acc + p.percentual_efetividade, 0) / performances.length;
    const totalAtividades = performances.reduce((acc, p) => acc + p.total_atividades_realizadas, 0);
    const totalHoras = performances.reduce((acc, p) => acc + p.total_horas_trabalhadas, 0);

    return {
      mediaEfetividade: Math.round(mediaEfetividade * 10) / 10,
      totalAtividades,
      totalHoras: Math.round(totalHoras * 10) / 10
    };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <h3 className="text-xl font-bold text-gray-800">Ranking Diário</h3>
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
            <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 p-3 rounded-lg">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">Ranking Diário</h3>
              <p className="text-sm text-gray-600">
                {new Date(dataSelecionada).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg shadow-sm px-4 py-2 border border-gray-200">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              <input
                type="date"
                value={inputDataValue}
                onChange={handleDataChange}
                min={dataMinima}
                max={dataMaxima}
                className="border-none outline-none text-sm text-gray-700 font-medium cursor-pointer bg-transparent"
              />
            </div>
            <button
              onClick={handleBuscarData}
              disabled={loading || inputDataValue === dataSelecionada}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-sm hover:shadow-md hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Search className="w-4 h-4" />
              )}
              Buscar
            </button>
          </div>
        </div>

        <div className="text-center py-12">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Nenhum registro finalizado nesta data</p>
          <p className="text-gray-400 text-sm mt-2">Os rankings serão calculados após a conclusão dos registros</p>
        </div>
      </div>
    );
  }

  const stats = calcularEstatisticasGerais();

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 p-3 rounded-lg">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">Ranking Diário</h3>
            <p className="text-sm text-gray-600">
              {new Date(dataSelecionada).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm px-4 py-2 border border-gray-200">
            <CalendarDays className="w-5 h-5 text-blue-600" />
            <input
              type="date"
              value={inputDataValue}
              onChange={handleDataChange}
              min={dataMinima}
              max={dataMaxima}
              className="border-none outline-none text-sm text-gray-700 font-medium cursor-pointer bg-transparent"
            />
          </div>

          <button
            onClick={handleBuscarData}
            disabled={loading || inputDataValue === dataSelecionada}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-sm hover:shadow-md hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Search className="w-4 h-4" />
            )}
            Buscar
          </button>

          {dataSelecionada !== getBrazilDateString() && (
            <button
              onClick={voltarParaHoje}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg shadow-sm hover:shadow-md hover:from-green-600 hover:to-green-700 transition-all duration-200 text-sm font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              Hoje
            </button>
          )}

          <div className="text-right bg-white rounded-lg shadow-sm px-4 py-2 border border-gray-200">
            <p className="text-xs text-gray-600">Funcionários</p>
            <p className="text-xl font-bold text-gray-800">{performances.length}</p>
          </div>
        </div>
      </div>

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
            <CheckCircle2 className="w-4 h-4 text-purple-600" />
            <p className="text-xs text-gray-600">Atividades Realizadas</p>
          </div>
          <p className="text-2xl font-bold text-purple-600">{stats.totalAtividades}</p>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-orange-600" />
            <p className="text-xs text-gray-600">Total de Horas</p>
          </div>
          <p className="text-2xl font-bold text-orange-600">{stats.totalHoras}h</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {performances.map((perf) => {
          const colors = getMedalColor(perf.ranking_dia);
          return (
            <div
              key={perf.id}
              className={`bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
                perf.ranking_dia <= 3 ? `ring-2 ring-offset-2 ${colors.ring}` : ''
              }`}
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`bg-gradient-to-br ${colors.bg} p-3 rounded-full text-white font-bold shadow-lg`}>
                      {perf.ranking_dia <= 3 ? (
                        <Medal className="w-7 h-7" />
                      ) : (
                        <span className="text-lg">#{perf.ranking_dia}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-lg">
                        {perf.usuario?.name || 'Funcionário'}
                      </h4>
                      <div className="flex items-center gap-1 mt-1">
                        {renderEstrelasPoments(perf.pontos_dia)}
                        <span className="text-xs text-gray-500 ml-1">({perf.pontos_dia} pts)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 mb-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600 mb-1">Efetividade</p>
                    <p className="text-4xl font-bold text-green-600">{perf.percentual_efetividade}%</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-600">Atividades</span>
                    </div>
                    <span className="font-semibold text-gray-800">
                      {perf.total_atividades_realizadas}/{perf.total_atividades_programadas}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-gray-600">Horas Trabalhadas</span>
                    </div>
                    <span className="font-semibold text-blue-600">
                      {perf.total_horas_trabalhadas.toFixed(1)}h
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          perf.percentual_efetividade >= 90 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                          perf.percentual_efetividade >= 80 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                          perf.percentual_efetividade >= 70 ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                          'bg-gradient-to-r from-red-500 to-red-600'
                        }`}
                        style={{ width: `${Math.min(perf.percentual_efetividade, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {performances.length >= 3 && (
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Pódio do Dia
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {performances.slice(0, 3).map((perf) => {
              const colors = getMedalColor(perf.ranking_dia);
              return (
                <div
                  key={perf.id}
                  className={`text-center p-6 rounded-lg ${
                    perf.ranking_dia === 1 ? 'bg-gradient-to-br from-yellow-50 to-yellow-100' :
                    perf.ranking_dia === 2 ? 'bg-gradient-to-br from-gray-50 to-gray-100' :
                    'bg-gradient-to-br from-orange-50 to-orange-100'
                  }`}
                >
                  <div className="flex justify-center mb-3">
                    <div className={`bg-gradient-to-br ${colors.bg} p-4 rounded-full text-white shadow-lg`}>
                      <Medal className="w-10 h-10" />
                    </div>
                  </div>
                  <p className="font-bold text-gray-800 text-lg mb-1">{perf.usuario?.name}</p>
                  <p className="text-4xl font-bold text-green-600 my-3">{perf.percentual_efetividade}%</p>
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {renderEstrelasPoments(perf.pontos_dia)}
                  </div>
                  <p className="text-sm text-gray-600">{perf.total_atividades_realizadas} atividades • {perf.total_horas_trabalhadas.toFixed(1)}h</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceDiaria;
