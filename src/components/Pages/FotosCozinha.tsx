import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Camera,
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Save,
  GripVertical,
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react';

interface FotoCozinha {
  id: string;
  titulo: string;
  descricao: string;
  url_externa: string;
  ativo: boolean;
  ordem: number;
  tipo_cozinha_id: string | null;
  created_at: string;
  updated_at: string;
  tipos_cozinha?: {
    id: string;
    nome: string;
  };
}

interface TipoCozinha {
  id: string;
  nome: string;
  ativo: boolean;
}

const FotosCozinha: React.FC = () => {
  const { user } = useAuth();
  const [fotos, setFotos] = useState<FotoCozinha[]>([]);
  const [tiposCozinha, setTiposCozinha] = useState<TipoCozinha[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingFoto, setEditingFoto] = useState<FotoCozinha | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [filterTipoCozinha, setFilterTipoCozinha] = useState<string>('');

  useEffect(() => {
    carregarFotos();
    carregarTiposCozinha();
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
        .select('*')
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

  const carregarFotos = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {

        setFotos([]);
        setLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {

        setFotos([]);
        setLoading(false);
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
        .order('ordem')
        .order('titulo');

      if (error) {

        setFotos([]);
      } else {
        setFotos(data || []);
      }
    } catch (error) {

      setFotos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFoto = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta foto?')) {
      try {
        const { error } = await supabase
          .from('fotos_cozinha')
          .delete()
          .eq('id', id);

        if (error) {

          window.alert('Erro ao excluir foto');
        } else {
          await carregarFotos();
          window.alert('Foto excluída com sucesso!');
        }
      } catch (error) {

        window.alert('Erro ao excluir foto');
      }
    }
  };

  const handleEditFoto = (foto: FotoCozinha) => {
    setEditingFoto(foto);
    setShowModal(true);
  };

  const handleNewFoto = () => {
    setEditingFoto(null);
    setShowModal(true);
  };

  const handleSaveFoto = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.target as HTMLFormElement);

    const tipoCozinhaId = formData.get('tipo_cozinha_id') as string;

    const fotoData = {
      titulo: formData.get('titulo') as string,
      descricao: formData.get('descricao') as string || '',
      url_externa: formData.get('url_externa') as string,
      ativo: formData.get('ativo') === 'true',
      tipo_cozinha_id: tipoCozinhaId && tipoCozinhaId !== '' ? tipoCozinhaId : null,
      ordem: editingFoto?.ordem || (fotos.length + 1)
    };

    try {
      new URL(fotoData.url_externa);
    } catch {
      window.alert('Por favor, insira uma URL válida');
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

      const fotoComEmpresa = {
        ...fotoData,
        empresa_id: userData.empresa_id
      };

      let result;
      if (editingFoto) {
        const { data, error } = await supabase
          .from('fotos_cozinha')
          .update(fotoComEmpresa)
          .eq('id', editingFoto.id)
          .select()
          .single();

        result = { data, error };
      } else {
        const { data, error } = await supabase
          .from('fotos_cozinha')
          .insert(fotoComEmpresa)
          .select()
          .single();

        result = { data, error };
      }

      if (result.error) {

        window.alert('Erro ao salvar foto');
      } else {
        await carregarFotos();
        setShowModal(false);
        setEditingFoto(null);
        window.alert(editingFoto ? 'Foto atualizada com sucesso!' : 'Foto criada com sucesso!');
      }
    } catch (error) {

      window.alert('Erro ao salvar foto');
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, foto: any) => {
    setDraggedItem(foto);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetFoto: any) => {
    e.preventDefault();

    if (!draggedItem || draggedItem.id === targetFoto.id) {
      setDraggedItem(null);
      return;
    }

    const draggedIndex = fotos.findIndex(f => f.id === draggedItem.id);
    const targetIndex = fotos.findIndex(f => f.id === targetFoto.id);

    const newFotos = [...fotos];
    const [removed] = newFotos.splice(draggedIndex, 1);
    newFotos.splice(targetIndex, 0, removed);

    const reorderedFotos = newFotos.map((foto, index) => ({
      ...foto,
      ordem: index + 1
    }));

    try {
      const promises = reorderedFotos.map(foto =>
        supabase
          .from('fotos_cozinha')
          .update({ ordem: foto.ordem })
          .eq('id', foto.id)
      );

      const results = await Promise.all(promises);
      const hasError = results.some(result => result.error);

      if (hasError) {

        alert('Erro ao reordenar fotos');
        await carregarFotos();
      } else {
        setFotos(reorderedFotos);
      }
    } catch (error) {

      alert('Erro ao reordenar fotos');
      await carregarFotos();
    }

    setDraggedItem(null);
  };

  const filteredFotos = fotos.filter(foto => {
    const matchesSearch = foto.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         foto.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = showInactive || foto.ativo;
    const matchesTipo = !filterTipoCozinha || foto.tipo_cozinha_id === filterTipoCozinha;
    return matchesSearch && matchesStatus && matchesTipo;
  });

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
        <h1 className="text-2xl font-bold text-gray-800">Fotos Cozinha</h1>
        <p className="text-gray-600">Gerencie a galeria de fotos de referência para a cozinha</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar fotos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterTipoCozinha}
            onChange={(e) => setFilterTipoCozinha(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os tipos</option>
            {tiposCozinha.map(tipo => (
              <option key={tipo.id} value={tipo.id}>{tipo.nome}</option>
            ))}
          </select>

          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200 ${
              showInactive
                ? 'bg-gray-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {showInactive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>{showInactive ? 'Mostrar Todas' : 'Apenas Ativas'}</span>
          </button>
        </div>

        <button
          onClick={handleNewFoto}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Foto</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Camera className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Galeria de Fotos</h2>
              <p className="text-sm text-gray-600">{filteredFotos.length} fotos {showInactive ? 'total' : 'ativas'}</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          {filteredFotos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredFotos.map((foto) => (
                <div
                  key={foto.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, foto)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, foto)}
                  className={`bg-gray-50 rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200 cursor-move ${
                    draggedItem?.id === foto.id ? 'opacity-50' : ''
                  } ${!foto.ativo ? 'opacity-60' : ''}`}
                >
                  <div className="p-3 border-b border-gray-200 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <GripVertical className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500">#{foto.ordem}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          foto.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {foto.ativo ? 'Ativa' : 'Inativa'}
                        </span>
                        <button
                          onClick={() => handleEditFoto(foto)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors duration-200"
                          title="Editar foto"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        {(user?.profile === 'admin' || user?.profile === 'gestor') && (
                          <button
                            onClick={() => handleDeleteFoto(foto.id)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors duration-200"
                            title="Excluir foto"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="aspect-square bg-gray-100">
                    <img
                      src={foto.url_externa}
                      alt={foto.titulo}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://via.placeholder.com/300x300/e5e7eb/9ca3af?text=Erro+ao+carregar';
                      }}
                    />
                  </div>

                  <div className="p-3">
                    <h4 className="font-medium text-gray-800 text-sm mb-1 line-clamp-2">{foto.titulo}</h4>
                    {foto.tipos_cozinha && (
                      <div className="mb-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {foto.tipos_cozinha.nome}
                        </span>
                      </div>
                    )}
                    {foto.descricao && (
                      <p className="text-xs text-gray-600 line-clamp-3 mb-2">{foto.descricao}</p>
                    )}
                    <a
                      href={foto.url_externa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Ver original</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Camera className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                {searchTerm ? 'Nenhuma foto encontrada' : 'Nenhuma foto cadastrada'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm
                  ? 'Tente ajustar o termo de busca'
                  : 'Comece criando sua primeira foto de referência'
                }
              </p>
              {!searchTerm && (
                <button
                  onClick={handleNewFoto}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 mx-auto transition-colors duration-200"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nova Foto</span>
                </button>
              )}
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
                  {editingFoto ? 'Editar Foto' : 'Nova Foto de Referência'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveFoto} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título da Foto *
                </label>
                <input
                  type="text"
                  name="titulo"
                  defaultValue={editingFoto?.titulo || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Organização da bancada, Limpeza de equipamentos..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link da Foto *
                </label>
                <input
                  type="url"
                  name="url_externa"
                  defaultValue={editingFoto?.url_externa || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://exemplo.com/foto.jpg"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Cole aqui o link externo da foto (sugerimos usar{' '}
                  <a
                    href="https://i.postimg.cc/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline font-medium"
                  >
                    https://i.postimg.cc/
                  </a>
                  , após enviar a foto use o Link direto e cole aqui)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Cozinha
                </label>
                <select
                  name="tipo_cozinha_id"
                  defaultValue={editingFoto?.tipo_cozinha_id || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um tipo (opcional)</option>
                  {tiposCozinha.map(tipo => (
                    <option key={tipo.id} value={tipo.id}>{tipo.nome}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Vincule a foto a um tipo específico de cozinha para melhor organização
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  name="descricao"
                  defaultValue={editingFoto?.descricao || ''}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descreva o que a foto mostra e como deve ser feito..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status *
                </label>
                <select
                  name="ativo"
                  defaultValue={editingFoto?.ativo !== undefined ? editingFoto.ativo.toString() : 'true'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="true">Ativa</option>
                  <option value="false">Inativa</option>
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
              <Camera className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Fotos</p>
              <p className="text-2xl font-bold text-gray-800">{fotos.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Camera className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Fotos Ativas</p>
              <p className="text-2xl font-bold text-gray-800">{fotos.filter(f => f.ativo).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <Camera className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Fotos Inativas</p>
              <p className="text-2xl font-bold text-gray-800">{fotos.filter(f => !f.ativo).length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FotosCozinha;
