import React, { useState } from 'react';
import { 
  Wrench,
  Plus,
  Settings,
  History
} from 'lucide-react';
import NovoRegistroManutencao from './NovoRegistroManutencao';
import ManutencoesPendentes from './ManutencoesPendentes';
import HistoricoManutencao from './HistoricoManutencao';
import { PageHeader } from '../ui/PageHeader';
import { ModuleTabs } from '../ui/ModuleTabs';

const Manutencao: React.FC<{ abaInicial?: 'novo-registro' | 'manutencoes' | 'historico' }> = ({ abaInicial }) => {
  const [activeTab, setActiveTab] = useState<string>(abaInicial ?? 'novo-registro');

  const tabs = [
    { id: 'novo-registro', label: 'Novo Registro', icon: Plus },
    { id: 'manutencoes', label: 'Manutenções', icon: Settings },
    { id: 'historico', label: 'Histórico', icon: History }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'novo-registro':
        return <NovoRegistroManutencao />;
      case 'manutencoes':
        return <ManutencoesPendentes />;
      case 'historico':
        return <HistoricoManutencao />;
      default:
        return <NovoRegistroManutencao />;
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader titulo="Manutenção" subtitulo="Gerencie as manutenções do estabelecimento" />

      <ModuleTabs modulo="manutencao" abas={tabs} ativa={activeTab} onChange={setActiveTab} />

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
};

export default Manutencao;