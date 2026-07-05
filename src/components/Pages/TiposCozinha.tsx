import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  ChefHat,
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Save
} from 'lucide-react';

interface TipoCozinha {
  id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

const TiposCozinha: React.FC = () => {
  const { user } = useAuth();
  const [tipos, setTipos] = useState<TipoCozinha[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoCozinha | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    carregarTipos();
  }, []);

  const carregarTipos = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {

        setTipos([]);
        setLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {

        setTipos([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('tipos_cozinha')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .order('nome');

      if (error) {

        setTipos([]);
      } else {
        setTipos(data || []);
      }
    } catch (error) {

      setTipos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTipo = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este tipo de cozinha?')) {
      try {
        const { error } = await supabase
          .from('tipos_cozinha')
          .delete()
          .eq('id', id);

        if (error) {

          window.alert('Erro ao excluir tipo de cozinha');
        } else {
          await carregarTipos();
          window.alert('Tipo de cozinha excluído com sucesso!');
        }
      } catch (error) {

        window.alert('Erro ao excluir tipo de cozinha');
      }
    }
  };

  const handleEditTipo = (tipo: TipoCozinha) => {
    setEditingTipo(tipo);
    setShowModal(true);
  };

  const handleNewTipo = () => {
    setEditingTipo(null);
    setShowModal(true);
  };

  const handleSaveTipo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.target as HTMLFormElement);

    const tipoData = {
      nome: formData.get('nome') as string,
      ativo: formData.get('ativo') === 'true'
    };

    const nomeExiste = tipos.some(t =>
      t.nome.toLowerCase() === tipoData.nome.toLowerCase() &&
      t.id !== editingTipo?.id
    );

    if (nomeExiste) {
      window.alert('Já existe um tipo de cozinha com este nome.');
      setSaving(false);
      return;
    }

    try {
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

      const tipoComEmpresa = {
        ...tipoData,
        empresa_id: userData.empresa_id
      };

      let result;
      if (editingTipo) {
        const { data, error } = await supabase
          .from('tipos_cozinha')
          .update(tipoComEmpresa)
          .eq('id', editingTipo.id)
          .select()
          .single();

        result = { data, error };
      } else {
        const { data, error } = await supabase
          .from('tipos_cozinha')
          .insert(tipoComEmpresa)
          .select()
          .single();

        result = { data, error };
      }

      if (result.error) {

        window.alert('Erro ao salvar tipo de cozinha');
      } else {
        await carregarTipos();
        setShowModal(false);
        setEditingTipo(null);
        window.alert(editingTipo ? 'Tipo atualizado com sucesso!' : 'Tipo criado com sucesso!');
      }
    } catch (error) {

      window.alert('Erro ao salvar tipo de cozinha');
    } finally {
      setSaving(false);
    }
  };

  const filteredTipos = tipos.filter(tipo =>
    tipo.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Tipos de Cozinha</h1>
        <p className="text-gray-600">Gerencie os diferentes tipos de cozinha do estabelecimento</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar tipos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={handleNewTipo}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Tipo</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ChefHat className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Lista de Tipos</h2>
              <p className="text-sm text-gray-600">{filteredTipos.length} tipos cadastrados</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          {filteredTipos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredTipos.map((tipo) => (
                <div key={tipo.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-800 text-lg">{tipo.nome}</h3>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEditTipo(tipo)}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors duration-200"
                        title="Editar tipo"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {(user?.profile === 'admin' || user?.profile === 'gestor') && (
                        <button
                          onClick={() => handleDeleteTipo(tipo.id)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors duration-200"
                          title="Excluir tipo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        tipo.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {tipo.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <ChefHat className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhum tipo encontrado</h3>
              <p className="text-gray-600 mb-4">Comece criando seu primeiro tipo de cozinha</p>
              <button
                onClick={handleNewTipo}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 mx-auto transition-colors duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Tipo</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  {editingTipo ? 'Editar Tipo de Cozinha' : 'Novo Tipo de Cozinha'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveTipo} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Tipo *
                </label>
                <input
                  type="text"
                  name="nome"
                  defaultValue={editingTipo?.nome || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Cozinha Quente, Cozinha Fria, Confeitaria..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Digite apenas o nome/nomenclatura do tipo de cozinha
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status *
                </label>
                <select
                  name="ativo"
                  defaultValue={editingTipo?.ativo !== undefined ? editingTipo.ativo.toString() : 'true'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <ChefHat className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Tipos</p>
              <p className="text-2xl font-bold text-gray-800">{tipos.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <ChefHat className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Tipos Ativos</p>
              <p className="text-2xl font-bold text-gray-800">{tipos.filter(t => t.ativo).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <ChefHat className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Tipos Inativos</p>
              <p className="text-2xl font-bold text-gray-800">{tipos.filter(t => !t.ativo).length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TiposCozinha;
