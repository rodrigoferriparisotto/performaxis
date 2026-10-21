import React, { useState } from 'react';
import { 
  CheckCircle, 
  Plus,
  History
} from 'lucide-react';
import NovoRegistroRevisao from './NovoRegistroRevisao';
import HistoricoRevisao from './HistoricoRevisao';
import { PageHeader } from '../ui/PageHeader';
import { ModuleTabs } from '../ui/ModuleTabs';

const Revisao: React.FC = () => {
  const [activeTab, setActiveTab] = useState('novo-registro');

  const tabs = [
    { id: 'novo-registro', label: 'Novo Registro', icon: Plus },
    { id: 'historico', label: 'Histórico', icon: History }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'novo-registro':
        return <NovoRegistroRevisao />;
      case 'historico':
        return <HistoricoRevisao />;
      default:
        return <NovoRegistroRevisao />;
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader titulo="Revisão" subtitulo="Gerencie os registros de revisão das suítes" />

      <ModuleTabs modulo="revisao" abas={tabs} ativa={activeTab} onChange={setActiveTab} />

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
};

export default Revisao;