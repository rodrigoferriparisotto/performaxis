import React, { useState } from 'react';
import { 
  Sun, 
  Plus,
  History
} from 'lucide-react';
import NovoRegistroAtividadesExtras from './NovoRegistroAtividadesExtras';
import HistoricoAtividadesExtras from './HistoricoAtividadesExtras';
import { PageHeader } from '../ui/PageHeader';
import { ModuleTabs } from '../ui/ModuleTabs';

const AtividadesExtras: React.FC = () => {
  const [activeTab, setActiveTab] = useState('novo-registro');

  const tabs = [
    { id: 'novo-registro', label: 'Novo Registro', icon: Plus },
    { id: 'historico', label: 'Histórico', icon: History }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'novo-registro':
        return <NovoRegistroAtividadesExtras />;
      case 'historico':
        return <HistoricoAtividadesExtras />;
      default:
        return <NovoRegistroAtividadesExtras />;
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader titulo="Atividades Extras" subtitulo="Gerencie os registros de atividades extras" />

      <ModuleTabs modulo="atividades_extras" abas={tabs} ativa={activeTab} onChange={setActiveTab} />

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
};

export default AtividadesExtras;