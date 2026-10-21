import React, { useState } from 'react';
import { 
  Phone, 
  Plus,
  History,
  Calendar,
  Clock
} from 'lucide-react';
import NovoRegistroRecepcao from './NovoRegistroRecepcao';
import HistoricoRecepcao from './HistoricoRecepcao';
import { PageHeader } from '../ui/PageHeader';
import { ModuleTabs } from '../ui/ModuleTabs';

const Recepcao: React.FC = () => {
  const [activeTab, setActiveTab] = useState('novo-registro');

  const tabs = [
    { id: 'novo-registro', label: 'Novo Registro', icon: Plus },
    { id: 'historico', label: 'Histórico', icon: History }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'novo-registro':
        return <NovoRegistroRecepcao />;
      case 'historico':
        return <HistoricoRecepcao />;
      default:
        return <NovoRegistroRecepcao />;
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader titulo="Recepção" subtitulo="Gerencie os registros diários da recepção" />

      <ModuleTabs modulo="recepcao" abas={tabs} ativa={activeTab} onChange={setActiveTab} />

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
};

export default Recepcao;