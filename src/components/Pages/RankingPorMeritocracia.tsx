import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Trophy, Filter, Users } from 'lucide-react';
import PerformanceDiaria from '../Dashboard/PerformanceDiaria';
import PerformanceMensal from '../Dashboard/PerformanceMensal';
import { getBrazilDateString, getBrazilDate } from '../../utils/dateUtils';

const RankingPorMeritocracia: React.FC = () => {
  const { empresa } = useAuth();
  const [selectedPerfilFilter, setSelectedPerfilFilter] = useState<string | undefined>(undefined);

  const perfis = [
    { value: undefined, label: 'Todos os Perfis' },
    { value: 'camararia', label: 'Camararia' },
    { value: 'recepcao', label: 'Recepção' },
    { value: 'revisao', label: 'Revisão' },
    { value: 'areas_comuns', label: 'Áreas Comuns' },
    { value: 'gestao', label: 'Gestão' },
    { value: 'cozinha', label: 'Cozinha' },
    { value: 'vendas', label: 'Vendas' },
    { value: 'atividades_diarias', label: 'Atividades Diárias' },
    { value: 'atividades_extras', label: 'Atividades Extras' }
  ];

  if (!empresa?.id) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Carregando dados da empresa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Ranking por Meritocracia
            </h1>
            <p className="text-sm text-gray-600">
              Sistema de avaliação baseado em performance e resultados
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <select
              value={selectedPerfilFilter || ''}
              onChange={(e) => setSelectedPerfilFilter(e.target.value || undefined)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {perfis.map((perfil) => (
                <option key={perfil.value || 'all'} value={perfil.value || ''}>
                  {perfil.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Users className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-purple-900 mb-2">
              Sobre o Sistema de Meritocracia
            </h3>
            <p className="text-sm text-purple-800 mb-2">
              O ranking por meritocracia avalia o desempenho dos funcionários com base em critérios objetivos de produtividade, efetividade e qualidade do trabalho realizado.
            </p>
            <ul className="text-sm text-purple-700 space-y-1 list-disc list-inside">
              <li>Rankings atualizados automaticamente com base nas atividades concluídas</li>
              <li>Pontuação calculada considerando quantidade, qualidade e prazos</li>
              <li>Visão diária e mensal consolidada para análise de tendências</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <PerformanceDiaria
            empresaId={empresa.id}
            perfil={selectedPerfilFilter}
          />
        </div>

        <div>
          <PerformanceMensal
            empresaId={empresa.id}
            perfil={selectedPerfilFilter}
          />
        </div>
      </div>
    </div>
  );
};

export default RankingPorMeritocracia;
