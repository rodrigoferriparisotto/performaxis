import React, { useState, useEffect } from 'react';
import { manutencaoService } from '../../services/supabaseService';
import { fotoUploadService } from '../../services/fotoUploadService';
import { FotosRegistro } from '../common/FotosRegistro';
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
  Trash2,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { notificar, confirmar } from '../../lib/feedback';
import { SeloPrazo } from '../common/SeloPrazo';

const NovoRegistroManutencao: React.FC = () => {
  const { user } = useAuth();
  const [manutencoes, setManutencoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingManutencao, setEditingManutencao] = useState<any>(null);
  const [fotosSelecionadas, setFotosSelecionadas] = useState<{ file: File; preview: string }[]>([]);

  const MAX_FOTOS = 5;

  const adicionarFotos = (lista: FileList | null) => {
    if (!lista) return;
    const existentes = (editingManutencao?.fotos?.length || 0) + fotosSelecionadas.length;
    const novas = Array.from(lista)
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, Math.max(0, MAX_FOTOS - existentes));
    if (novas.length < lista.length) {
      notificar(`Máximo de ${MAX_FOTOS} fotos por manutenção.`);
    }
    setFotosSelecionadas((prev) => [
      ...prev,
      ...novas.map((file) => ({ file, preview: URL.createObjectURL(file) })),
    ]);
  };

  const removerFoto = (index: number) => {
    setFotosSelecionadas((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const limparFotosSelecionadas = () => {
    setFotosSelecionadas((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.preview));
      return [];
    });
  };

  // vindo da revisão ("Abrir manutenção"): abre o formulário já com o local
  const [preenchimento, setPreenchimento] = useState<{ local?: string; descricao?: string } | null>(null);
  useEffect(() => {
    carregarManutencoes();
    try {
      const salvo = sessionStorage.getItem('performaxis_prefill_manutencao');
      if (salvo) {
        sessionStorage.removeItem('performaxis_prefill_manutencao');
        setPreenchimento(JSON.parse(salvo));
        setShowForm(true);
      }
    } catch {
      // sem sessionStorage: segue sem preencher
    }
  }, []);

  const carregarManutencoes = async () => {
    setLoading(true);
    try {
      const manutencoesAbertas = await manutencaoService.getManutencoesByStatus(['aberto']);
      setManutencoes(manutencoesAbertas);
    } catch (error) {

      notificar('Erro ao carregar manutenções. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveManutencao = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.target as HTMLFormElement);

    // sobe as fotos novas antes de salvar o registro
    let fotos: string[] = editingManutencao?.fotos || [];
    if (fotosSelecionadas.length > 0) {
      const { urls, falhas } = await fotoUploadService.uploadFotos(
        fotosSelecionadas.map((f) => f.file),
        'manutencoes'
      );
      fotos = [...fotos, ...urls];
      if (falhas > 0) {
        const continuar = await confirmar(
          `${falhas} foto(s) não puderam ser enviadas. Salvar a manutenção mesmo assim?`
        );
        if (!continuar) {
          setSaving(false);
          return;
        }
      }
    }

    const manutencaoData = {
      data: getDataAtual(),
      local: formData.get('local') as string,
      tipo: formData.get('tipo') as any,
      prioridade: formData.get('prioridade') as any,
      descricao: formData.get('descricao') as string,
      observacoes: formData.get('observacoes') as string || '',
      fotos,
      status: editingManutencao?.status || ('aberto' as const)
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
        limparFotosSelecionadas();
        notificar(editingManutencao ? 'Manutenção atualizada com sucesso!' : 'Manutenção criada com sucesso!');
      } else {
        notificar('Erro ao salvar manutenção');
      }
    } catch (error) {

      notificar('Erro ao salvar manutenção');
    } finally {
      setSaving(false);
    }
  };

  const handleEditManutencao = (manutencao: any) => {
    limparFotosSelecionadas();
    setEditingManutencao(manutencao);
    setShowForm(true);
  };

  const handleNewManutencao = () => {
    limparFotosSelecionadas();
    setEditingManutencao(null);
    setShowForm(true);
  };

  const handleDeleteManutencao = async (id: string) => {
    if (!await confirmar('Tem certeza que deseja excluir esta manutenção?')) {
      return;
    }

    try {
      const success = await manutencaoService.deleteManutencao(id);
      if (success) {
        await carregarManutencoes();
        notificar('Manutenção excluída com sucesso!');
      } else {
        notificar('Erro ao excluir manutenção. Verifique suas permissões.');
      }
    } catch (error) {
      notificar('Erro ao excluir manutenção');
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
                  defaultValue={editingManutencao?.local || preenchimento?.local || ''}
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
                defaultValue={editingManutencao?.descricao || preenchimento?.descricao || ''}
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

            {/* Fotos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Camera className="w-4 h-4 inline mr-1" />
                Fotos do problema (opcional, até {MAX_FOTOS})
              </label>

              {editingManutencao?.fotos?.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-gray-500 mb-1">Fotos já enviadas:</p>
                  <FotosRegistro fotos={editingManutencao.fotos} tamanho="sm" />
                </div>
              )}

              {/* câmera e galeria separadas: com capture o Android abre só a câmera */}
              {[
                { id: 'input-fotos-camera', capture: true },
                { id: 'input-fotos-galeria', capture: false },
              ].map(({ id, capture }) => (
                <input
                  key={id}
                  id={id}
                  type="file"
                  accept="image/*"
                  {...(capture ? { capture: 'environment' as const } : { multiple: true })}
                  className="hidden"
                  onChange={(e) => {
                    adicionarFotos(e.target.files);
                    e.target.value = '';
                  }}
                />
              ))}
              <div className="flex flex-wrap gap-2">
                <label
                  htmlFor="input-fotos-camera"
                  className="inline-flex items-center gap-2 px-4 py-2 border border-orange-300 text-orange-700 bg-orange-50 rounded-md hover:bg-orange-100 cursor-pointer transition-colors duration-200"
                >
                  <Camera className="w-4 h-4" />
                  <span>Tirar foto</span>
                </label>
                <label
                  htmlFor="input-fotos-galeria"
                  className="inline-flex items-center gap-2 px-4 py-2 border border-orange-300 text-orange-700 bg-white rounded-md hover:bg-orange-50 cursor-pointer transition-colors duration-200"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Escolher da galeria</span>
                </label>
              </div>

              {fotosSelecionadas.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {fotosSelecionadas.map((foto, i) => (
                    <div key={foto.preview} className="relative">
                      <img
                        src={foto.preview}
                        alt={`Foto selecionada ${i + 1}`}
                        className="w-16 h-16 object-cover rounded-md border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removerFoto(i)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white rounded-full text-xs leading-none flex items-center justify-center hover:bg-red-700"
                        title="Remover foto"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h4 className="font-medium text-gray-800">{manutencao.local}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTipoColor(manutencao.tipo)}`}>
                          {getTipoLabel(manutencao.tipo)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPrioridadeColor(manutencao.prioridade)}`}>
                          {getPrioridadeLabel(manutencao.prioridade)}
                        </span>
                        <SeloPrazo criadoEm={manutencao.created_at} prioridade={manutencao.prioridade} />
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-2">{manutencao.descricao}</p>
                      
                      {manutencao.observacoes && (
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Obs:</strong> {manutencao.observacoes}
                        </p>
                      )}

                      <FotosRegistro fotos={manutencao.fotos} tamanho="sm" />

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