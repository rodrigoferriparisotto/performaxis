import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Bed, 
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Save
} from 'lucide-react';

interface ServicosCamararia {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

const ServicosCamararia: React.FC = () => {
  const { user } = useAuth();
  const [servicos, setServicos] = useState<ServicosCamararia[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingServico, setEditingServico] = useState<ServicosCamararia | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    carregarServicos();
  }, []);

  const carregarServicos = async () => {
    setLoading(true);
    try {
      // Obter empresa_id do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {

        setServicos([]);
        setLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {

        setServicos([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('servicos_camararia')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .order('nome');

      if (error) {

        setServicos([]);
      } else {
        setServicos(data || []);
      }
    } catch (error) {

      setServicos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteServico = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este serviço de camararia?')) {
      try {
        const { error } = await supabase
          .from('servicos_camararia')
          .delete()
          .eq('id', id);

        if (error) {

          window.alert('Erro ao excluir serviço de camararia');
        } else {
          await carregarServicos();
          window.alert('Serviço de camararia excluído com sucesso!');
        }
      } catch (error) {

        window.alert('Erro ao excluir serviço de camararia');
      }
    }
  };

  const handleEditServico = (servico: ServicosCamararia) => {
    setEditingServico(servico);
    setShowModal(true);
  };

  const handleNewServico = () => {
    setEditingServico(null);
    setShowModal(true);
  };

  const handleSaveServico = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.target as HTMLFormElement);
    
    const servicoData = {
      nome: formData.get('nome') as string,
      descricao: formData.get('descricao') as string || '',
      ativo: formData.get('ativo') === 'true'
    };

    // Verificar se o nome já existe (exceto para edição do próprio serviço)
    const nomeExiste = servicos.some(s => 
      s.nome.toLowerCase() === servicoData.nome.toLowerCase() && 
      s.id !== editingServico?.id
    );

    if (nomeExiste) {
      window.alert('Já existe um serviço de camararia com este nome.');
      setSaving(false);
      return;
    }

    try {
      // Obter empresa_id do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.alert('Usuário não autenticado');
        setSaving(false);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        window.alert('Usuário não possui empresa vinculada');
        setSaving(false);
        return;
      }

      // Adicionar empresa_id aos dados
      const servicoComEmpresa = {
        ...servicoData,
        empresa_id: userData.empresa_id
      };

      let result;
      if (editingServico) {
        const { data, error } = await supabase
          .from('servicos_camararia')
          .update(servicoComEmpresa)
          .eq('id', editingServico.id)
          .select()
          .single();
        
        result = { data, error };
      } else {
        const { data, error } = await supabase
          .from('servicos_camararia')
          .insert(servicoComEmpresa)
          .select()
          .single();
        
        result = { data, error };
      }

      if (result.error) {

        window.alert('Erro ao salvar serviço de camararia');
      } else {
        await carregarServicos();
        setShowModal(false);
        setEditingServico(null);
        window.alert(editingServico ? 'Serviço atualizado com sucesso!' : 'Serviço criado com sucesso!');
      }
    } catch (error) {

      window.alert('Erro ao salvar serviço de camararia');
    } finally {
      setSaving(false);
    }
  };

  const filteredServicos = servicos.filter(servico =>
    servico.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    servico.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Serviços de Camararia</h1>
        <p className="text-gray-600">Gerencie os diferentes tipos de serviço da camararia</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar serviços..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <button 
          onClick={handleNewServico}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 transition-colors duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Serviço</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Bed className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Lista de Serviços</h2>
              <p className="text-sm text-gray-600">{filteredServicos.length} serviços cadastrados</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          {filteredServicos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredServicos.map((servico) => (
                <div key={servico.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-800 text-lg">{servico.nome}</h3>
                    <div className="flex space-x-1">
                      <button 
                        onClick={() => handleEditServico(servico)}
                        className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors duration-200"
                        title="Editar serviço"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {(user?.profile === 'admin' || user?.profile === 'gestor') && (
                        <button
                          onClick={() => handleDeleteServico(servico.id)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors duration-200"
                          title="Excluir serviço"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {servico.descricao && (
                      <div>
                        <span className="text-sm text-gray-600">Descrição:</span>
                        <p className="text-sm text-gray-800">{servico.descricao}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        servico.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {servico.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Bed className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhum serviço encontrado</h3>
              <p className="text-gray-600 mb-4">Comece criando seu primeiro serviço de camararia</p>
              <button 
                onClick={handleNewServico}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 mx-auto transition-colors duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Serviço</span>
              </button>
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
                  {editingServico ? 'Editar Serviço de Camararia' : 'Novo Serviço de Camararia'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveServico} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Serviço *
                </label>
                <input
                  type="text"
                  name="nome"
                  defaultValue={editingServico?.nome || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Ex: Suíte Livre, Permanência, Check-out..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Digite apenas o nome/nomenclatura do tipo de serviço
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  name="descricao"
                  defaultValue={editingServico?.descricao || ''}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Descrição opcional do tipo de serviço..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status *
                </label>
                <select
                  name="ativo"
                  defaultValue={editingServico?.ativo !== undefined ? editingServico.ativo.toString() : 'true'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
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
                      : 'bg-green-600 hover:bg-green-700'
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Bed className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Serviços</p>
              <p className="text-2xl font-bold text-gray-800">{servicos.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Bed className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Serviços Ativos</p>
              <p className="text-2xl font-bold text-gray-800">{servicos.filter(s => s.ativo).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <Bed className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Serviços Inativos</p>
              <p className="text-2xl font-bold text-gray-800">{servicos.filter(s => !s.ativo).length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicosCamararia;