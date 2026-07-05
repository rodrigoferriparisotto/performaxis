import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  ChefHat,
  Plus,
  History,
  Camera
} from 'lucide-react';
import NovoRegistroCozinha from './NovoRegistroCozinha';
import HistoricoCozinha from './HistoricoCozinha';

interface TipoCozinha {
  id: string;
  nome: string;
}

interface FotoCozinha {
  id: string;
  titulo: string;
  descricao: string;
  url_externa: string;
  ordem: number;
  tipos_cozinha?: TipoCozinha;
}

const Cozinha: React.FC = () => {
  const [activeTab, setActiveTab] = useState('novo-registro');
  const [fotosCarregando, setFotosCarregando] = useState(true);
  const [fotosCozinha, setFotosCozinha] = useState<FotoCozinha[]>([]);
  const [tiposCozinha, setTiposCozinha] = useState<TipoCozinha[]>([]);
  const [hasRegistroAtivo, setHasRegistroAtivo] = useState(false);

  React.useEffect(() => {
    carregarTiposCozinha();
    carregarFotosCozinha();
  }, []);

  const carregarTiposCozinha = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTiposCozinha([]);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        setTiposCozinha([]);
        return;
      }

      const { data, error } = await supabase
        .from('tipos_cozinha')
        .select('id, nome')
        .eq('empresa_id', userData.empresa_id)
        .eq('ativo', true)
        .order('nome');

      if (error) {

        setTiposCozinha([]);
      } else {
        setTiposCozinha(data || []);
      }
    } catch (error) {

      setTiposCozinha([]);
    }
  };

  const carregarFotosCozinha = async () => {
    setFotosCarregando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {

        setFotosCozinha([]);
        setFotosCarregando(false);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {

        setFotosCozinha([]);
        setFotosCarregando(false);
        return;
      }

      const { data, error } = await supabase
        .from('fotos_cozinha')
        .select(`
          *,
          tipos_cozinha (
            id,
            nome
          )
        `)
        .eq('empresa_id', userData.empresa_id)
        .eq('ativo', true)
        .order('ordem');

      if (error) {

        setFotosCozinha([]);
      } else {
        setFotosCozinha(data || []);
      }
    } catch (error) {

      setFotosCozinha([]);
    } finally {
      setFotosCarregando(false);
    }
  };

  const tabs = [
    { id: 'novo-registro', label: 'Novo Registro', icon: Plus },
    { id: 'historico', label: 'Histórico', icon: History }
  ];

  const handleRegistroChange = (hasRegistro: boolean) => {
    setHasRegistroAtivo(hasRegistro);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'novo-registro':
        return <NovoRegistroCozinha onRegistroChange={handleRegistroChange} />;
      case 'historico':
        return <HistoricoCozinha />;
      default:
        return <NovoRegistroCozinha onRegistroChange={handleRegistroChange} />;
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Cozinha</h1>
        <p className="text-gray-600">Gerencie os registros diários da cozinha</p>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className={`mr-2 w-5 h-5 ${
                  activeTab === tab.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                }`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {renderTabContent()}

      <div className={`bg-white rounded-lg shadow-md border border-gray-200 transition-all duration-300 ${hasRegistroAtivo ? 'mt-8' : 'mt-2'}`}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Camera className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Galeria de Referência</h3>
              <p className="text-sm text-gray-600">Fotos de referência para o trabalho da cozinha</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {fotosCarregando ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-blue-700">Carregando fotos...</span>
            </div>
          ) : fotosCozinha.length > 0 ? (
            <div className="space-y-8">
              {tiposCozinha.map((tipo) => {
                const fotosPorTipo = fotosCozinha.filter(foto => foto.tipos_cozinha?.id === tipo.id);

                if (fotosPorTipo.length === 0) return null;

                return (
                  <div key={tipo.id} className="space-y-4">
                    <div className="flex items-center space-x-3 pb-3 border-b-2 border-blue-200">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <ChefHat className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800">{tipo.nome}</h4>
                        <p className="text-sm text-gray-600">{fotosPorTipo.length} {fotosPorTipo.length === 1 ? 'foto' : 'fotos'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {fotosPorTipo.map((foto) => (
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
                  </div>
                );
              })}

              {fotosCozinha.filter(foto => !foto.tipos_cozinha).length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 pb-3 border-b-2 border-gray-200">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <Camera className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800">Sem Tipo Definido</h4>
                      <p className="text-sm text-gray-600">
                        {fotosCozinha.filter(foto => !foto.tipos_cozinha).length} {fotosCozinha.filter(foto => !foto.tipos_cozinha).length === 1 ? 'foto' : 'fotos'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {fotosCozinha.filter(foto => !foto.tipos_cozinha).map((foto) => (
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
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Camera className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h4 className="text-lg font-medium text-gray-800 mb-2">Nenhuma foto de referência</h4>
              <p className="text-gray-600 mb-4">
                Cadastre fotos de referência para orientar o trabalho da cozinha
              </p>
              <p className="text-sm text-blue-600">
                Acesse <strong>Cadastros → Fotos Cozinha</strong> para adicionar fotos
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cozinha;
