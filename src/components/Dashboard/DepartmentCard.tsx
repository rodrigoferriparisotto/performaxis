import React from 'react';
import { Clock, TrendingUp, Users, ChevronRight } from 'lucide-react';
import { DepartmentData, UsuarioAtivo } from '../../types/dashboard';

interface DepartmentCardProps {
  department: DepartmentData;
  onClickUsuario: (usuario: UsuarioAtivo) => void;
  tvMode?: boolean;
}

const DepartmentCard: React.FC<DepartmentCardProps> = ({
  department,
  onClickUsuario,
  tvMode = false
}) => {
  const getTempoColor = (minutos: number) => {
    if (minutos < 120) return tvMode ? 'text-green-400' : 'text-green-600';
    if (minutos < 240) return tvMode ? 'text-yellow-400' : 'text-yellow-600';
    return tvMode ? 'text-red-400' : 'text-red-600';
  };

  const formatarTempo = (minutos: number): string => {
    if (minutos < 60) return `${minutos}min`;
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h${mins > 0 ? ` ${mins}min` : ''}`;
  };

  return (
    <div
      className={`${tvMode ? 'bg-gray-700' : 'bg-white'} rounded-lg border-2 p-4 transition-all hover:shadow-lg`}
      style={{ borderColor: department.cor }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div
            className="w-3 h-3 rounded-full animate-pulse"
            style={{ backgroundColor: department.cor }}
          ></div>
          <h3 className={`font-bold ${tvMode ? 'text-white' : 'text-gray-900'}`}>
            {department.nome}
          </h3>
        </div>
        <span
          className="px-3 py-1 rounded-full text-sm font-semibold text-white"
          style={{ backgroundColor: department.cor }}
        >
          {department.atividadesEmAndamento}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className={`p-2 rounded-lg ${tvMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <p className={`text-xs ${tvMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Progresso Médio</p>
          <p className={`text-lg font-bold ${tvMode ? 'text-white' : 'text-gray-900'}`}>
            {department.progresso}%
          </p>
        </div>
        <div className={`p-2 rounded-lg ${tvMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <p className={`text-xs ${tvMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Tempo Médio</p>
          <p className={`text-lg font-bold ${getTempoColor(department.tempoMedio)}`}>
            {formatarTempo(department.tempoMedio)}
          </p>
        </div>
      </div>

      <div className={`border-t ${tvMode ? 'border-gray-600' : 'border-gray-200'} pt-3`}>
        <div className="flex items-center space-x-2 mb-3">
          <Users className={`w-4 h-4 ${tvMode ? 'text-gray-400' : 'text-gray-600'}`} />
          <span className={`text-sm font-medium ${tvMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Colaboradores Ativos
          </span>
        </div>

        <div className="space-y-2">
          {department.usuarios.map((usuario) => (
            <button
              key={usuario.registroId}
              onClick={() => onClickUsuario(usuario)}
              className={`w-full p-3 rounded-lg ${
                tvMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-gray-50 hover:bg-gray-100'
              } transition-colors group`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 text-left min-w-0">
                  <p className={`font-medium ${tvMode ? 'text-white' : 'text-gray-900'} text-sm`}>
                    {usuario.nome}
                  </p>
                  {usuario.descricaoAtividade && (
                    <p className={`text-xs ${tvMode ? 'text-gray-400' : 'text-gray-600'} mt-0.5 truncate`}>
                      {usuario.descricaoAtividade}
                    </p>
                  )}
                  <div className="flex items-center space-x-2 mt-1">
                    <div className={`flex-1 h-1.5 ${tvMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${usuario.progresso}%`,
                          backgroundColor: department.cor
                        }}
                      ></div>
                    </div>
                    <span className={`text-xs ${tvMode ? 'text-gray-400' : 'text-gray-600'} whitespace-nowrap`}>
                      {usuario.atividadesCompletas}/{usuario.totalAtividades}
                    </span>
                  </div>
                </div>
                <div className="ml-3 flex items-center space-x-2 flex-shrink-0">
                  <div className="text-right">
                    <p className={`text-xs ${getTempoColor(usuario.tempoDecorrido)} font-semibold`}>
                      {formatarTempo(usuario.tempoDecorrido)}
                    </p>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${tvMode ? 'text-gray-500' : 'text-gray-400'} group-hover:translate-x-1 transition-transform`} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DepartmentCard;
