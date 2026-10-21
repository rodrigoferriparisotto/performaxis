import React, { useState } from 'react';
import { 
  Moon, 
  Plus,
  History
} from 'lucide-react';
import NovoRegistroAtividadesDiarias from './NovoRegistroAtividadesDiarias';
import HistoricoAtividadesDiarias from './HistoricoAtividadesDiarias';
import { PageHeader } from '../ui/PageHeader';
import { ModuleTabs } from '../ui/ModuleTabs';

const AtividadesDiarias: React.FC = () => {
  const [activeTab, setActiveTab] = useState('novo-registro');

  const tabs = [
    { id: 'novo-registro', label: 'Novo Registro', icon: Plus },
    { id: 'historico', label: 'Histórico', icon: History }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'novo-registro':
        return <NovoRegistroAtividadesDiarias />;
      case 'historico':
        return <HistoricoAtividadesDiarias />;
      default:
        return <NovoRegistroAtividadesDiarias />;
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader titulo="Atividades Diárias" subtitulo="Gerencie os registros de atividades diárias" />

      <ModuleTabs modulo="atividades_diarias" abas={tabs} ativa={activeTab} onChange={setActiveTab} />

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
};

export default AtividadesDiarias;