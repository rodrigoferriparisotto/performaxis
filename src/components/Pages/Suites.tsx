import React, { useState } from 'react';
import { suiteService, empresaService } from '../../services/supabaseService';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Home, 
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Save,
  AlertCircle
} from 'lucide-react';

const Suites: React.FC = () => {
  const { user } = useAuth();
  const [suites, setSuites] = useState<any[]>([]);
  const [empresa, setEmpresa] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSuite, setEditingSuite] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  React.useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    const [suitesData, empresaData] = await Promise.all([
      suiteService.getSuites(),
      empresaService.getEmpresa()
    ]);
    setSuites(suitesData);
    setEmpresa(empresaData);
    setLoading(false);
  };

  const handleDeleteSuite = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta suíte?')) {
      const success = await suiteService.deleteSuite(id);
      if (success) {
        await carregarDados();
        alert('Suíte excluída com sucesso!');
      } else {
        alert('Erro ao excluir suíte');
      }
    }
  };

  const handleEditSuite = (suite: any) => {
    setEditingSuite(suite);
    setShowModal(true);
  };

  const handleNewSuite = () => {
    // Verificar se já atingiu o limite
    if (empresa && suites.length >= empresa.numero_quartos) {
      alert(`Limite de ${empresa.numero_quartos} suítes já foi atingido conforme cadastro da empresa.`);
      return;
    }
    setEditingSuite(null);
    setShowModal(true);
  };

  const handleSaveSuite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.target as HTMLFormElement);
    
    const suiteData = {
      name: formData.get('name') as string,
      type: formData.get('type') as string,
      floor: parseInt(formData.get('floor') as string)
    };

    // Verificar se o nome já existe (exceto para edição da própria suíte)
    const nomeExiste = suites.some(s => 
      s.name.toLowerCase() === suiteData.name.toLowerCase() && 
      s.id !== editingSuite?.id
    );

    if (nomeExiste) {
      alert('Já existe uma suíte com este nome.');
      setSaving(false);
      return;
    }

    let result;
    if (editingSuite) {
      result = await suiteService.updateSuite(editingSuite.id, suiteData);
    } else {
      // Verificar limite novamente antes de adicionar
      if (empresa && suites.length >= empresa.numero_quartos) {
        alert(`Limite de ${empresa.numero_quartos} suítes já foi atingido.`);
        setSaving(false);
        return;
      }
      result = await suiteService.saveSuite(suiteData);
    }

    if (result) {
      await carregarDados();
      setShowModal(false);
      setEditingSuite(null);
      alert(editingSuite ? 'Suíte atualizada com sucesso!' : 'Suíte criada com sucesso!');
    } else {
      alert('Erro ao salvar suíte');
    }
    
    setSaving(false);
  };

  const filteredSuites = suites.filter(suite =>
    suite.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    suite.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'disponivel': return 'bg-green-100 text-green-800';
      case 'ocupada': return 'bg-red-100 text-red-800';
      case 'limpeza': return 'bg-yellow-100 text-yellow-800';
      case 'manutencao': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'standard': return 'bg-blue-100 text-blue-800';
      case 'premium': return 'bg-purple-100 text-purple-800';
      case 'vip': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    return type;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'disponivel': return 'Disponível';
      case 'ocupada': return 'Ocupada';
      case 'limpeza': return 'Em Limpeza';
      case 'manutencao': return 'Manutenção';
      default: return status;
    }
  };

  // Gerar opções de andares baseado no cadastro da empresa
  const andaresOptions = empresa ? Array.from({ length: empresa.numero_andares }, (_, i) => i + 1) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando suítes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Suítes</h1>
        <p className="text-gray-600">
          Gerencie as suítes do estabelecimento - Limite: {suites.length}/{empresa?.numero_quartos || 0} suítes
        </p>
      </div>

      {/* Alerta de limite */}
      {empresa && suites.length >= empresa.numero_quartos && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <p className="text-orange-800">
              <strong>Limite atingido:</strong> Você cadastrou o máximo de {empresa.numero_quartos} suítes 
              conforme definido no cadastro da empresa.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar suítes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button 
          onClick={handleNewSuite}
          disabled={empresa && suites.length >= empresa.numero_quartos}
          className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200 ${
            empresa && suites.length >= empresa.numero_quartos
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Nova Suíte</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Home className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Lista de Suítes</h2>
              <p className="text-sm text-gray-600">{filteredSuites.length} suítes cadastradas</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          {filteredSuites.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredSuites.map((suite) => (
                <div key={suite.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-800 text-lg">Suíte {suite.name}</h3>
                    <div className="flex space-x-1">
                      <button 
                        onClick={() => handleEditSuite(suite)}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors duration-200"
                        title="Editar suíte"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {user?.profile === 'admin' && (
                        <button 
                          onClick={() => handleDeleteSuite(suite.id)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors duration-200"
                          title="Excluir suíte"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Tipo:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(suite.type)}`}>
                        {getTypeLabel(suite.type)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Andar:</span>
                      <span className="text-sm font-medium text-gray-800">{suite.floor}º andar</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Home className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhuma suíte encontrada</h3>
              <p className="text-gray-600 mb-4">
                {empresa && suites.length >= empresa.numero_quartos 
                  ? 'Limite de suítes atingido conforme cadastro da empresa'
                  : 'Comece criando sua primeira suíte'
                }
              </p>
              {empresa && suites.length < empresa.numero_quartos && (
                <button 
                  onClick={handleNewSuite}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 mx-auto transition-colors duration-200"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nova Suíte</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  {editingSuite ? 'Editar Suíte' : 'Nova Suíte'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveSuite} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Suíte *
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingSuite?.name || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 101, 201A, Presidencial..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo *
                </label>
                <input
                  type="text"
                  name="type"
                  defaultValue={editingSuite?.type || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Standard, Premium, VIP, Luxo..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Andar *
                </label>
                <select
                  name="floor"
                  defaultValue={editingSuite?.floor || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Selecione um andar</option>
                  {andaresOptions.map(andar => (
                    <option key={andar} value={andar}>
                      {andar}º andar
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`flex-1 px-4 py-2 rounded-md flex items-center justify-center space-x-2 transition-colors duration-200 ${
                    saving 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white`}
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Salvando...' : 'Salvar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Home className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Suítes</p>
              <p className="text-2xl font-bold text-gray-800">{suites.length}/{empresa?.numero_quartos || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Home className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Andares</p>
              <p className="text-2xl font-bold text-gray-800">{empresa?.numero_andares || 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Suites;