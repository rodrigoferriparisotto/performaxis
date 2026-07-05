import React, { useState, useEffect } from 'react';
import { manutencaoService, usuarioService } from '../../services/supabaseService';
import { formatarData, getDataHoraAtual } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { activityMarkingService } from '../../services/activityMarkingService';
import {
  Settings,
  Play,
  Pause,
  Square,
  Clock,
  MapPin,
  User,
  X,
  GripVertical,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  FileText,
  Trash2
} from 'lucide-react';

const ManutencoesPendentes: React.FC = () => {
  const { user } = useAuth();
  const [manutencoes, setManutencoes] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [tempoAtual, setTempoAtual] = useState<number>(0);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [manutencaoParaFinalizar, setManutencaoParaFinalizar] = useState<any>(null);
  const [observacoesFinal, setObservacoesFinal] = useState('');

  useEffect(() => {
    carregarManutencoes();
    
    // Timer para atualizar tempo em tempo real
    const interval = setInterval(() => {
      const emAndamento = manutencoes.find(m => 
        m.status === 'em_andamento' && m.usuario_id === user?.id
      );
      
      if (emAndamento && emAndamento.hora_inicio) {
        const agora = Date.now();
        const inicio = new Date(emAndamento.hora_inicio).getTime();
        
        // Calcular tempo total menos pausas
        let tempoPausas = 0;
        emAndamento.pausas.forEach((pausa: any) => {
          if (pausa.hora_retomada) {
            tempoPausas += new Date(pausa.hora_retomada).getTime() - new Date(pausa.hora_pausa).getTime();
          } else {
            // Pausa ativa
            tempoPausas += agora - new Date(pausa.hora_pausa).getTime();
          }
        });
        
        const tempoDecorrido = Math.floor((agora - inicio - tempoPausas) / (1000 * 60));
        setTempoAtual(tempoDecorrido);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user]);

  const carregarManutencoes = async () => {
    setLoading(true);
    try {
      const [manutencoesData, usuariosData] = await Promise.all([
        manutencaoService.getManutencoesByStatus(['aberto', 'em_andamento', 'pausada']),
        usuarioService.getUsuarios()
      ]);

      // Todos os usuários da empresa podem ver todas as manutenções pendentes
      setManutencoes(manutencoesData);
      setUsuarios(usuariosData);
    } catch (error) {

      alert('Erro ao carregar manutenções. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const iniciarManutencao = async (manutencaoId: string) => {
    setUpdating(true);
    try {
      const resultado = await manutencaoService.updateManutencao(manutencaoId, {
        status: 'em_andamento',
        hora_inicio: getDataHoraAtual(),
        usuario_id: user?.id
      });

      if (resultado) {
        await activityMarkingService.registrarInicio('manutencao');
        await carregarManutencoes();
      } else {
        alert('Erro ao iniciar manutenção');
      }
    } catch (error) {

      alert('Erro ao iniciar manutenção');
    } finally {
      setUpdating(false);
    }
  };

  const pausarManutencao = async (manutencaoId: string) => {
    setUpdating(true);
    try {
      const manutencao = manutencoes.find(m => m.id === manutencaoId);
      if (!manutencao) return;
      
      const novasPausas = [...(manutencao.pausas || [])];
      novasPausas.push({
        hora_pausa: getDataHoraAtual()
      });
      
      const resultado = await manutencaoService.updateManutencao(manutencaoId, {
        status: 'pausada',
        pausas: novasPausas
      });
      
      if (resultado) {
        await carregarManutencoes();
      } else {
        alert('Erro ao pausar manutenção');
      }
    } catch (error) {

      alert('Erro ao pausar manutenção');
    } finally {
      setUpdating(false);
    }
  };

  const retomarManutencao = async (manutencaoId: string) => {
    setUpdating(true);
    try {
      const manutencao = manutencoes.find(m => m.id === manutencaoId);
      if (!manutencao) return;
      
      const novasPausas = [...(manutencao.pausas || [])];
      if (novasPausas.length > 0 && !novasPausas[novasPausas.length - 1].hora_retomada) {
        novasPausas[novasPausas.length - 1].hora_retomada = getDataHoraAtual();
      }
      
      const resultado = await manutencaoService.updateManutencao(manutencaoId, {
        status: 'em_andamento',
        pausas: novasPausas
      });
      
      if (resultado) {
        await carregarManutencoes();
      } else {
        alert('Erro ao retomar manutenção');
      }
    } catch (error) {

      alert('Erro ao retomar manutenção');
    } finally {
      setUpdating(false);
    }
  };

  const abrirModalFinalizacao = (manutencao: any) => {
    setManutencaoParaFinalizar(manutencao);
    setObservacoesFinal(manutencao.observacoes || '');
    setShowFinalizarModal(true);
  };

  const resetarManutencaoOrfa = async (manutencaoId: string) => {
    if (!window.confirm('Resetar esta manutenção para o status "Aberto"? Isso permitirá que alguém possa iniciá-la novamente.')) {
      return;
    }

    setUpdating(true);
    try {
      const resultado = await manutencaoService.updateManutencao(manutencaoId, {
        status: 'aberto',
        usuario_id: null,
        hora_inicio: null,
        hora_fim: null,
        pausas: []
      });

      if (resultado) {
        await carregarManutencoes();
      } else {
        alert('Erro ao resetar manutenção');
      }
    } catch (error) {
      alert('Erro ao resetar manutenção. Tente novamente.');
    } finally {
      setUpdating(false);
    }
  };

  const finalizarManutencao = async () => {
    if (!manutencaoParaFinalizar) return;

    setUpdating(true);
    try {
      const agora = getDataHoraAtual();
      const inicio = new Date(manutencaoParaFinalizar.hora_inicio).getTime();
      const fim = new Date(agora).getTime();

      // Calcular tempo total menos pausas
      let tempoPausas = 0;
      (manutencaoParaFinalizar.pausas || []).forEach((pausa: any) => {
        if (pausa.hora_retomada) {
          tempoPausas += new Date(pausa.hora_retomada).getTime() - new Date(pausa.hora_pausa).getTime();
        } else {
          // Se há pausa ativa, considera até agora
          tempoPausas += fim - new Date(pausa.hora_pausa).getTime();
        }
      });

      const tempoTotal = Math.floor((fim - inicio - tempoPausas) / (1000 * 60));

      const resultado = await manutencaoService.updateManutencao(manutencaoParaFinalizar.id, {
        status: 'concluida',
        hora_fim: agora,
        observacoes: observacoesFinal,
        tempo_total: tempoTotal
      });

      if (resultado) {
        await carregarManutencoes();
        setShowFinalizarModal(false);
        setManutencaoParaFinalizar(null);
        setObservacoesFinal('');
        alert('Manutenção finalizada com sucesso!');
      } else {
        alert('Erro ao finalizar manutenção');
      }
    } catch (error) {

      alert('Erro ao finalizar manutenção');
    } finally {
      setUpdating(false);
    }
  };

  const deletarManutencao = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta solicitação de manutenção? Esta ação não pode ser desfeita.')) {
      return;
    }

    setUpdating(true);
    try {
      const success = await manutencaoService.deleteManutencao(id);

      if (success) {
        await carregarManutencoes();
        alert('Solicitação de manutenção excluída com sucesso!');
      } else {
        alert('Erro ao excluir solicitação de manutenção');
      }
    } catch (error) {
      alert('Erro ao excluir solicitação de manutenção');
    } finally {
      setUpdating(false);
    }
  };


  const handleDragStart = (e: React.DragEvent, manutencao: any) => {
    setDraggedItem(manutencao);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetManutencao: any) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.id === targetManutencao.id) {
      setDraggedItem(null);
      return;
    }

    const draggedIndex = manutencoes.findIndex(m => m.id === draggedItem.id);
    const targetIndex = manutencoes.findIndex(m => m.id === targetManutencao.id);

    const newManutencoes = [...manutencoes];
    const [removed] = newManutencoes.splice(draggedIndex, 1);
    newManutencoes.splice(targetIndex, 0, removed);

    // Reordenar os números de ordem
    const reorderedManutencoes = newManutencoes.map((manutencao, index) => ({
      ...manutencao,
      order_position: index + 1
    }));

    // Atualizar ordem no banco
    const reorderData = reorderedManutencoes.map(m => ({
      id: m.id,
      order_position: m.order_position
    }));
    
    manutencaoService.reorderManutencoes(reorderData).then(success => {
      if (success) {
        setManutencoes(reorderedManutencoes);
      } else {
        alert('Erro ao reordenar manutenções');
        carregarManutencoes(); // Recarregar em caso de erro
      }
    });
    
    setDraggedItem(null);
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'baixa': return 'bg-green-100 text-green-800';
      case 'normal': return 'bg-yellow-100 text-yellow-800';
      case 'alta': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberto': return 'bg-yellow-100 text-yellow-800';
      case 'em_andamento': return 'bg-blue-100 text-blue-800';
      case 'pausada': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'aberto': return 'Aberto';
      case 'em_andamento': return 'Em Andamento';
      case 'pausada': return 'Pausada';
      default: return status;
    }
  };

  const formatarTempo = (minutos: number) => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    if (horas > 0) {
      return `${horas}h ${mins}min`;
    }
    return `${mins}min`;
  };

  const getUsuarioNome = (usuarioId: string) => {
    const usuario = usuarios.find(u => u.id === usuarioId);
    return usuario?.name || 'Usuário não encontrado';
  };

  // Calcular estatísticas
  const totalManutencoes = manutencoes.length;
  const baixaPrioridade = manutencoes.filter(m => m.prioridade === 'baixa').length;
  const normalPrioridade = manutencoes.filter(m => m.prioridade === 'normal').length;
  const altaPrioridade = manutencoes.filter(m => m.prioridade === 'alta').length;

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
        <h1 className="text-2xl font-bold text-gray-800">Manutenções</h1>
        <p className="text-gray-600">Gerencie e execute as manutenções pendentes</p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Settings className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Pendentes</p>
              <p className="text-2xl font-bold text-gray-800">{totalManutencoes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Baixa Prioridade</p>
              <p className="text-2xl font-bold text-gray-800">{baixaPrioridade}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Normal Prioridade</p>
              <p className="text-2xl font-bold text-gray-800">{normalPrioridade}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Alta Prioridade</p>
              <p className="text-2xl font-bold text-gray-800">{altaPrioridade}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Settings className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Manutenções Pendentes</h2>
              <p className="text-sm text-gray-600">{manutencoes.length} manutenções disponíveis - Arraste para reordenar</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {manutencoes.length > 0 ? (
            <div className="space-y-4">
              {manutencoes.map((manutencao) => (
                <div 
                  key={manutencao.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, manutencao)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, manutencao)}
                  className={`p-4 bg-gray-50 border border-gray-200 rounded-lg cursor-move hover:bg-gray-100 transition-colors duration-200 ${
                    draggedItem?.id === manutencao.id ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3 mr-4">
                      <div className="flex items-center space-x-2">
                        <GripVertical className="w-5 h-5 text-gray-400" />
                        <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                          {manutencao.order_position || 1}
                        </div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-gray-800">{manutencao.local}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTipoColor(manutencao.tipo)}`}>
                          {getTipoLabel(manutencao.tipo)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPrioridadeColor(manutencao.prioridade)}`}>
                          {getPrioridadeLabel(manutencao.prioridade)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(manutencao.status)}`}>
                          {getStatusLabel(manutencao.status)}
                        </span>
                        {(manutencao.status === 'em_andamento' || manutencao.status === 'pausada') && !manutencao.usuario_id && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-300 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Estado Inválido
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-2">{manutencao.descricao}</p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                        <span>Criado: {formatarData(manutencao.data)}</span>
                        {manutencao.solicitante_id && (
                          <span className="flex items-center text-orange-600">
                            <User className="w-3 h-3 mr-1" />
                            Solicitante: {getUsuarioNome(manutencao.solicitante_id)}
                          </span>
                        )}
                        {manutencao.usuario_id && (
                          <span className="flex items-center text-blue-600">
                            <Settings className="w-3 h-3 mr-1" />
                            Executor: {getUsuarioNome(manutencao.usuario_id)}
                          </span>
                        )}
                        {manutencao.status === 'em_andamento' && manutencao.usuario_id === user?.id && (
                          <span className="flex items-center text-blue-600 font-medium">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatarTempo(tempoAtual)}
                          </span>
                        )}
                      </div>

                      {/* Alerta para manutenções órfãs */}
                      {(manutencao.status === 'em_andamento' || manutencao.status === 'pausada') && !manutencao.usuario_id && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs text-red-800 font-medium mb-1">Manutenção em estado inconsistente</p>
                              <p className="text-xs text-red-700">
                                Esta manutenção está marcada como "{getStatusLabel(manutencao.status)}" mas não possui um executor atribuído.
                                Isso pode ter ocorrido devido a um erro no sistema.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Botões de Ação */}
                      <div className="flex items-center gap-2 mt-3">
                        {/* Botão Reset para manutenções órfãs (apenas gestor) */}
                        {(manutencao.status === 'em_andamento' || manutencao.status === 'pausada') && !manutencao.usuario_id && user?.profile === 'gestor' && (
                          <button
                            onClick={() => resetarManutencaoOrfa(manutencao.id)}
                            disabled={updating}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors duration-200 text-sm"
                            title="Resetar manutenção para status Aberto"
                          >
                            <AlertTriangle className="w-4 h-4" />
                            Resetar para Aberto
                          </button>
                        )}

                        {/* Botão Iniciar: apenas para perfis manutenção ou gestor, e apenas se status for aberto */}
                        {manutencao.status === 'aberto' && (user?.profile === 'manutencao' || user?.profile === 'gestor') && (
                          <button
                            onClick={() => iniciarManutencao(manutencao.id)}
                            disabled={updating}
                            className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg flex items-center justify-center transition-colors duration-200"
                            title="Iniciar manutenção"
                          >
                            <Play className="w-5 h-5" />
                          </button>
                        )}

                        {/* Botões Pausar/Finalizar: apenas para quem está executando */}
                        {manutencao.status === 'em_andamento' && manutencao.usuario_id === user?.id && (
                          <>
                            <button
                              onClick={() => pausarManutencao(manutencao.id)}
                              disabled={updating}
                              className="bg-yellow-600 hover:bg-yellow-700 text-white p-2 rounded-lg flex items-center justify-center transition-colors duration-200"
                              title="Pausar manutenção"
                            >
                              <Pause className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => abrirModalFinalizacao(manutencao)}
                              disabled={updating}
                              className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg flex items-center justify-center transition-colors duration-200"
                              title="Concluir manutenção"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}

                        {/* Botões Retomar/Finalizar: apenas para quem está executando */}
                        {manutencao.status === 'pausada' && manutencao.usuario_id === user?.id && (
                          <>
                            <button
                              onClick={() => retomarManutencao(manutencao.id)}
                              disabled={updating}
                              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg flex items-center justify-center transition-colors duration-200"
                              title="Retomar manutenção"
                            >
                              <Play className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => abrirModalFinalizacao(manutencao)}
                              disabled={updating}
                              className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg flex items-center justify-center transition-colors duration-200"
                              title="Concluir manutenção"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}

                        {/* Botão Excluir: para gestor e manutenção */}
                        {(user?.profile === 'gestor' || user?.profile === 'manutencao') && (
                          <button
                            onClick={() => deletarManutencao(manutencao.id)}
                            disabled={updating}
                            className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg flex items-center justify-center transition-colors duration-200 ml-auto"
                            title="Excluir solicitação"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Settings className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhuma manutenção pendente</h3>
              <p className="text-gray-600">Todas as manutenções foram concluídas</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Finalização */}
      {showFinalizarModal && manutencaoParaFinalizar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  Finalizar Manutenção
                </h3>
                <button
                  onClick={() => {
                    setShowFinalizarModal(false);
                    setManutencaoParaFinalizar(null);
                    setObservacoesFinal('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Informações da Manutenção */}
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <h4 className="font-medium text-orange-800 mb-2">{manutencaoParaFinalizar.local}</h4>
                <p className="text-sm text-orange-700 mb-1">{manutencaoParaFinalizar.descricao}</p>
                <div className="flex items-center space-x-2 text-xs text-orange-600">
                  <span className={`px-2 py-1 rounded-full ${getTipoColor(manutencaoParaFinalizar.tipo)}`}>
                    {getTipoLabel(manutencaoParaFinalizar.tipo)}
                  </span>
                  <span className={`px-2 py-1 rounded-full ${getPrioridadeColor(manutencaoParaFinalizar.prioridade)}`}>
                    {getPrioridadeLabel(manutencaoParaFinalizar.prioridade)}
                  </span>
                </div>
              </div>

              {/* Campo de Observações */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Observações da Conclusão
                </label>
                <textarea
                  value={observacoesFinal}
                  onChange={(e) => setObservacoesFinal(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={4}
                  placeholder="Descreva como foi realizada a manutenção, materiais utilizados, resultados obtidos..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Registre detalhes importantes sobre a execução da manutenção
                </p>
              </div>

              {/* Botões */}
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowFinalizarModal(false);
                    setManutencaoParaFinalizar(null);
                    setObservacoesFinal('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={finalizarManutencao}
                  disabled={updating}
                  className={`flex-1 px-4 py-2 rounded-md flex items-center justify-center space-x-2 transition-colors duration-200 ${
                    updating 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{updating ? 'Finalizando...' : 'Finalizar Manutenção'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManutencoesPendentes;