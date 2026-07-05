import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getBrazilDateString, subtractDaysBrazil, getBrazilDate } from '../../utils/dateUtils';

interface HistoricalComparisonProps {
  historicData: { [date: string]: number };
  tvMode?: boolean;
}

const HistoricalComparison: React.FC<HistoricalComparisonProps> = ({
  historicData,
  tvMode = false
}) => {
  const { hoje, ontem, media7Dias, variacao, tendencia, chartData } = useMemo(() => {
    const dates = Object.keys(historicData).sort().reverse();
    const today = getBrazilDateString();
    const yesterday = subtractDaysBrazil(1);

    const hojeValue = historicData[today] || 0;
    const ontemValue = historicData[yesterday] || 0;

    const last7Days = Array.from({ length: 7 }, (_, i) =>
      subtractDaysBrazil(i)
    );
    const sum7 = last7Days.reduce((acc, date) => acc + (historicData[date] || 0), 0);
    const avg7 = Math.round(sum7 / 7);

    const diff = hojeValue - ontemValue;
    const percentChange = ontemValue > 0 ? Math.round((diff / ontemValue) * 100) : 0;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (percentChange > 5) trend = 'up';
    else if (percentChange < -5) trend = 'down';

    const chart = last7Days.reverse().map(date => ({
      date: format(parseISO(date), 'dd/MM', { locale: ptBR }),
      value: historicData[date] || 0
    }));

    return {
      hoje: hojeValue,
      ontem: ontemValue,
      media7Dias: avg7,
      variacao: percentChange,
      tendencia: trend,
      chartData: chart
    };
  }, [historicData]);

  const getTrendIcon = () => {
    if (tendencia === 'up') return <TrendingUp className="w-5 h-5 text-green-500" />;
    if (tendencia === 'down') return <TrendingDown className="w-5 h-5 text-red-500" />;
    return <Minus className="w-5 h-5 text-gray-500" />;
  };

  const getTrendColor = () => {
    if (tendencia === 'up') return 'text-green-600';
    if (tendencia === 'down') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className={`${tvMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`p-2 ${tvMode ? 'bg-gray-700' : 'bg-blue-50'} rounded-lg`}>
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className={`text-xl font-bold ${tvMode ? 'text-white' : 'text-gray-900'}`}>
            Comparação Histórica
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          {getTrendIcon()}
          <span className={`text-2xl font-bold ${getTrendColor()}`}>
            {variacao > 0 ? '+' : ''}{variacao}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`p-4 rounded-lg ${tvMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
          <p className={`text-sm ${tvMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>Hoje</p>
          <p className={`text-2xl font-bold ${tvMode ? 'text-white' : 'text-gray-900'}`}>{hoje}</p>
        </div>

        <div className={`p-4 rounded-lg ${tvMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <p className={`text-sm ${tvMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>Ontem</p>
          <p className={`text-2xl font-bold ${tvMode ? 'text-white' : 'text-gray-900'}`}>{ontem}</p>
        </div>

        <div className={`p-4 rounded-lg ${tvMode ? 'bg-gray-700' : 'bg-green-50'}`}>
          <p className={`text-sm ${tvMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>Média 7 dias</p>
          <p className={`text-2xl font-bold ${tvMode ? 'text-white' : 'text-gray-900'}`}>{media7Dias}</p>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={tvMode ? '#374151' : '#e5e7eb'} />
            <XAxis
              dataKey="date"
              stroke={tvMode ? '#9CA3AF' : '#6B7280'}
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke={tvMode ? '#9CA3AF' : '#6B7280'}
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: tvMode ? '#1F2937' : '#FFFFFF',
                border: `1px solid ${tvMode ? '#374151' : '#E5E7EB'}`,
                borderRadius: '8px',
                color: tvMode ? '#FFFFFF' : '#1F2937'
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3B82F6"
              strokeWidth={3}
              dot={{ fill: '#3B82F6', r: 4 }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default HistoricalComparison;
