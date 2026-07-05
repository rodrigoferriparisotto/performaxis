import React, { useState, useEffect } from 'react';
import { Smartphone, Activity, X, Check, TestTube, RefreshCw, Search, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fcmPushService } from '../../services/fcmPushService';
import type { PushToken } from '../../services/fcmPushService';
import { parseDeviceInfo } from '../../utils/deviceInfoParser';

export default function GerenciarTokensPush() {
  const [tokens, setTokens] = useState<PushToken[]>([]);
  const [filteredTokens, setFilteredTokens] = useState<PushToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testingToken, setTestingToken] = useState<string | null>(null);

  useEffect(() => {
    loadTokens();
  }, []);

  useEffect(() => {
    filterTokensList();
  }, [tokens, searchTerm, filterStatus]);

  const loadTokens = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('push_tokens')
        .select(`
          *,
          usuario:usuarios(
            name,
            login,
            empresa:empresas(nome)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTokens(data || []);
    } catch (error) {
      console.error('Error loading tokens:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar tokens' });
    } finally {
      setLoading(false);
    }
  };

  const filterTokensList = () => {
    let filtered = tokens;

    if (filterStatus !== 'all') {
      filtered = filtered.filter((t) => t.is_active === (filterStatus === 'active'));
    }

    if (searchTerm) {
      filtered = filtered.filter((t) => {
        const searchLower = searchTerm.toLowerCase();
        const deviceInfo = parseDeviceInfo(t.device_info);
        return (
          t.usuario?.name?.toLowerCase().includes(searchLower) ||
          t.usuario?.login?.toLowerCase().includes(searchLower) ||
          deviceInfo.browser?.toLowerCase().includes(searchLower) ||
          deviceInfo.os?.toLowerCase().includes(searchLower) ||
          deviceInfo.device?.toLowerCase().includes(searchLower)
        );
      });
    }

    setFilteredTokens(filtered);
  };

  const handleTestToken = async (token: PushToken) => {
    setTestingToken(token.id);
    try {
      const result = await fcmPushService.testarNotificacao(token.usuario_id, token.token);

      if (result.success) {
        setMessage({
          type: 'success',
          text: `Notificação teste enviada com sucesso para ${token.usuario?.name}`,
        });
      } else {
        setMessage({
          type: 'error',
          text: `Falha ao enviar notificação: ${result.errors?.join(', ')}`,
        });
      }
    } catch (error) {
      console.error('Error testing token:', error);
      setMessage({ type: 'error', text: 'Erro ao testar notificação' });
    } finally {
      setTestingToken(null);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleToggleToken = async (tokenId: string, currentStatus: boolean) => {
    try {
      const success = currentStatus
        ? await fcmPushService.desativarToken(tokenId)
        : await fcmPushService.reativarToken(tokenId);

      if (success) {
        setMessage({
          type: 'success',
          text: currentStatus ? 'Token desativado' : 'Token reativado',
        });
        await loadTokens();
      } else {
        setMessage({ type: 'error', text: 'Erro ao atualizar token' });
      }
    } catch (error) {
      console.error('Error toggling token:', error);
      setMessage({ type: 'error', text: 'Erro ao atualizar token' });
    }

    setTimeout(() => setMessage(null), 3000);
  };

  const getDeviceIcon = (device: string) => {
    return <Smartphone className="w-5 h-5" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const stats = {
    total: tokens.length,
    active: tokens.filter((t) => t.is_active).length,
    inactive: tokens.filter((t) => !t.is_active).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Carregando tokens...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Smartphone className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gerenciar Tokens Push</h1>
              <p className="text-sm text-gray-600">Visualize e gerencie todos os dispositivos registrados</p>
            </div>
          </div>
          <button
            onClick={loadTokens}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">Total de Tokens</p>
                <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
              </div>
              <Smartphone className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-900">Tokens Ativos</p>
                <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              </div>
              <Activity className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Tokens Inativos</p>
                <p className="text-3xl font-bold text-gray-600">{stats.inactive}</p>
              </div>
              <X className="w-8 h-8 text-gray-400" />
            </div>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por usuário, email, dispositivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 border border-gray-300 rounded-lg p-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="border-0 bg-transparent focus:ring-0 text-sm"
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Usuário</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Empresa</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Dispositivo</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Registrado em</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Último uso</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTokens.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Nenhum token encontrado
                  </td>
                </tr>
              ) : (
                filteredTokens.map((token) => {
                  const deviceInfo = parseDeviceInfo(token.device_info);
                  return (
                    <tr key={token.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{token.usuario?.name || 'N/A'}</p>
                          <p className="text-sm text-gray-500">{token.usuario?.login || ''}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">{token.usuario?.empresa?.nome || 'N/A'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(deviceInfo.device)}
                          <div>
                            <p className="text-sm font-medium text-gray-900 capitalize">
                              {deviceInfo.device}
                            </p>
                            <p className="text-xs text-gray-500">{deviceInfo.browser} - {deviceInfo.os}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {token.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                            <Check className="w-3 h-3" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">
                            <X className="w-3 h-3" />
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-600">{formatDate(token.created_at)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-600">
                          {token.last_used_at ? formatDate(token.last_used_at) : 'Nunca'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleTestToken(token)}
                            disabled={testingToken === token.id || !token.is_active}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Testar notificação"
                          >
                            {testingToken === token.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <TestTube className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleToggleToken(token.id, token.is_active)}
                            className={`p-2 rounded-lg transition-colors ${
                              token.is_active
                                ? 'text-red-600 hover:bg-red-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={token.is_active ? 'Desativar' : 'Reativar'}
                          >
                            {token.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredTokens.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 text-center">
            Mostrando {filteredTokens.length} de {tokens.length} tokens
          </div>
        )}
      </div>
    </div>
  );
}
