import React from 'react';
import { Activity, Users, CheckCircle, Clock } from 'lucide-react';

interface StatsHeaderProps {
  registrosAtivos: number;
  concluidosHoje: number;
  usuariosAtivos: number;
  tempoMedio: number;
  tvMode?: boolean;
}

const StatsHeader: React.FC<StatsHeaderProps> = ({
  registrosAtivos,
  concluidosHoje,
  usuariosAtivos,
  tempoMedio,
  tvMode = false
}) => {
  const formatarTempo = (minutos: number): string => {
    if (minutos < 60) return `${minutos}min`;
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}min`;
  };

  const stats = [
    {
      label: 'Registros Ativos',
      value: registrosAtivos,
      icon: Activity,
      color: 'emerald',
      bgColor: tvMode ? 'bg-emerald-900' : 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      textColor: tvMode ? 'text-white' : 'text-gray-900',
      subTextColor: tvMode ? 'text-gray-300' : 'text-gray-600'
    },
    {
      label: 'Concluídos Hoje',
      value: concluidosHoje,
      icon: CheckCircle,
      color: 'teal',
      bgColor: tvMode ? 'bg-teal-900' : 'bg-teal-50',
      iconColor: 'text-teal-600',
      textColor: tvMode ? 'text-white' : 'text-gray-900',
      subTextColor: tvMode ? 'text-gray-300' : 'text-gray-600'
    },
    {
      label: 'Usuários Trabalhando',
      value: usuariosAtivos,
      icon: Users,
      color: 'cyan',
      bgColor: tvMode ? 'bg-cyan-900' : 'bg-cyan-50',
      iconColor: 'text-cyan-600',
      textColor: tvMode ? 'text-white' : 'text-gray-900',
      subTextColor: tvMode ? 'text-gray-300' : 'text-gray-600'
    },
    {
      label: 'Tempo Médio',
      value: formatarTempo(tempoMedio),
      icon: Clock,
      color: 'amber',
      bgColor: tvMode ? 'bg-amber-900' : 'bg-amber-50',
      iconColor: 'text-amber-600',
      textColor: tvMode ? 'text-white' : 'text-gray-900',
      subTextColor: tvMode ? 'text-gray-300' : 'text-gray-600',
      isTime: true
    }
  ];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 ${tvMode ? 'gap-8' : 'gap-4'}`}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className={`${tvMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${tvMode ? 'p-8' : 'p-6'} border ${
              tvMode ? 'border-gray-700' : 'border-gray-100'
            } transition-smooth hover-lift`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 ${stat.bgColor} rounded-lg`}>
                <Icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
              {registrosAtivos > 0 && index === 0 && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600 font-medium">LIVE</span>
                </div>
              )}
            </div>
            <div>
              <h3 className={`text-3xl font-bold ${stat.textColor} mb-1`}>
                {stat.value}
              </h3>
              <p className={`text-sm ${stat.subTextColor}`}>{stat.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsHeader;
