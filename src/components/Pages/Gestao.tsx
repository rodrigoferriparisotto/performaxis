import React, { useState } from 'react';
import { 
  Briefcase, 
  Plus,
  History
} from 'lucide-react';
import NovoRegistroGestao from './NovoRegistroGestao';
import HistoricoGestao from './HistoricoGestao';
import { PageHeader } from '../ui/PageHeader';
import { ModuleTabs } from '../ui/ModuleTabs';

const Gestao: React.FC = () => {
  const [activeTab, setActiveTab] = useState('novo-registro');

  const tabs = [
    { id: 'novo-registro', label: 'Novo Registro', icon: Plus },
    { id: 'historico', label: 'Histórico', icon: History }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'novo-registro':
        return <NovoRegistroGestao />;
      case 'historico':
        return <HistoricoGestao />;
      default:
        return <NovoRegistroGestao />;
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader titulo="Gestão" subtitulo="Gerencie os registros de atividades de gestão" />

      <ModuleTabs modulo="gestao" abas={tabs} ativa={activeTab} onChange={setActiveTab} />

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
};

export default Gestao;