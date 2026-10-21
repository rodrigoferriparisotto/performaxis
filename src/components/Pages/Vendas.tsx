import React, { useState } from 'react';
import {
  ShoppingBag,
  Plus,
  History
} from 'lucide-react';
import NovoRegistroVendas from './NovoRegistroVendas';
import HistoricoVendas from './HistoricoVendas';
import { PageHeader } from '../ui/PageHeader';
import { ModuleTabs } from '../ui/ModuleTabs';

const Vendas: React.FC = () => {
  const [activeTab, setActiveTab] = useState('novo-registro');

  const tabs = [
    { id: 'novo-registro', label: 'Novo Registro', icon: Plus },
    { id: 'historico', label: 'Histórico', icon: History }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'novo-registro':
        return <NovoRegistroVendas />;
      case 'historico':
        return <HistoricoVendas />;
      default:
        return <NovoRegistroVendas />;
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader titulo="Vendas" subtitulo="Gerencie os registros de atividades comerciais e vendas" />

      <ModuleTabs modulo="vendas" abas={tabs} ativa={activeTab} onChange={setActiveTab} />

      {renderTabContent()}
    </div>
  );
};

export default Vendas;
