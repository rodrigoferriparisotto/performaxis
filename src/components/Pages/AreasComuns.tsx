import React, { useState } from 'react';
import { 
  Building, 
  Plus,
  History
} from 'lucide-react';
import NovoRegistroAreasComuns from './NovoRegistroAreasComuns';
import HistoricoAreasComuns from './HistoricoAreasComuns';
import { PageHeader } from '../ui/PageHeader';
import { ModuleTabs } from '../ui/ModuleTabs';

const AreasComuns: React.FC = () => {
  const [activeTab, setActiveTab] = useState('novo-registro');

  const tabs = [
    { id: 'novo-registro', label: 'Novo Registro', icon: Plus },
    { id: 'historico', label: 'Histórico', icon: History }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'novo-registro':
        return <NovoRegistroAreasComuns />;
      case 'historico':
        return <HistoricoAreasComuns />;
      default:
        return <NovoRegistroAreasComuns />;
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader titulo="Áreas Comuns" subtitulo="Gerencie os registros de limpeza e manutenção das áreas comuns" />

      <ModuleTabs modulo="areas_comuns" abas={tabs} ativa={activeTab} onChange={setActiveTab} />

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
};

export default AreasComuns;