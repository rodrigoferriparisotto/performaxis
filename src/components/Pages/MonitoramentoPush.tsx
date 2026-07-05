import React, { useState, useEffect } from 'react';
import { Bell, TrendingUp, CheckCircle, XCircle, Clock, BarChart3, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fcmPushService } from '../../services/fcmPushService';

interface PushLog {
  id: string;
  tipo: string;
  titulo: string;
  corpo: string;
  usuario_id: string | null;
  empresa_id: string | null;
  tokens_alvo: string[];
  sucesso_count: number;
  falha_count: number;
  tentativas: number;
  enviado_em: string;
  usuario?: { name: string };
  empresa?: { nome: string };
}

export default function MonitoramentoPush() {
  const [stats, setStats] = useState({
    totalTokens: 0,
    activeTokens: 0,
    inactiveTokens: 0,
    todayNotifications: 0,
    weekNotifications: 0,
    successRate: 0,
    totalSuccess: 0,
    totalFailure: 0,
  });
  const [logs, setLogs] = useState<PushLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<PushLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, filterType]);

  const loadData = async () => {
    try {
      setLoading(true);
      const statistics = await fcmPushService.obterEstatisticas();
      setStats(statistics);

      const { data: logsData, error } = await supabase
        .from('push_notifications_log')
        .select(`
          *,
          usuario:usuarios(name),
          empresa:empresas(nome)
        `)
        .order('enviado_em', { ascending: false })
        .limit(100);

      if (error) throw error;

      setLogs(logsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    if (filterType === 'all') {
      setFilteredLogs(logs);
    } else {
      setFilteredLogs(logs.filter((log) => log.tipo === filterType));
    }
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

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      reminder: 'Lembrete',
      inactivity: 'Inatividade',
      broadcast: 'Broadcast',
      update: 'Atualização',
      test: 'Teste',
      custom: 'Personalizado',
    };
    return labels[tipo] || tipo;
  };

  const getTipoBadgeColor = (tipo: string) => {
    const colors: Record<string, string> = {
      reminder: 'bg-blue-100 text-blue-800',
      inactivity: 'bg-orange-100 text-orange-800',
      broadcast: 'bg-purple-100 text-purple-800',
      update: 'bg-green-100 text-green-800',
      test: 'bg-gray-100 text-gray-800',
      custom: 'bg-teal-100 text-teal-800',
    };
    return colors[tipo] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Carregando dados...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard de Push Notifications</h1>
              <p className="text-sm text-gray-600">Monitore o desempenho das notificações push</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Bell className="w-6 h-6 text-blue-600" />
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-900">{stats.activeTokens}</p>
            <p className="text-sm text-blue-700">Tokens Ativos</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <span className="text-xs font-medium text-green-700">{stats.successRate}%</span>
            </div>
            <p className="text-2xl font-bold text-green-900">{stats.totalSuccess}</p>
            <p className="text-sm text-green-700">Envios Bem-Sucedidos</p>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-900">{stats.todayNotifications}</p>
            <p className="text-sm text-orange-700">Notificações Hoje</p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-900">{stats.weekNotifications}</p>
            <p className="text-sm text-purple-700">Notificações (7 dias)</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Histórico de Notificações</h2>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Todos os Tipos</option>
            <option value="reminder">Lembretes</option>
            <option value="inactivity">Inatividade</option>
            <option value="broadcast">Broadcast</option>
            <option value="update">Atualizações</option>
            <option value="test">Testes</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Data/Hora</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Tipo</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Título</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Destinatário</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Tokens</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Sucesso</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Falha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Nenhuma notificação encontrada
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900">{formatDate(log.enviado_em)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getTipoBadgeColor(log.tipo)}`}
                      >
                        {getTipoLabel(log.tipo)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{log.titulo}</p>
                      <p className="text-sm text-gray-500 line-clamp-1">{log.corpo}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900">
                        {log.usuario?.name || log.empresa?.nome || 'Todos'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <p className="text-sm font-medium text-gray-900">{log.tokens_alvo.length}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        {log.sucesso_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-red-600">
                        <XCircle className="w-4 h-4" />
                        {log.falha_count}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredLogs.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 text-center">
            Mostrando {filteredLogs.length} notificações
          </div>
        )}
      </div>
    </div>
  );
}
