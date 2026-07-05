import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Bed, 
  Plus,
  History,
  Camera,
  Calendar
} from 'lucide-react';
import NovoRegistroCamararia from './NovoRegistroCamararia';
import HistoricoCamararia from './HistoricoCamararia';
import ProgramacaoCamararia from './ProgramacaoCamararia';

const Camararia: React.FC = () => {
  const [activeTab, setActiveTab] = useState('novo-registro');
  const [itensCarregando, setItensCarregando] = useState(true);
  const [itensCamararia, setItensCamararia] = useState<any[]>([]);
  const [fotosCarregando, setFotosCarregando] = useState(true);
  const [fotosCamararia, setFotosCamararia] = useState<any[]>([]);

  React.useEffect(() => {
    carregarItensCamararia();
    carregarFotosCamararia();
  }, []);

  const carregarItensCamararia = async () => {
    setItensCarregando(true);
    try {
      // Obter empresa_id do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {

        setItensCamararia([]);
        setItensCarregando(false);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {

        setItensCamararia([]);
        setItensCarregando(false);
        return;
      }

      const { data, error } = await supabase
        .from('itens_camararia')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .eq('ativo', true)
        .order('ordem');

      if (error) {

        setItensCamararia([]);
      } else {
        setItensCamararia(data || []);
      }
    } catch (error) {

      setItensCamararia([]);
    } finally {
      setItensCarregando(false);
    }
  };

  const carregarFotosCamararia = async () => {
    setFotosCarregando(true);
    try {
      // Obter empresa_id do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {

        setFotosCamararia([]);
        setFotosCarregando(false);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {

        setFotosCamararia([]);
        setFotosCarregando(false);
        return;
      }

      const { data, error } = await supabase
        .from('fotos_camararia')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .eq('ativo', true)
        .order('ordem');

      if (error) {

        setFotosCamararia([]);
      } else {
        setFotosCamararia(data || []);
      }
    } catch (error) {

      setFotosCamararia([]);
    } finally {
      setFotosCarregando(false);
    }
  };

  const tabs = [
    { id: 'novo-registro', label: 'Novo Registro', icon: Plus },
    { id: 'programacao', label: 'Programação', icon: Calendar },
    { id: 'historico', label: 'Histórico', icon: History }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'novo-registro':
        return <NovoRegistroCamararia />;
      case 'programacao':
        return <ProgramacaoCamararia />;
      case 'historico':
        return <HistoricoCamararia />;
      default:
        return <NovoRegistroCamararia />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Camararia</h1>
        <p className="text-gray-600">Gerencie os registros de limpeza das suítes</p>

        {/* Lista de Itens para Trabalho */}
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-green-800 mb-3">Os itens para uso no seu trabalho são:</h3>
          {itensCarregando ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
              <span className="ml-2 text-green-700">Carregando itens...</span>
            </div>
          ) : itensCamararia.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-green-700">
              {itensCamararia.map((item) => (
                <div key={item.id} className="flex items-start space-x-2">
                  <span className="text-green-600 font-bold">•</span>
                  <span>{item.nome}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-green-700 text-sm">
                Nenhum item cadastrado. Cadastre itens em <strong>Cadastros → Itens Camararia</strong>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className={`mr-2 w-5 h-5 ${
                  activeTab === tab.id ? 'text-green-500' : 'text-gray-400 group-hover:text-gray-500'
                }`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mb-6">
        {renderTabContent()}
      </div>

      {/* Galeria de Fotos dos Itens - Sempre visível */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Camera className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Galeria de Referência</h3>
              <p className="text-sm text-gray-600">Fotos de referência para o trabalho da camararia</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {fotosCarregando ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <span className="ml-3 text-green-700">Carregando fotos...</span>
            </div>
          ) : fotosCamararia.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fotosCamararia.map((foto) => (
                <div key={foto.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <a 
                    href={foto.url_externa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative group cursor-pointer"
                  >
                    <img 
                      src={foto.url_externa}
                      alt={foto.titulo}
                      className="w-full h-48 object-cover rounded-lg mb-3 transition-transform duration-200 group-hover:scale-105"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://via.placeholder.com/400x300/e5e7eb/9ca3af?text=Erro+ao+carregar';
                      }}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all duration-200 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white bg-opacity-90 rounded-full p-2">
                        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  </a>
                  <h4 className="font-medium text-gray-800">{foto.titulo}</h4>
                  <p className="text-sm text-gray-600">{foto.descricao}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Camera className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h4 className="text-lg font-medium text-gray-800 mb-2">Nenhuma foto de referência</h4>
              <p className="text-gray-600 mb-4">
                Cadastre fotos de referência para orientar o trabalho da camararia
              </p>
              <p className="text-sm text-blue-600">
                Acesse <strong>Cadastros → Fotos Camararia</strong> para adicionar fotos
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Camararia;