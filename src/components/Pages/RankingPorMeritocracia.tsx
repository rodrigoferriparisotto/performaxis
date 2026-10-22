import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Filter, Users } from 'lucide-react';
import PerformanceDiaria from '../Dashboard/PerformanceDiaria';
import PerformanceMensal from '../Dashboard/PerformanceMensal';
import { PageHeader } from '../ui/PageHeader';
import { LoadingState } from '../ui/Estados';

const RankingPorMeritocracia: React.FC = () => {
  const { empresa } = useAuth();
  const [selectedPerfilFilter, setSelectedPerfilFilter] = useState<string | undefined>(undefined);

  const perfis = [
    { value: undefined, label: 'Todos os Perfis' },
    { value: 'camararia', label: 'Governança' },
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
    return <LoadingState texto="Carregando dados da empresa..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Ranking por Meritocracia"
        subtitulo="Sistema de avaliação baseado em performance e resultados"
        acoes={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-5 h-5 text-gray-600 flex-shrink-0" />
            <select
              value={selectedPerfilFilter || ''}
              onChange={(e) => setSelectedPerfilFilter(e.target.value || undefined)}
              className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {perfis.map((perfil) => (
                <option key={perfil.value || 'all'} value={perfil.value || ''}>
                  {perfil.label}
                </option>
              ))}
            </select>
          </div>
        }
      />

      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 sm:p-6">
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
