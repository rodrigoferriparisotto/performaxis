import React, { useState, useEffect } from 'react';
import { Send, CheckCircle, AlertCircle, MessageSquare, Info, AlertTriangle, Users, Eye, Bell, TrendingUp, Trash2, CheckSquare, Square, Filter, Calendar, Percent } from 'lucide-react';
import { BroadcastMessageService, BroadcastMessage } from '../../services/broadcastMessageService';
import { useAuth } from '../../contexts/AuthContext';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const EnviarMensagem: React.FC = () => {
  const { user } = useAuth();
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [tipo, setTipo] = useState<'info' | 'aviso' | 'urgente'>('info');
  const [bloqueiaSistema, setBloqueiaSistema] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sentMessages, setSentMessages] = useState<(BroadcastMessage & { stats?: any })[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<'all' | 'active' | 'inactive'>('all');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<BroadcastMessage | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [understandCheckbox, setUnderstandCheckbox] = useState(false);
  const [bulkDeleteConfirmText, setBulkDeleteConfirmText] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);

  if (user?.profile === 'admin' && !user?.empresaId) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Acesso Restrito</h2>
              <p className="text-gray-700">
                O envio de mensagens broadcast é exclusivo para <strong>Gestores de Empresa</strong>.
              </p>
              <p className="text-gray-600 mt-2 text-sm">
                Super administradores não podem enviar mensagens globais. Cada empresa deve gerenciar suas próprias comunicações através do perfil de Gestor.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadSentMessages();

    // Subscribe to realtime changes for management page
    if (user?.profile === 'gestor') {
      const channel = BroadcastMessageService.subscribeToMessages(
        (newMessage) => {
          // Add new message to the list, but check if it doesn't already exist
          setSentMessages(prev => {
            // Remove any existing message with the same ID to prevent duplicates
            const filtered = prev.filter(msg => msg.id !== newMessage.id);
            return [{ ...newMessage, stats: undefined }, ...filtered];
          });
        },
        (deletedMessageId) => {
          // Remove deleted message from the list
          setSentMessages(prev => prev.filter(msg => msg.id !== deletedMessageId));
          setSelectedMessages(prev => {
            const newSet = new Set(prev);
            newSet.delete(deletedMessageId);
            return newSet;
          });
        },
        async (updatedMessage) => {
          // Update message in the list with fresh stats
          const stats = await BroadcastMessageService.getMessageStatistics(
            updatedMessage.id,
            updatedMessage.empresa_id
          );
          setSentMessages(prev =>
            prev.map(msg =>
              msg.id === updatedMessage.id ? { ...updatedMessage, stats } : msg
            )
          );
        }
      );

      return () => {
        BroadcastMessageService.unsubscribe();
      };
    }
  }, [user]);

  const loadSentMessages = async () => {
    setLoadingMessages(true);
    try {
      const messages = await BroadcastMessageService.getMessagesWithStats();
      // Remove duplicates by ID (just in case)
      const uniqueMessages = Array.from(
        new Map(messages.map(msg => [msg.id, msg])).values()
      );
      setSentMessages(uniqueMessages);
    } catch (error) {
      console.error('Error loading sent messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo.trim()) {
      setMessage({ type: 'error', text: 'Por favor, informe o título da mensagem' });
      return;
    }

    if (!conteudo.trim()) {
      setMessage({ type: 'error', text: 'Por favor, informe o conteúdo da mensagem' });
      return;
    }

    if (user?.profile !== 'gestor') {
      setMessage({ type: 'error', text: 'Apenas gestores de empresa podem enviar mensagens' });
      return;
    }

    if (!user?.empresaId) {
      setMessage({ type: 'error', text: 'Você precisa estar vinculado a uma empresa para enviar mensagens' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await BroadcastMessageService.publishMessage(
        titulo.trim(),
        conteudo.trim(),
        tipo,
        bloqueiaSistema,
        user?.empresaId || null
      );

      if (result.success) {
        setMessage({
          type: 'success',
          text: 'Mensagem enviada com sucesso! Todos os usuários conectados foram notificados.',
        });
        setTitulo('');
        setConteudo('');
        setTipo('info');
        setBloqueiaSistema(false);
        await loadSentMessages();
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Erro ao enviar mensagem',
        });
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao enviar mensagem',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (messageId: string) => {
    if (!confirm('Deseja realmente desativar esta mensagem? Ela não aparecerá mais para novos usuários.')) {
      return;
    }

    try {
      const result = await BroadcastMessageService.deactivateMessage(messageId);

      if (result.success) {
        setMessage({
          type: 'success',
          text: 'Mensagem desativada com sucesso',
        });
        await loadSentMessages();
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Erro ao desativar mensagem',
        });
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao desativar mensagem',
      });
    }
  };

  const openDeleteModal = (msg: BroadcastMessage) => {
    setMessageToDelete(msg);
    setDeleteModalOpen(true);
    setDeleteConfirmText('');
    setUnderstandCheckbox(false);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setMessageToDelete(null);
    setDeleteConfirmText('');
    setUnderstandCheckbox(false);
  };

  const handleDeleteSingle = async () => {
    if (!messageToDelete) return;

    try {
      const result = await BroadcastMessageService.deleteMessage(messageToDelete.id);

      if (result.success) {
        setMessage({
          type: 'success',
          text: 'Mensagem excluída permanentemente com sucesso',
        });
        closeDeleteModal();
        await loadSentMessages();
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Erro ao excluir mensagem',
        });
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao excluir mensagem',
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMessages.size === 0) return;

    setBulkDeleting(true);
    try {
      const result = await BroadcastMessageService.deleteMultipleMessages(Array.from(selectedMessages));

      if (result.success) {
        setMessage({
          type: 'success',
          text: `${result.deletedCount} mensagem(ns) excluída(s) com sucesso`,
        });
      } else {
        setMessage({
          type: 'error',
          text: `${result.deletedCount} excluída(s), ${result.failedCount} falharam`,
        });
      }

      setBulkDeleteModalOpen(false);
      setBulkDeleteConfirmText('');
      setSelectedMessages(new Set());
      await loadSentMessages();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao excluir mensagens',
      });
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleMessageSelection = (messageId: string) => {
    const newSelected = new Set(selectedMessages);
    if (newSelected.has(messageId)) {
      newSelected.delete(messageId);
    } else {
      newSelected.add(messageId);
    }
    setSelectedMessages(newSelected);
  };

  const selectAll = () => {
    // Ensure unique IDs only
    const uniqueIds = Array.from(new Set(filteredMessages.map(msg => msg.id)));
    setSelectedMessages(new Set(uniqueIds));
  };

  const deselectAll = () => {
    setSelectedMessages(new Set());
  };

  const selectInactive = () => {
    const inactiveIds = Array.from(new Set(sentMessages.filter(msg => !msg.ativa).map(msg => msg.id)));
    setSelectedMessages(new Set(inactiveIds));
  };

  const selectOlderThan = (days: number) => {
    const now = new Date();
    const oldIds = Array.from(new Set(
      sentMessages
        .filter(msg => differenceInDays(now, new Date(msg.created_at)) > days)
        .map(msg => msg.id)
    ));
    setSelectedMessages(new Set(oldIds));
  };

  const selectFullyRead = () => {
    const fullyReadIds = Array.from(new Set(
      sentMessages
        .filter(msg => msg.stats && msg.stats.percentual_leitura >= 100)
        .map(msg => msg.id)
    ));
    setSelectedMessages(new Set(fullyReadIds));
  };

  const getMessageAge = (createdAt: string): number => {
    return differenceInDays(new Date(), new Date(createdAt));
  };

  const filteredMessages = sentMessages.filter(msg => {
    if (filterType === 'active') return msg.ativa;
    if (filterType === 'inactive') return !msg.ativa;
    return true;
  });

  const stats = {
    total: sentMessages.length,
    active: sentMessages.filter(m => m.ativa).length,
    inactive: sentMessages.filter(m => !m.ativa).length,
    olderThan30: sentMessages.filter(m => getMessageAge(m.created_at) > 30).length,
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'info':
        return 'Informativo';
      case 'aviso':
        return 'Aviso';
      case 'urgente':
        return 'Urgente';
      default:
        return tipo;
    }
  };

  const getTipoBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'info':
        return 'bg-blue-100 text-blue-800';
      case 'aviso':
        return 'bg-yellow-100 text-yellow-800';
      case 'urgente':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center space-x-3 mb-6">
          <MessageSquare className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Enviar Mensagem para Todos</h1>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-2">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-800 font-semibold mb-1">Sistema de Entrega Garantida</p>
              <p className="text-sm text-blue-700">
                O sistema garante que TODOS os usuários recebam suas mensagens através de múltiplas camadas:
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 ml-4">
                <li>• Notificação em tempo real para usuários online</li>
                <li>• Verificação automática ao abrir o aplicativo</li>
                <li>• Notificações push mesmo com o app fechado</li>
                <li>• Mensagens com "Bloqueia Sistema" impedem uso até confirmação</li>
              </ul>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-2">
              Título da Mensagem
            </label>
            <input
              type="text"
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Manutenção Programada"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
              maxLength={100}
            />
          </div>

          <div>
            <label htmlFor="conteudo" className="block text-sm font-medium text-gray-700 mb-2">
              Conteúdo da Mensagem
            </label>
            <textarea
              id="conteudo"
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder="Digite aqui o conteúdo da mensagem..."
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Mensagem
              </label>
              <select
                id="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as 'info' | 'aviso' | 'urgente')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                <option value="info">Informativo</option>
                <option value="aviso">Aviso</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Opções
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bloqueiaSistema}
                  onChange={(e) => setBloqueiaSistema(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={loading}
                />
                <span className="text-sm text-gray-700">
                  Bloquear sistema até confirmar leitura
                </span>
              </label>
            </div>
          </div>

          {message && (
            <div
              className={`flex items-start space-x-2 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <p
                className={`text-sm ${
                  message.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {message.text}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Send className="w-5 h-5 animate-pulse" />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Enviar Mensagem</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Sent messages history */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Info className="w-5 h-5 text-blue-600" />
          <span>Mensagens Enviadas</span>
        </h2>

        {loadingMessages ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Carregando...</p>
          </div>
        ) : sentMessages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>Nenhuma mensagem enviada ainda</p>
          </div>
        ) : (
          <>
            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-xs text-gray-600">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                <div className="text-xs text-gray-600">Ativas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
                <div className="text-xs text-gray-600">Inativas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.olderThan30}</div>
                <div className="text-xs text-gray-600">Antigas (30+ dias)</div>
              </div>
            </div>

            {/* Filters and Bulk Actions */}
            <div className="mb-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="w-4 h-4 text-gray-600" />
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1 text-sm rounded ${
                    filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFilterType('active')}
                  className={`px-3 py-1 text-sm rounded ${
                    filterType === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Ativas
                </button>
                <button
                  onClick={() => setFilterType('inactive')}
                  className={`px-3 py-1 text-sm rounded ${
                    filterType === 'inactive' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Inativas
                </button>
              </div>

              <div className="border-t pt-3">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-700">Seleção rápida:</span>
                  <button
                    onClick={selectAll}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Todas visíveis
                  </button>
                  <button
                    onClick={deselectAll}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Nenhuma
                  </button>
                  <button
                    onClick={selectInactive}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Inativas
                  </button>
                  <button
                    onClick={() => selectOlderThan(30)}
                    className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                  >
                    Mais de 30 dias
                  </button>
                  <button
                    onClick={() => selectOlderThan(60)}
                    className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                  >
                    Mais de 60 dias
                  </button>
                  <button
                    onClick={selectFullyRead}
                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    100% lidas
                  </button>
                </div>

                {selectedMessages.size > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                    <span className="text-sm font-medium text-red-900">
                      {selectedMessages.size} mensagem(ns) selecionada(s)
                    </span>
                    <button
                      onClick={() => setBulkDeleteModalOpen(true)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg flex items-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Excluir Selecionadas</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Messages List */}
            <div className="space-y-4">
              {filteredMessages.map((msg) => {
                const age = getMessageAge(msg.created_at);
                return (
                  <div
                    key={msg.id}
                    className={`border rounded-lg p-4 ${
                      msg.ativa ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-60'
                    } ${selectedMessages.has(msg.id) ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <div className="flex items-start space-x-3">
                      <button
                        onClick={() => toggleMessageSelection(msg.id)}
                        className="mt-1 flex-shrink-0"
                      >
                        {selectedMessages.has(msg.id) ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>

                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1 flex-wrap">
                              <h3 className="font-semibold text-gray-900">{msg.titulo}</h3>
                              <span className={`text-xs px-2 py-1 rounded ${getTipoBadgeColor(msg.tipo)}`}>
                                {getTipoLabel(msg.tipo)}
                              </span>
                              {msg.bloqueia_sistema && (
                                <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-800">
                                  Bloqueia
                                </span>
                              )}
                              {!msg.ativa && (
                                <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700">
                                  Inativa
                                </span>
                              )}
                              {age > 30 && (
                                <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700">
                                  {age} dias
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2">{msg.conteudo}</p>
                          </div>

                          <div className="ml-4 flex space-x-2">
                            {msg.ativa && (
                              <button
                                onClick={() => handleDeactivate(msg.id)}
                                className="text-yellow-600 hover:text-yellow-700 text-sm font-medium whitespace-nowrap"
                                title="Oculta de novos usuários, mas mantém histórico"
                              >
                                Desativar
                              </button>
                            )}
                            <button
                              onClick={() => openDeleteModal(msg)}
                              className="text-red-600 hover:text-red-700 text-sm font-medium whitespace-nowrap"
                              title="Remove permanentemente a mensagem e todos os dados relacionados"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                            <div className="flex items-center space-x-4">
                              <span>Por: {msg.autor?.name || 'Desconhecido'}</span>
                              <span>
                                {format(new Date(msg.created_at), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                          </div>

                          {msg.stats && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                              <div className="flex items-center space-x-2">
                                <Eye className="w-4 h-4 text-green-600" />
                                <div className="text-xs">
                                  <span className="font-semibold text-green-700">{msg.stats.usuarios_leram}</span>
                                  <span className="text-gray-500"> lidas</span>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <AlertCircle className="w-4 h-4 text-orange-600" />
                                <div className="text-xs">
                                  <span className="font-semibold text-orange-700">{msg.stats.nao_lidas || 0}</span>
                                  <span className="text-gray-500"> pendentes</span>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Bell className="w-4 h-4 text-blue-600" />
                                <div className="text-xs">
                                  <span className="font-semibold text-blue-700">{msg.stats.push_enviadas || 0}</span>
                                  <span className="text-gray-500"> notificadas</span>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <TrendingUp className="w-4 h-4 text-purple-600" />
                                <div className="text-xs">
                                  <span className="font-semibold text-purple-700">{msg.stats.percentual_leitura.toFixed(0)}%</span>
                                  <span className="text-gray-500"> entregue</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="bg-gray-50 rounded-lg shadow-md p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Como Funciona</h2>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 font-bold">1.</span>
            <span>Escreva o título e conteúdo da mensagem</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 font-bold">2.</span>
            <span>Escolha o tipo: Informativo (azul), Aviso (amarelo) ou Urgente (vermelho)</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 font-bold">3.</span>
            <span>
              Opcionalmente, marque "Bloquear sistema" se a mensagem for crítica e exigir confirmação
            </span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 font-bold">4.</span>
            <span>
              Clique em "Enviar Mensagem" - todos os usuários conectados receberão notificação instantânea
            </span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 font-bold">5.</span>
            <span>
              Acompanhe as estatísticas de leitura para saber quantos usuários já confirmaram
            </span>
          </li>
        </ul>

        <div className="mt-4 pt-4 border-t">
          <h3 className="font-semibold text-gray-900 mb-2">Diferença entre Desativar e Excluir</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <div>
              <span className="font-medium text-yellow-700">Desativar:</span> Oculta a mensagem de novos usuários, mas mantém o histórico e estatísticas. Use quando quiser arquivar mensagens antigas mas manter os dados.
            </div>
            <div>
              <span className="font-medium text-red-700">Excluir:</span> Remove permanentemente a mensagem e todos os dados relacionados (estatísticas de leitura, logs de notificações). Use apenas para limpeza definitiva de mensagens obsoletas.
            </div>
          </div>
        </div>
      </div>

      {/* Delete Single Message Modal */}
      {deleteModalOpen && messageToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start lg:items-center justify-center pt-20 lg:pt-4 px-4 pb-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[calc(100vh-80px)] lg:max-h-[90vh] flex flex-col">
            {/* Header - Fixed */}
            <div className="flex items-start space-x-3 p-6 pb-4 border-b border-gray-200">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Excluir Mensagem Permanentemente</h3>
                <p className="text-sm text-gray-600 mt-1">Esta ação não pode ser desfeita!</p>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="mb-3">
                  <div className="font-semibold text-gray-900">{messageToDelete.titulo}</div>
                  <div className="text-sm text-gray-600 mt-1">{messageToDelete.conteudo}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    Enviada em {format(new Date(messageToDelete.created_at), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                  </div>
                </div>

                {messageToDelete.stats && (
                  <div className="text-sm text-gray-700 space-y-1">
                    <div>Total de usuários: {messageToDelete.stats.total_usuarios}</div>
                    <div>Leituras confirmadas: {messageToDelete.stats.usuarios_leram}</div>
                    <div>Notificações enviadas: {messageToDelete.stats.push_enviadas || 0}</div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <span className="font-semibold">Atenção:</span> Esta ação irá remover permanentemente:
                  </p>
                  <ul className="text-sm text-yellow-700 mt-2 ml-4 space-y-1">
                    <li>A mensagem broadcast</li>
                    <li>Todos os registros de leitura ({messageToDelete.stats?.usuarios_leram || 0} registros)</li>
                    <li>Logs de notificações push relacionadas</li>
                    <li>Todas as estatísticas associadas</li>
                  </ul>
                </div>

                <div>
                  <label className="flex items-start space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={understandCheckbox}
                      onChange={(e) => setUnderstandCheckbox(e.target.checked)}
                      className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">
                      Entendo que esta ação não pode ser desfeita e que todos os dados relacionados serão perdidos permanentemente
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Digite "EXCLUIR" para confirmar:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="EXCLUIR"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="flex space-x-3 p-6 pt-4 border-t border-gray-200">
              <button
                onClick={closeDeleteModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteSingle}
                disabled={!understandCheckbox || deleteConfirmText !== 'EXCLUIR'}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg"
              >
                Excluir Permanentemente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {bulkDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start lg:items-center justify-center pt-20 lg:pt-4 px-4 pb-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[calc(100vh-80px)] lg:max-h-[90vh] flex flex-col">
            {/* Header - Fixed */}
            <div className="flex items-start space-x-3 p-6 pb-4 border-b border-gray-200">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Excluir Múltiplas Mensagens</h3>
                <p className="text-sm text-gray-600 mt-1">Você está prestes a excluir {selectedMessages.size} mensagem(ns) permanentemente!</p>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 max-h-48 overflow-y-auto">
                <div className="space-y-2">
                  {Array.from(selectedMessages).map((msgId, index) => {
                    const msg = sentMessages.find(m => m.id === msgId);
                    if (!msg) return null;
                    // Use a composite key with index to ensure uniqueness
                    return (
                      <div key={`${msgId}-${index}`} className="text-sm border-b border-red-100 pb-2 last:border-b-0">
                        <div className="font-semibold text-gray-900">{msg.titulo}</div>
                        <div className="text-xs text-gray-600 flex items-center space-x-3 mt-1">
                          <span>{format(new Date(msg.created_at), "d 'de' MMM", { locale: ptBR })}</span>
                          {msg.stats && (
                            <>
                              <span>{msg.stats.usuarios_leram} lidas</span>
                              <span>{msg.stats.push_enviadas || 0} notificações</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 font-semibold mb-2">
                  Estatísticas Agregadas:
                </p>
                <div className="text-sm text-yellow-700 space-y-1">
                  <div>Total de mensagens: {selectedMessages.size}</div>
                  <div>
                    Total de registros de leitura: {
                      Array.from(selectedMessages).reduce((sum, msgId) => {
                        const msg = sentMessages.find(m => m.id === msgId);
                        return sum + (msg?.stats?.usuarios_leram || 0);
                      }, 0)
                    }
                  </div>
                  <div>
                    Total de notificações enviadas: {
                      Array.from(selectedMessages).reduce((sum, msgId) => {
                        const msg = sentMessages.find(m => m.id === msgId);
                        return sum + (msg?.stats?.push_enviadas || 0);
                      }, 0)
                    }
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                  <p className="text-sm text-red-900 font-semibold">
                    Todos esses dados serão perdidos permanentemente e não poderão ser recuperados!
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Digite "EXCLUIR" para confirmar a exclusão em massa:
                  </label>
                  <input
                    type="text"
                    value={bulkDeleteConfirmText}
                    onChange={(e) => setBulkDeleteConfirmText(e.target.value)}
                    placeholder="EXCLUIR"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    disabled={bulkDeleting}
                  />
                </div>
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="flex space-x-3 p-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setBulkDeleteModalOpen(false);
                  setBulkDeleteConfirmText('');
                }}
                disabled={bulkDeleting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleteConfirmText !== 'EXCLUIR' || bulkDeleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg flex items-center justify-center space-x-2"
              >
                {bulkDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <span>Excluir {selectedMessages.size} Mensagem(ns)</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
