import React, { useState, useEffect } from 'react';
import { manutencaoService } from '../../services/supabaseService';
import { getDataAtual } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { activityMarkingService } from '../../services/activityMarkingService';
import {
  Calendar,
  MapPin,
  Settings,
  FileText,
  Save,
  Plus,
  Edit,
  ChevronDown,
  User,
  Trash2
} from 'lucide-react';

const NovoRegistroManutencao: React.FC = () => {
  const { user } = useAuth();
  const [manutencoes, setManutencoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingManutencao, setEditingManutencao] = useState<any>(null);

  useEffect(() => {
    carregarManutencoes();
  }, []);

  const carregarManutencoes = async () => {
    setLoading(true);
    try {
      const manutencoesAbertas = await manutencaoService.getManutencoesByStatus(['aberto']);
      setManutencoes(manutencoesAbertas);
    } catch (error) {

      alert('Erro ao carregar manutenções. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveManutencao = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.target as HTMLFormElement);
    
    const manutencaoData = {
      data: getDataAtual(),
      local: formData.get('local') as string,
      tipo: formData.get('tipo') as any,
      prioridade: formData.get('prioridade') as any,
      descricao: formData.get('descricao') as string,
      observacoes: formData.get('observacoes') as string || '',
      fotos: [],
      status: 'aberto' as const
    };

    try {
      let resultado;
      if (editingManutencao) {
        resultado = await manutencaoService.updateManutencao(editingManutencao.id, manutencaoData);
      } else {
        resultado = await manutencaoService.saveManutencao(manutencaoData);
      }

      if (resultado) {
        await carregarManutencoes();
        setShowForm(false);
        setEditingManutencao(null);
        alert(editingManutencao ? 'Manutenção atualizada com sucesso!' : 'Manutenção criada com sucesso!');
      } else {
        alert('Erro ao salvar manutenção');
      }
    } catch (error) {

      alert('Erro ao salvar manutenção');
    } finally {
      setSaving(false);
    }
  };

  const handleEditManutencao = (manutencao: any) => {
    setEditingManutencao(manutencao);
    setShowForm(true);
  };

  const handleNewManutencao = () => {
    setEditingManutencao(null);
    setShowForm(true);
  };

  const handleDeleteManutencao = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta manutenção?')) {
      return;
    }

    try {
      const success = await manutencaoService.deleteManutencao(id);
      if (success) {
        await carregarManutencoes();
        alert('Manutenção excluída com sucesso!');
      } else {
        alert('Erro ao excluir manutenção. Verifique suas permissões.');
      }
    } catch (error) {
      alert('Erro ao excluir manutenção');
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'correcao': return 'Correção';
      case 'conserto': return 'Conserto';
      case 'nova_instalacao': return 'Nova Instalação';
      case 'preventiva': return 'Preventiva';
      case 'substituicao': return 'Substituição';
      default: return tipo;
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'correcao': return 'bg-yellow-100 text-yellow-800';
      case 'conserto': return 'bg-red-100 text-red-800';
      case 'nova_instalacao': return 'bg-green-100 text-green-800';
      case 'preventiva': return 'bg-blue-100 text-blue-800';
      case 'substituicao': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPrioridadeLabel = (prioridade: string) => {
    switch (prioridade) {
      case 'baixa': return 'Baixa';
      case 'normal': return 'Normal';
      case 'alta': return 'Alta';
      default: return prioridade;
    }
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'baixa': return 'bg-green-100 text-green-800';
      case 'normal': return 'bg-yellow-100 text-yellow-800';
      case 'alta': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const dataAtual = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Novo Registro - Manutenção</h1>
        <p className="text-gray-600">Crie novas solicitações de manutenção</p>
      </div>

      {/* Data Atual */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Data do Registro</h2>
              <p className="text-gray-600 capitalize">{dataAtual}</p>
            </div>
          </div>
          
          <button
            onClick={handleNewManutencao}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center space-x-2 transition-colors duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Manutenção</span>
          </button>
        </div>
      </div>

      {/* Formulário de Nova Manutenção */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">
              {editingManutencao ? 'Editar Manutenção' : 'Criar Nova Manutenção'}
            </h3>
          </div>

          <form onSubmit={handleSaveManutencao} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Local */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Local *
                </label>
                <input
                  type="text"
                  name="local"
                  defaultValue={editingManutencao?.local || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Ex: Suite 101, Elevador, Recepção..."
                  required
                />
              </div>

              {/* Tipo de Manutenção */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Settings className="w-4 h-4 inline mr-1" />
                  Tipo de Manutenção *
                </label>
                <div className="relative">
                  <select
                    name="tipo"
                    defaultValue={editingManutencao?.tipo || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none"
                    required
                  >
                    <option value="">Selecione o tipo</option>
                    <option value="correcao">Correção</option>
                    <option value="conserto">Conserto</option>
                    <option value="nova_instalacao">Nova Instalação</option>
                    <option value="preventiva">Preventiva</option>
                    <option value="substituicao">Substituição</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Nível de Prioridade */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nível de Prioridade *
                </label>
                <div className="relative">
                  <select
                    name="prioridade"
                    defaultValue={editingManutencao?.prioridade || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none"
                    required
                  >
                    <option value="">Selecione a prioridade</option>
                    <option value="baixa">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Qual manutenção necessária? *
              </label>
              <textarea
                name="descricao"
                defaultValue={editingManutencao?.descricao || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows={3}
                placeholder="Descreva detalhadamente o problema ou serviço necessário..."
                required
              />
            </div>

            {/* Observações */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Observações
              </label>
              <textarea
                name="observacoes"
                defaultValue={editingManutencao?.observacoes || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows={3}
                placeholder="Informações adicionais, contexto, urgência..."
              />
            </div>

            {/* Botões */}
            <div className="flex space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingManutencao(null);
                }}
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
                    : 'bg-orange-600 text-white hover:bg-orange-700'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Salvando...' : editingManutencao ? 'Atualizar Manutenção' : 'Criar Manutenção'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Manutenções Abertas */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Manutenções em Aberto</h3>
          <p className="text-sm text-gray-600">{manutencoes.length} manutenções aguardando execução</p>
        </div>

        <div className="p-6">
          {manutencoes.length > 0 ? (
            <div className="space-y-4">
              {manutencoes.map((manutencao) => (
                <div key={manutencao.id} className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-gray-800">{manutencao.local}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTipoColor(manutencao.tipo)}`}>
                          {getTipoLabel(manutencao.tipo)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPrioridadeColor(manutencao.prioridade)}`}>
                          {getPrioridadeLabel(manutencao.prioridade)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-2">{manutencao.descricao}</p>
                      
                      {manutencao.observacoes && (
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Obs:</strong> {manutencao.observacoes}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Criado em: {manutencao.data}
                        </span>
                        {manutencao.solicitante?.name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            Solicitado por: {manutencao.solicitante.name}
                          </span>
                        )}
                        {!manutencao.solicitante && (
                          <span className="flex items-center gap-1 text-gray-400">
                            <User className="w-3 h-3" />
                            Solicitante não registrado
                          </span>
                        )}
                      </div>
                    </div>

                    {(user?.profile === 'admin' || user?.profile === 'gestor' || user?.profile === 'manutencao' || manutencao.solicitante_id === user?.id) && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditManutencao(manutencao)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                          title="Editar manutenção"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteManutencao(manutencao.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
                          title="Excluir manutenção"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Settings className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhuma manutenção em aberto</h3>
              <p className="text-gray-600">Todas as manutenções foram concluídas</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NovoRegistroManutencao;