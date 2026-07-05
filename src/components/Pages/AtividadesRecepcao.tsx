import React, { useState } from 'react';
import { atividadeService } from '../../services/supabaseService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Phone, 
  Plus,
  Edit,
  Trash2,
  Search,
  GripVertical,
  X,
  Save
} from 'lucide-react';

const getCurrentUserEmpresaId = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', user.id)
      .single();

    if (userError) {
      return null;
    }

    return userData?.empresa_id || null;
  } catch (error) {
    return null;
  }
};

const AtividadesRecepcao: React.FC = () => {
  const { user } = useAuth();
  const [atividades, setAtividades] = useState<any[]>([]);
  const [tiposRecepcao, setTiposRecepcao] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [selectedTipos, setSelectedTipos] = useState<string[]>([]);
  const [updatingPosition, setUpdatingPosition] = useState<string | null>(null);

  React.useEffect(() => {
    carregarAtividades();
    carregarTiposRecepcao();
  }, []);

  const carregarAtividades = async () => {
    setLoading(true);
    const todasAtividades = await atividadeService.getAtividades();
    const atividadesRecepcao = todasAtividades
      .filter(a => a.type === 'recepcao')
      .sort((a, b) => a.order_position - b.order_position);
    setAtividades(atividadesRecepcao);
    setLoading(false);
  };

  const carregarTiposRecepcao = async () => {
    try {
      const empresaId = await getCurrentUserEmpresaId();
      if (!empresaId) {

        setTiposRecepcao([]);
        return;
      }

      const { data, error } = await supabase
        .from('tipos_recepcao')
        .select('*')
        .eq('ativo', true)
        .eq('empresa_id', empresaId)
        .order('nome');

      if (error) {

        setTiposRecepcao([]);
      } else {
        setTiposRecepcao(data || []);
      }
    } catch (error) {

      setTiposRecepcao([]);
    }
  };

  const handleDeleteAtividade = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta atividade?')) {
      const success = await atividadeService.deleteAtividade(id);
      if (success) {
        await carregarAtividades();
        alert('Atividade excluída com sucesso!');
      } else {
        alert('Erro ao excluir atividade');
      }
    }
  };

  const handleEditActivity = (activity: any) => {
    setEditingActivity(activity);
    setSelectedTipos(activity.tipos_recepcao || []);
    setShowModal(true);
  };

  const handleNewActivity = () => {
    setEditingActivity(null);
    setSelectedTipos([]);
    setShowModal(true);
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.target as HTMLFormElement);
    
    const activityData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || '',
      type: 'recepcao' as const,
      active: formData.get('active') === 'true',
      order_position: editingActivity?.order_position || (atividades.length + 1),
      tipos_recepcao: selectedTipos
    };

    let result;
    if (editingActivity) {
      result = await atividadeService.updateAtividade(editingActivity.id, activityData);
    } else {
      result = await atividadeService.saveAtividade(activityData);
    }

    if (result) {
      await carregarAtividades();
      setShowModal(false);
      setEditingActivity(null);
      setSelectedTipos([]);
      alert(editingActivity ? 'Atividade atualizada com sucesso!' : 'Atividade criada com sucesso!');
    } else {
      alert('Erro ao salvar atividade');
    }
    
    setSaving(false);
  };

  const handleTipoChange = (tipoId: string) => {
    setSelectedTipos(prev => 
      prev.includes(tipoId) 
        ? prev.filter(id => id !== tipoId)
        : [...prev, tipoId]
    );
  };

  const getTipoNome = (tipoId: string) => {
    const tipo = tiposRecepcao.find(t => t.id === tipoId);
    return tipo?.nome || 'Tipo não encontrado';
  };

  const handlePositionChange = async (atividadeId: string, newPosition: number) => {
    let validPosition = newPosition;

    if (newPosition < 1) {
      validPosition = 1;
    } else if (newPosition > atividades.length) {
      validPosition = atividades.length;
    }

    const currentAtividade = atividades.find(a => a.id === atividadeId);
    if (!currentAtividade || currentAtividade.order_position === validPosition) {
      return;
    }

    setUpdatingPosition(atividadeId);

    const currentPosition = currentAtividade.order_position;
    const newAtividades = [...atividades];

    if (validPosition < currentPosition) {
      newAtividades.forEach(atividade => {
        if (atividade.id === atividadeId) {
          atividade.order_position = validPosition;
        } else if (atividade.order_position >= validPosition && atividade.order_position < currentPosition) {
          atividade.order_position += 1;
        }
      });
    } else {
      newAtividades.forEach(atividade => {
        if (atividade.id === atividadeId) {
          atividade.order_position = validPosition;
        } else if (atividade.order_position > currentPosition && atividade.order_position <= validPosition) {
          atividade.order_position -= 1;
        }
      });
    }

    const sortedAtividades = newAtividades.sort((a, b) => a.order_position - b.order_position);

    const reorderData = sortedAtividades.map(a => ({
      id: a.id,
      order_position: a.order_position
    }));

    const success = await atividadeService.reorderAtividades(reorderData);

    if (success) {
      setAtividades(sortedAtividades);
    } else {
      alert('Erro ao reordenar atividades');
      await carregarAtividades();
    }

    setUpdatingPosition(null);
  };

  const handleDragStart = (e: React.DragEvent, activity: any) => {
    setDraggedItem(activity);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetActivity: any) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.id === targetActivity.id) {
      setDraggedItem(null);
      return;
    }

    const draggedIndex = atividades.findIndex(a => a.id === draggedItem.id);
    const targetIndex = atividades.findIndex(a => a.id === targetActivity.id);

    const newAtividades = [...atividades];
    const [removed] = newAtividades.splice(draggedIndex, 1);
    newAtividades.splice(targetIndex, 0, removed);

    // Reordenar os números de ordem
    const reorderedAtividades = newAtividades.map((activity, index) => ({
      ...activity,
      order_position: index + 1
    }));

    // Atualizar ordem no banco
    const reorderData = reorderedAtividades.map(a => ({
      id: a.id,
      order_position: a.order_position
    }));
    
    const success = await atividadeService.reorderAtividades(reorderData);
    if (success) {
      setAtividades(reorderedAtividades);
    } else {
      alert('Erro ao reordenar atividades');
      await carregarAtividades(); // Recarregar em caso de erro
    }
    
    setDraggedItem(null);
  };

  const filteredAtividades = atividades.filter(atividade =>
    atividade.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    atividade.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Atividades da Recepção</h1>
        <p className="text-gray-600">Gerencie as atividades específicas da recepção - arraste para reordenar</p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar atividades..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-auto pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={handleNewActivity}
          className="w-full md:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 transition-colors duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Atividade</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Phone className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Atividades da Recepção</h2>
              <p className="text-sm text-gray-600">{filteredAtividades.length} atividades cadastradas</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {filteredAtividades.length > 0 ? (
            <div className="space-y-3">
              {filteredAtividades.map((atividade) => (
                <div
                  key={atividade.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, atividade)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, atividade)}
                  className={`flex flex-col md:flex-row p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors duration-200 cursor-move ${
                    draggedItem?.id === atividade.id ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-800 break-words">{atividade.name}</h3>
                      {atividade.description && (
                        <p className="text-sm text-gray-600 mt-1 break-words">{atividade.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <div className="flex items-center space-x-2 text-xs md:text-sm text-gray-600">
                          <span className="font-medium whitespace-nowrap">Posição:</span>
                          <input
                            type="number"
                            min="1"
                            max={atividades.length}
                            value={atividade.order_position}
                            onChange={(e) => {
                              const newValue = parseInt(e.target.value);
                              if (!isNaN(newValue)) {
                                handlePositionChange(atividade.id, newValue);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onDragStart={(e) => e.stopPropagation()}
                            disabled={updatingPosition === atividade.id}
                            className="w-14 md:w-16 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center disabled:bg-gray-100 disabled:cursor-not-allowed"
                            title="Clique para editar a posição"
                          />
                          {updatingPosition === atividade.id && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          )}
                        </div>
                        {atividade.tipos_recepcao && atividade.tipos_recepcao.length > 0 && (
                          <div className="flex items-center space-x-1 text-xs md:text-sm text-gray-600">
                            <span className="whitespace-nowrap">Tipos: {atividade.tipos_recepcao.length}</span>
                          </div>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          atividade.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {atividade.active ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                      {atividade.tipos_recepcao && atividade.tipos_recepcao.length > 0 && (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-1">
                            {atividade.tipos_recepcao.map((tipoId: string) => (
                              <span key={tipoId} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                {getTipoNome(tipoId)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-end space-x-2 mt-3 md:mt-0 md:ml-3 flex-shrink-0">
                    <button
                      onClick={() => handleEditActivity(atividade)}
                      className="p-2 text-blue-600 hover:bg-blue-200 rounded-lg transition-colors duration-200"
                      title="Editar atividade"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {(user?.profile === 'admin' || user?.profile === 'gestor') && (
                      <button
                        onClick={() => handleDeleteAtividade(atividade.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
                        title="Excluir atividade"
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
              <Phone className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhuma atividade encontrada</h3>
              <p className="text-gray-600 mb-4">Comece criando sua primeira atividade da recepção</p>
              <button 
                onClick={handleNewActivity}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 mx-auto transition-colors duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Atividade</span>
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
                  {editingActivity ? 'Editar Atividade' : 'Nova Atividade da Recepção'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveActivity} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Atividade *
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingActivity?.name || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  name="description"
                  defaultValue={editingActivity?.description || ''}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descrição opcional da atividade"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Tipos de Recepção
                </label>
                {tiposRecepcao.length > 0 ? (
                  <div className="space-y-3">
                    {tiposRecepcao.map((tipo) => (
                      <label key={tipo.id} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTipos.includes(tipo.id)}
                          onChange={() => handleTipoChange(tipo.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{tipo.nome}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm">
                      <strong>Nenhum tipo de recepção cadastrado.</strong>
                    </p>
                    <p className="text-yellow-700 text-xs mt-1">
                      Cadastre tipos de recepção primeiro em Cadastros → Tipos de Recepção
                    </p>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Selecione os tipos de recepção onde esta atividade deve aparecer
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status *
                </label>
                <select
                  name="active"
                  defaultValue={editingActivity?.active !== undefined ? editingActivity.active.toString() : 'true'}
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

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Phone className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Atividades</p>
              <p className="text-2xl font-bold text-gray-800">{atividades.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Phone className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Atividades Ativas</p>
              <p className="text-2xl font-bold text-gray-800">{atividades.filter(a => a.active).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <Phone className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Atividades Inativas</p>
              <p className="text-2xl font-bold text-gray-800">{atividades.filter(a => !a.active).length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AtividadesRecepcao;