import React from 'react';
import { Target, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { DashboardService } from '../../services/dashboardService';

interface GoalsPanelProps {
  metas: Array<{
    id: string;
    departamento: string;
    meta_registros: number;
    registros_concluidos: number;
    progresso: number;
  }>;
  tvMode?: boolean;
}

const GoalsPanel: React.FC<GoalsPanelProps> = ({ metas, tvMode = false }) => {
  const totalMeta = metas.reduce((acc, m) => acc + m.meta_registros, 0);
  const totalConcluido = metas.reduce((acc, m) => acc + m.registros_concluidos, 0);
  const progressoGeral = totalMeta > 0 ? Math.round((totalConcluido / totalMeta) * 100) : 0;

  const getProgressoColor = (progresso: number) => {
    if (progresso >= 100) return tvMode ? 'text-green-400' : 'text-green-600';
    if (progresso >= 75) return tvMode ? 'text-blue-400' : 'text-blue-600';
    if (progresso >= 50) return tvMode ? 'text-yellow-400' : 'text-yellow-600';
    return tvMode ? 'text-red-400' : 'text-red-600';
  };

  const getProgressoBarColor = (progresso: number) => {
    if (progresso >= 100) return '#10B981';
    if (progresso >= 75) return '#3B82F6';
    if (progresso >= 50) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div className={`${tvMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
      <div className="flex items-center space-x-3 mb-6">
        <div className={`p-2 ${tvMode ? 'bg-gray-700' : 'bg-green-50'} rounded-lg`}>
          <Target className="w-5 h-5 text-green-600" />
        </div>
        <h2 className={`text-xl font-bold ${tvMode ? 'text-white' : 'text-gray-900'}`}>
          Metas do Dia
        </h2>
      </div>

      {metas.length > 0 ? (
        <>
          <div className={`p-5 rounded-lg ${tvMode ? 'bg-gray-700' : 'bg-gradient-to-r from-green-50 to-blue-50'} mb-6`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className={`text-sm ${tvMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>
                  Progresso Geral
                </p>
                <p className={`text-3xl font-bold ${getProgressoColor(progressoGeral)}`}>
                  {progressoGeral}%
                </p>
              </div>
              <div className="text-right">
                {progressoGeral >= 100 ? (
                  <CheckCircle className="w-12 h-12 text-green-500" />
                ) : (
                  <TrendingUp className={`w-12 h-12 ${getProgressoColor(progressoGeral)}`} />
                )}
              </div>
            </div>

            <div className={`w-full h-3 ${tvMode ? 'bg-gray-800' : 'bg-white'} rounded-full overflow-hidden mb-2`}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(progressoGeral, 100)}%`,
                  backgroundColor: getProgressoBarColor(progressoGeral)
                }}
              ></div>
            </div>

            <p className={`text-sm ${tvMode ? 'text-gray-300' : 'text-gray-600'} text-center`}>
              {totalConcluido} de {totalMeta} registros concluídos
            </p>
          </div>

          <div className="space-y-3">
            <h3 className={`text-sm font-semibold ${tvMode ? 'text-gray-300' : 'text-gray-700'} mb-3`}>
              Metas por Departamento
            </h3>

            {metas.map((meta) => {
              const cor = DashboardService.getDepartamentoCor(meta.departamento);
              return (
                <div
                  key={meta.id}
                  className={`p-3 rounded-lg ${tvMode ? 'bg-gray-700' : 'bg-gray-50'} border ${
                    tvMode ? 'border-gray-600' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cor }}
                      ></div>
                      <span className={`text-sm font-medium ${tvMode ? 'text-white' : 'text-gray-900'}`}>
                        {DashboardService.getDepartamentoNome(meta.departamento)}
                      </span>
                    </div>
                    <span className={`text-sm font-bold ${getProgressoColor(meta.progresso)}`}>
                      {meta.progresso}%
                    </span>
                  </div>

                  <div className={`w-full h-2 ${tvMode ? 'bg-gray-800' : 'bg-gray-200'} rounded-full overflow-hidden mb-2`}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(meta.progresso, 100)}%`,
                        backgroundColor: cor
                      }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${tvMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {meta.registros_concluidos}/{meta.meta_registros} registros
                    </span>
                    {meta.progresso >= 100 && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <AlertCircle className={`w-12 h-12 mx-auto mb-3 ${tvMode ? 'text-gray-600' : 'text-gray-300'}`} />
          <p className={`${tvMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
            Nenhuma meta definida para hoje
          </p>
          <p className={`text-sm ${tvMode ? 'text-gray-500' : 'text-gray-500'}`}>
            Configure as metas diárias no painel administrativo
          </p>
        </div>
      )}
    </div>
  );
};

export default GoalsPanel;
