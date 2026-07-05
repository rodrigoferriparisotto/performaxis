import React from 'react';
import { Trophy, Medal, Award, Zap, Crown } from 'lucide-react';

interface RankingPanelProps {
  ranking: Array<{
    usuario: { id: string; name: string; profile: string };
    totalConcluidos: number;
    tempoTotal?: number;
    tempoMedio?: number;
  }>;
  tvMode?: boolean;
}

const RankingPanel: React.FC<RankingPanelProps> = ({ ranking, tvMode = false }) => {
  const topRanking = ranking.slice(0, 5);

  const getMedalIcon = (position: number) => {
    switch (position) {
      case 0:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 1:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <Award className="w-5 h-5 text-blue-500" />;
    }
  };

  const getPositionColor = (position: number) => {
    switch (position) {
      case 0:
        return tvMode ? 'bg-yellow-900/30 border-yellow-600' : 'bg-yellow-50 border-yellow-200';
      case 1:
        return tvMode ? 'bg-gray-700/30 border-gray-500' : 'bg-gray-50 border-gray-200';
      case 2:
        return tvMode ? 'bg-amber-900/30 border-amber-600' : 'bg-amber-50 border-amber-200';
      default:
        return tvMode ? 'bg-gray-700/20 border-gray-600' : 'bg-white border-gray-100';
    }
  };

  const formatarTempo = (minutos: number): string => {
    if (minutos < 60) return `${minutos}min`;
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}min`;
  };

  return (
    <div className={`${tvMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
      <div className="flex items-center space-x-3 mb-6">
        <div className={`p-2 ${tvMode ? 'bg-gray-700' : 'bg-yellow-50'} rounded-lg`}>
          <Trophy className="w-5 h-5 text-yellow-600" />
        </div>
        <h2 className={`text-xl font-bold ${tvMode ? 'text-white' : 'text-gray-900'}`}>
          Ranking do Dia
        </h2>
      </div>

      {topRanking.length > 0 ? (
        <div className="space-y-3">
          {topRanking.map((item, index) => (
            <div
              key={item.usuario.id}
              className={`p-4 rounded-lg border-2 ${getPositionColor(index)} transition-all hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="flex-shrink-0">
                    {getMedalIcon(index)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold ${tvMode ? 'text-white' : 'text-gray-900'} truncate`}>
                      {item.usuario.name}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        tvMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {item.totalConcluidos} concluídos
                      </span>
                      {(item.tempoTotal !== undefined && item.tempoTotal > 0) && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          tvMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-50 text-blue-600'
                        } flex items-center space-x-1`}>
                          <Zap className="w-3 h-3" />
                          <span>{formatarTempo(item.tempoTotal)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-3">
                  <div className={`text-2xl font-bold ${
                    index === 0 ? 'text-yellow-600' :
                    index === 1 ? 'text-gray-500' :
                    index === 2 ? 'text-amber-600' :
                    tvMode ? 'text-gray-400' : 'text-blue-600'
                  }`}>
                    #{index + 1}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Trophy className={`w-12 h-12 mx-auto mb-3 ${tvMode ? 'text-gray-600' : 'text-gray-300'}`} />
          <p className={`${tvMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Nenhum registro concluído hoje
          </p>
        </div>
      )}

      {ranking.length > 5 && (
        <div className={`mt-4 pt-4 border-t ${tvMode ? 'border-gray-700' : 'border-gray-200'} text-center`}>
          <p className={`text-sm ${tvMode ? 'text-gray-400' : 'text-gray-600'}`}>
            +{ranking.length - 5} colaboradores no ranking
          </p>
        </div>
      )}
    </div>
  );
};

export default RankingPanel;
