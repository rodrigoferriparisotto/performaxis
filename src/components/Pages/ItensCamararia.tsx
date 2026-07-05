import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Package, 
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Save,
  GripVertical
} from 'lucide-react';

interface ItemCamararia {
  id: string;
  nome: string;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

const ItensCamararia: React.FC = () => {
  const { user } = useAuth();
  const [itens, setItens] = useState<ItemCamararia[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemCamararia | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedItem, setDraggedItem] = useState<any>(null);

  useEffect(() => {
    carregarItens();
  }, []);

  const carregarItens = async () => {
    setLoading(true);
    try {
      // Obter empresa_id do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {

        setItens([]);
        setLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {

        setItens([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('itens_camararia')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .order('ordem')
        .order('nome');

      if (error) {

        setItens([]);
      } else {
        setItens(data || []);
      }
    } catch (error) {

      setItens([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este item?')) {
      try {
        const { error } = await supabase
          .from('itens_camararia')
          .delete()
          .eq('id', id);

        if (error) {

          window.alert('Erro ao excluir item');
        } else {
          await carregarItens();
          window.alert('Item excluído com sucesso!');
        }
      } catch (error) {

        window.alert('Erro ao excluir item');
      }
    }
  };

  const handleEditItem = (item: ItemCamararia) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleNewItem = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.target as HTMLFormElement);
    
    const itemData = {
      nome: formData.get('nome') as string,
      ativo: formData.get('ativo') === 'true',
      ordem: editingItem?.ordem || (itens.length + 1)
    };

    // Verificar se o nome já existe (exceto para edição do próprio item)
    const nomeExiste = itens.some(i => 
      i.nome.toLowerCase() === itemData.nome.toLowerCase() && 
      i.id !== editingItem?.id
    );

    if (nomeExiste) {
      window.alert('Já existe um item com este nome.');
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
      const itemComEmpresa = {
        ...itemData,
        empresa_id: userData.empresa_id
      };

      let result;
      if (editingItem) {
        const { data, error } = await supabase
          .from('itens_camararia')
          .update(itemComEmpresa)
          .eq('id', editingItem.id)
          .select()
          .single();
        
        result = { data, error };
      } else {
        const { data, error } = await supabase
          .from('itens_camararia')
          .insert(itemComEmpresa)
          .select()
          .single();
        
        result = { data, error };
      }

      if (result.error) {

        window.alert('Erro ao salvar item');
      } else {
        await carregarItens();
        setShowModal(false);
        setEditingItem(null);
        window.alert(editingItem ? 'Item atualizado com sucesso!' : 'Item criado com sucesso!');
      }
    } catch (error) {

      window.alert('Erro ao salvar item');
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, item: any) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetItem: any) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.id === targetItem.id) {
      setDraggedItem(null);
      return;
    }

    const draggedIndex = itens.findIndex(i => i.id === draggedItem.id);
    const targetIndex = itens.findIndex(i => i.id === targetItem.id);

    const newItens = [...itens];
    const [removed] = newItens.splice(draggedIndex, 1);
    newItens.splice(targetIndex, 0, removed);

    // Reordenar os números de ordem
    const reorderedItens = newItens.map((item, index) => ({
      ...item,
      ordem: index + 1
    }));

    // Atualizar ordem no banco
    try {
      const promises = reorderedItens.map(item =>
        supabase
          .from('itens_camararia')
          .update({ ordem: item.ordem })
          .eq('id', item.id)
      );

      const results = await Promise.all(promises);
      const hasError = results.some(result => result.error);

      if (hasError) {

        alert('Erro ao reordenar itens');
        await carregarItens(); // Recarregar em caso de erro
      } else {
        setItens(reorderedItens);
      }
    } catch (error) {

      alert('Erro ao reordenar itens');
      await carregarItens();
    }
    
    setDraggedItem(null);
  };

  const filteredItens = itens.filter(item =>
    item.nome.toLowerCase().includes(searchTerm.toLowerCase())
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
        <h1 className="text-2xl font-bold text-gray-800">Itens da Camararia</h1>
        <p className="text-gray-600">Gerencie a lista de itens necessários para o trabalho da camararia</p>
      </div>

      {/* Filtros e Ações */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar itens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        
        <button 
          onClick={handleNewItem}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 transition-colors duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Item</span>
        </button>
      </div>

      {/* Lista de Itens */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Lista de Itens</h2>
              <p className="text-sm text-gray-600">{filteredItens.length} itens cadastrados</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          {filteredItens.length > 0 ? (
            <div className="space-y-3">
              {filteredItens.map((item) => (
                <div 
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, item)}
                  className={`flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-move ${
                    draggedItem?.id === item.id ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-800">{item.nome}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {item.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Ordem: {item.ordem}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handleEditItem(item)}
                      className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors duration-200"
                      title="Editar item"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {(user?.profile === 'admin' || user?.profile === 'gestor') && (
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
                        title="Excluir item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                {searchTerm ? 'Nenhum item encontrado' : 'Nenhum item cadastrado'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm 
                  ? 'Tente ajustar o termo de busca'
                  : 'Comece criando seu primeiro item da camararia'
                }
              </p>
              {!searchTerm && (
                <button 
                  onClick={handleNewItem}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 mx-auto transition-colors duration-200"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Item</span>
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
                  {editingItem ? 'Editar Item' : 'Novo Item da Camararia'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Item *
                </label>
                <input
                  type="text"
                  name="nome"
                  defaultValue={editingItem?.nome || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Ex: Pano amarelo para pó, Borrifador peroxy..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status *
                </label>
                <select
                  name="ativo"
                  defaultValue={editingItem?.ativo !== undefined ? editingItem.ativo.toString() : 'true'}
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
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Itens</p>
              <p className="text-2xl font-bold text-gray-800">{itens.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Itens Ativos</p>
              <p className="text-2xl font-bold text-gray-800">{itens.filter(i => i.ativo).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <Package className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Itens Inativos</p>
              <p className="text-2xl font-bold text-gray-800">{itens.filter(i => !i.ativo).length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItensCamararia;