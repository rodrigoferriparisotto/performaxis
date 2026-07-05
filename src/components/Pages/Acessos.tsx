import React, { useState, useEffect } from 'react';
import { Key, Plus, Search, Edit2, Trash2, Copy, Eye, EyeOff, ExternalLink, Check, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { acessosService, Acesso, AcessoInsert, AreaVinculada } from '../../services/acessosService';

const AREA_LABELS: Record<AreaVinculada, string> = {
  recepcao: 'Recepção',
  camararia: 'Camararia',
  revisao: 'Revisão',
  gestao: 'Gestão',
  vendas: 'Vendas',
  cozinha: 'Cozinha',
  areas_comuns: 'Áreas Comuns',
  atividades_diarias: 'Atividades Diárias',
  atividades_extras: 'Atividades Extras',
  manutencao: 'Manutenção',
};

const AREA_COLORS: Record<AreaVinculada, string> = {
  recepcao: 'bg-blue-100 text-blue-800',
  camararia: 'bg-green-100 text-green-800',
  revisao: 'bg-cyan-100 text-cyan-800',
  gestao: 'bg-orange-100 text-orange-800',
  vendas: 'bg-pink-100 text-pink-800',
  cozinha: 'bg-yellow-100 text-yellow-800',
  areas_comuns: 'bg-gray-100 text-gray-800',
  atividades_diarias: 'bg-teal-100 text-teal-800',
  atividades_extras: 'bg-emerald-100 text-emerald-800',
  manutencao: 'bg-red-100 text-red-800',
};

export default function Acessos() {
  const { user } = useAuth();
  const [acessos, setAcessos] = useState<Acesso[]>([]);
  const [filteredAcessos, setFilteredAcessos] = useState<Acesso[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState<AreaVinculada | 'todos'>('todos');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAcesso, setEditingAcesso] = useState<Acesso | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [formData, setFormData] = useState<AcessoInsert>({
    titulo: '',
    login: '',
    senha: '',
    url_acesso: '',
    comentarios: '',
    area_vinculada: [],
    empresa_id: '',
    ativo: true,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadAcessos();
  }, [user]);

  useEffect(() => {
    if (user?.empresaId && !showModal) {
      setFormData(prev => ({
        ...prev,
        empresa_id: user.empresaId
      }));
    }
  }, [user?.empresaId, showModal]);

  useEffect(() => {
    filterAcessos();
  }, [acessos, searchTerm, selectedArea]);

  const loadAcessos = async () => {
    if (!user?.empresaId) return;

    try {
      setLoading(true);
      const data = await acessosService.getAcessos(user.empresaId);
      setAcessos(data);
    } catch (error) {
      console.error('Error loading acessos:', error);
      showNotification('error', 'Erro ao carregar acessos');
    } finally {
      setLoading(false);
    }
  };

  const filterAcessos = () => {
    let filtered = acessos;

    if (selectedArea !== 'todos') {
      filtered = filtered.filter((a) => a.area_vinculada.includes(selectedArea as AreaVinculada));
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.titulo.toLowerCase().includes(term) ||
          a.login?.toLowerCase().includes(term) ||
          a.comentarios?.toLowerCase().includes(term)
      );
    }

    setFilteredAcessos(filtered);
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleOpenModal = (acesso?: Acesso) => {
    if (!user?.empresaId) {
      showNotification('error', 'Erro ao identificar a empresa. Por favor, recarregue a página.');
      return;
    }

    if (acesso) {
      setEditingAcesso(acesso);
      setFormData({
        titulo: acesso.titulo,
        login: acesso.login || '',
        senha: acesso.senha || '',
        url_acesso: acesso.url_acesso || '',
        comentarios: acesso.comentarios || '',
        area_vinculada: [...acesso.area_vinculada],
        empresa_id: acesso.empresa_id,
        ativo: acesso.ativo,
      });
    } else {
      setEditingAcesso(null);
      setFormData({
        titulo: '',
        login: '',
        senha: '',
        url_acesso: '',
        comentarios: '',
        area_vinculada: [],
        empresa_id: user.empresaId,
        ativo: true,
      });
    }
    setFormErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAcesso(null);
    if (user?.empresaId) {
      setFormData({
        titulo: '',
        login: '',
        senha: '',
        url_acesso: '',
        comentarios: '',
        area_vinculada: [],
        empresa_id: user.empresaId,
        ativo: true,
      });
    }
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.titulo.trim()) {
      errors.titulo = 'Título é obrigatório';
    }

    if (!formData.area_vinculada || formData.area_vinculada.length === 0) {
      errors.area_vinculada = 'Selecione pelo menos uma área';
    }

    if (!formData.empresa_id || formData.empresa_id.trim() === '') {
      showNotification('error', 'Erro ao identificar a empresa. Por favor, recarregue a página.');
      return false;
    }

    if (formData.url_acesso && formData.url_acesso.trim()) {
      try {
        new URL(formData.url_acesso);
      } catch {
        errors.url_acesso = 'URL inválida';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const sortedAreas = [...formData.area_vinculada].sort((a, b) =>
        AREA_LABELS[a].localeCompare(AREA_LABELS[b])
      );

      const submitData = {
        ...formData,
        area_vinculada: sortedAreas,
        login: formData.login?.trim() || null,
        senha: formData.senha?.trim() || null,
        url_acesso: formData.url_acesso?.trim() || null,
        comentarios: formData.comentarios?.trim() || null,
      };

      if (editingAcesso) {
        await acessosService.updateAcesso(editingAcesso.id, submitData);
        showNotification('success', 'Acesso atualizado com sucesso');
      } else {
        await acessosService.createAcesso(submitData);
        showNotification('success', 'Acesso criado com sucesso');
      }

      handleCloseModal();
      loadAcessos();
    } catch (error) {
      console.error('Error saving acesso:', error);
      showNotification('error', 'Erro ao salvar acesso');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await acessosService.deleteAcesso(id);
      showNotification('success', 'Acesso excluído com sucesso');
      setShowDeleteConfirm(null);
      loadAcessos();
    } catch (error) {
      console.error('Error deleting acesso:', error);
      showNotification('error', 'Erro ao excluir acesso');
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const copyToClipboard = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      showNotification('error', 'Erro ao copiar');
    }
  };

  const toggleCardExpansion = (id: string) => {
    setExpandedCard(expandedCard === id ? null : id);
  };

  const toggleArea = (area: AreaVinculada) => {
    setFormData((prev) => {
      const areas = prev.area_vinculada.includes(area)
        ? prev.area_vinculada.filter((a) => a !== area)
        : [...prev.area_vinculada, area];
      return { ...prev, area_vinculada: areas };
    });
  };

  const selectAllAreas = () => {
    const allAreas = Object.keys(AREA_LABELS) as AreaVinculada[];
    setFormData((prev) => ({ ...prev, area_vinculada: allAreas }));
  };

  const clearAllAreas = () => {
    setFormData((prev) => ({ ...prev, area_vinculada: [] }));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-3 rounded-xl shadow-lg">
            <Key className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Gerenciamento de Acessos</h1>
            <p className="text-sm text-gray-600">Gerencie credenciais e informações de acesso</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-md"
        >
          <Plus size={20} />
          Adicionar Acesso
        </button>
      </div>

      {notification && (
        <div
          className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
            notification.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {notification.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
          {notification.message}
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por título, login ou comentários..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={selectedArea}
          onChange={(e) => setSelectedArea(e.target.value as AreaVinculada | 'todos')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="todos">Todas as áreas</option>
          {Object.entries(AREA_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando acessos...</p>
        </div>
      ) : filteredAcessos.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Key size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-2">
            {searchTerm || selectedArea !== 'todos' ? 'Nenhum acesso encontrado' : 'Nenhum acesso cadastrado'}
          </p>
          <p className="text-sm text-gray-500">
            {searchTerm || selectedArea !== 'todos'
              ? 'Tente ajustar os filtros de busca'
              : 'Clique em "Adicionar Acesso" para começar'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAcessos.map((acesso) => (
            <div
              key={acesso.id}
              className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all overflow-hidden"
            >
              <div className="p-4 cursor-pointer" onClick={() => toggleCardExpansion(acesso.id)}>
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-900 mb-2">{acesso.titulo}</h3>
                  <div className="flex flex-wrap gap-1">
                    {[...acesso.area_vinculada]
                      .sort((a, b) => AREA_LABELS[a].localeCompare(AREA_LABELS[b]))
                      .map((area) => (
                        <span key={area} className={`px-2 py-1 text-xs rounded-full ${AREA_COLORS[area]}`}>
                          {AREA_LABELS[area]}
                        </span>
                      ))}
                  </div>
                </div>

                <div className="flex gap-4 text-sm text-gray-600 mb-3">
                  {acesso.login && (
                    <div className="flex items-center gap-1">
                      <Key size={14} />
                      Login
                    </div>
                  )}
                  {acesso.senha && (
                    <div className="flex items-center gap-1">
                      <Eye size={14} />
                      Senha
                    </div>
                  )}
                  {acesso.url_acesso && (
                    <div className="flex items-center gap-1">
                      <ExternalLink size={14} />
                      URL
                    </div>
                  )}
                </div>

                {!acesso.ativo && (
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                    <X size={12} />
                    Inativo
                  </div>
                )}
              </div>

              {expandedCard === acesso.id && (
                <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-3">
                  {acesso.login && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Login</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={acesso.login}
                          readOnly
                          className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm"
                        />
                        <button
                          onClick={() => copyToClipboard(acesso.login!, `login-${acesso.id}`)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Copiar"
                        >
                          {copiedField === `login-${acesso.id}` ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {acesso.senha && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Senha</label>
                      <div className="flex items-center gap-2">
                        <input
                          type={visiblePasswords.has(acesso.id) ? 'text' : 'password'}
                          value={acesso.senha}
                          readOnly
                          className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm"
                        />
                        <button
                          onClick={() => togglePasswordVisibility(acesso.id)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title={visiblePasswords.has(acesso.id) ? 'Ocultar' : 'Mostrar'}
                        >
                          {visiblePasswords.has(acesso.id) ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(acesso.senha!, `senha-${acesso.id}`)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Copiar"
                        >
                          {copiedField === `senha-${acesso.id}` ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {acesso.url_acesso && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">URL de Acesso</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={acesso.url_acesso}
                          readOnly
                          className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm"
                        />
                        <button
                          onClick={() => copyToClipboard(acesso.url_acesso!, `url-${acesso.id}`)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Copiar"
                        >
                          {copiedField === `url-${acesso.id}` ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                        <a
                          href={acesso.url_acesso}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Abrir"
                        >
                          <ExternalLink size={16} />
                        </a>
                      </div>
                    </div>
                  )}

                  {acesso.comentarios && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Comentários</label>
                      <p className="text-sm text-gray-700 bg-white border border-gray-300 rounded px-3 py-2">
                        {acesso.comentarios}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenModal(acesso);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      <Edit2 size={16} />
                      Editar
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(acesso.id);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      <Trash2 size={16} />
                      Excluir
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingAcesso ? 'Editar Acesso' : 'Novo Acesso'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.titulo ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ex: Sistema de Reservas"
                />
                {formErrors.titulo && <p className="mt-1 text-sm text-red-500">{formErrors.titulo}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Áreas Vinculadas <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllAreas}
                      className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      Selecionar Todas
                    </button>
                    <button
                      type="button"
                      onClick={clearAllAreas}
                      className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {formData.area_vinculada.length} {formData.area_vinculada.length === 1 ? 'área selecionada' : 'áreas selecionadas'}
                </div>
                <div className={`grid grid-cols-2 gap-3 p-4 border rounded-lg ${formErrors.area_vinculada ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50'}`}>
                  {Object.entries(AREA_LABELS)
                    .sort(([, labelA], [, labelB]) => labelA.localeCompare(labelB))
                    .map(([value, label]) => (
                      <label
                        key={value}
                        className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={formData.area_vinculada.includes(value as AreaVinculada)}
                          onChange={() => toggleArea(value as AreaVinculada)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{label}</span>
                      </label>
                    ))}
                </div>
                {formErrors.area_vinculada && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.area_vinculada}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Login</label>
                <input
                  type="text"
                  value={formData.login}
                  onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: usuario@exemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <input
                  type="text"
                  value={formData.senha}
                  onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Senha de acesso"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL de Acesso</label>
                <input
                  type="text"
                  value={formData.url_acesso}
                  onChange={(e) => setFormData({ ...formData, url_acesso: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.url_acesso ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="https://exemplo.com"
                />
                {formErrors.url_acesso && <p className="mt-1 text-sm text-red-500">{formErrors.url_acesso}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comentários</label>
                <textarea
                  value={formData.comentarios}
                  onChange={(e) => setFormData({ ...formData, comentarios: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Observações adicionais sobre este acesso..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
                  Acesso ativo
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all"
                >
                  {editingAcesso ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="text-red-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Confirmar Exclusão</h3>
                <p className="text-sm text-gray-600">Esta ação não pode ser desfeita.</p>
              </div>
            </div>

            <p className="text-gray-700 mb-6">Tem certeza que deseja excluir este acesso?</p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
