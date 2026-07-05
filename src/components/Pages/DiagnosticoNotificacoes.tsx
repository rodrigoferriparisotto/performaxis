import { useState, useEffect } from 'react';
import { Bell, Clock, Activity, CheckCircle, XCircle, RefreshCw, Smartphone, Trash2, AlertTriangle, Eye, EyeOff, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { activityTrackingService } from '../../services/activityTrackingService';
import { supabase } from '../../lib/supabase';
import { notificationService } from '../../services/notificationService';
import { notificationQueueService } from '../../services/notificationQueueService';
import { requestPushNotificationPermission } from '../../services/firebasePushService';

interface PushNotificationLog {
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
  dados: any;
  enviado_em: string;
  created_at: string;
}

interface TokenHealth {
  id: string;
  usuario_nome: string;
  token: string;
  is_active: boolean;
  error_count: number;
  last_error: string | null;
  last_success_at: string | null;
  health_status: string;
  activity_status: string;
  fcm_error_code?: string | null;
}

interface CicloInatividade {
  usuario_id: string;
  empresa_id: string;
  ciclo_iniciado_em: string;
  ultima_marcacao_em: string;
  marcadores_enviados: number[];
  proximo_marcador: number | null;
  ciclo_completo: boolean;
  ultima_verificacao_em: string;
}

interface DiagnosticData {
  lastActivity: Date | null;
  minutesInactive: number;
  hasOpenRecords: boolean;
  openModules: string[];
  fcmTokens: number;
  notificationPermission: string;
  lastNotifications: PushNotificationLog[];
  lastVerifications: any[];
  tokenHealth: TokenHealth[];
  cicloInatividade: CicloInatividade | null;
  appVisibility: {
    isVisible: boolean;
    isFocused: boolean;
    visibilityState: string;
  };
  queueStats: {
    total: number;
    pending: number;
    delivered: number;
    failed: number;
  };
}

export function DiagnosticoNotificacoes() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticData | null>(null);
  const [forceCheckLoading, setForceCheckLoading] = useState(false);
  const [forceCheckResult, setForceCheckResult] = useState<string | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);
  const [deletingTokenId, setDeletingTokenId] = useState<string | null>(null);
  const [registeringToken, setRegisteringToken] = useState(false);
  const [registerResult, setRegisterResult] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadDiagnosticData();
    }
  }, [user]);

  const loadDiagnosticData = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const [
        lastActivity,
        minutesInactive,
        openRecordsResult,
        tokensResult,
        notificationsResult,
        verificationsResult,
        tokenHealthResult,
        cicloInactividadeResult,
        queueStats
      ] = await Promise.all([
        activityTrackingService.getLastActivity(user.id),
        activityTrackingService.getMinutesInactive(user.id),
        activityTrackingService.hasOpenRecords(user.id),
        supabase
          .from('push_tokens')
          .select('token, is_active, created_at')
          .eq('usuario_id', user.id),
        supabase
          .from('push_notifications_log')
          .select('id, tipo, titulo, corpo, usuario_id, empresa_id, tokens_alvo, sucesso_count, falha_count, tentativas, dados, enviado_em, created_at')
          .eq('usuario_id', user.id)
          .order('enviado_em', { ascending: false })
          .limit(5),
        supabase
          .from('logs_verificacao_inatividade')
          .select('*')
          .gte('executado_em', new Date(Date.now() - 30 * 60 * 1000).toISOString())
          .order('executado_em', { ascending: false })
          .limit(5),
        supabase
          .from('push_tokens_health')
          .select('*')
          .eq('usuario_id', user.id),
        supabase
          .from('controle_ciclo_inatividade')
          .select('*')
          .eq('usuario_id', user.id)
          .maybeSingle(),
        notificationQueueService.getQueueStats()
      ]);

      setDiagnosticData({
        lastActivity,
        minutesInactive,
        hasOpenRecords: openRecordsResult.hasOpen,
        openModules: openRecordsResult.modules,
        fcmTokens: tokensResult.data?.filter(t => t.is_active).length || 0,
        notificationPermission: Notification.permission,
        lastNotifications: notificationsResult.data || [],
        lastVerifications: verificationsResult.data || [],
        tokenHealth: tokenHealthResult.data || [],
        cicloInatividade: cicloInactividadeResult.data || null,
        appVisibility: {
          isVisible: !document.hidden,
          isFocused: document.hasFocus(),
          visibilityState: document.visibilityState,
        },
        queueStats
      });
    } catch (error) {
      console.error('Erro ao carregar diagnóstico:', error);
    } finally {
      setLoading(false);
    }
  };

  const forceInactivityCheck = async () => {
    if (!user) return;

    setForceCheckLoading(true);
    setForceCheckResult(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/check-inactivity-reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setForceCheckResult(`Verificação concluída! ${result.notificacoesEnviadas} notificações enviadas de ${result.usuariosVerificados} usuários verificados.`);
      } else {
        setForceCheckResult(`Erro: ${result.message || 'Erro desconhecido'}`);
      }

      await loadDiagnosticData();
    } catch (error: any) {
      setForceCheckResult(`Erro: ${error.message}`);
    } finally {
      setForceCheckLoading(false);
    }
  };

  const requestNotificationPermission = async () => {
    const granted = await notificationService.requestPermission();
    if (granted) {
      await loadDiagnosticData();
    }
  };

  const cleanupInvalidTokens = async () => {
    if (!confirm('Deseja limpar todos os tokens inválidos? Esta ação não pode ser desfeita.')) {
      return;
    }

    setCleanupLoading(true);
    setCleanupResult(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        setCleanupResult('Erro: Sessão inválida');
        return;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/cleanup-invalid-push-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setCleanupResult(`Limpeza concluída! ${result.totalDeleted} tokens removidos.`);
      } else {
        setCleanupResult(`Erro: ${result.error || 'Erro desconhecido'}`);
      }

      await loadDiagnosticData();
    } catch (error: any) {
      setCleanupResult(`Erro: ${error.message}`);
    } finally {
      setCleanupLoading(false);
    }
  };

  const registerTokenManually = async () => {
    if (!user?.id) return;

    setRegisteringToken(true);
    setRegisterResult(null);

    try {
      const token = await requestPushNotificationPermission(user.id);

      if (token) {
        setRegisterResult('Token registrado com sucesso!');
        await loadDiagnosticData();
      } else {
        setRegisterResult('Erro: Não foi possível obter o token. Verifique as permissões e configurações do Firebase.');
      }
    } catch (error: any) {
      setRegisterResult(`Erro: ${error.message}`);
    } finally {
      setRegisteringToken(false);
    }
  };

  const deleteIndividualToken = async (tokenId: string) => {
    if (!confirm('Deseja remover este token? Esta ação não pode ser desfeita.')) {
      return;
    }

    setDeletingTokenId(tokenId);

    try {
      const { error } = await supabase
        .from('push_tokens')
        .delete()
        .eq('id', tokenId);

      if (error) throw error;

      await loadDiagnosticData();
    } catch (error: any) {
      alert(`Erro ao remover token: ${error.message}`);
    } finally {
      setDeletingTokenId(null);
    }
  };

  if (loading && !diagnosticData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Diagnóstico de Notificações</h1>
        </div>
        <button
          onClick={loadDiagnosticData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {diagnosticData && (
        <>
          <div className="bg-white p-6 rounded-lg shadow-md border-2 border-blue-200">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg mb-2">Estatísticas de Tokens FCM</h3>
                  <div className="grid grid-cols-3 gap-4 md:gap-6">
                    <div>
                      <p className="text-sm text-gray-600">Total Ativos</p>
                      <p className="text-2xl md:text-3xl font-bold text-green-600">
                        {diagnosticData.tokenHealth.filter(t => t.is_active && t.health_status === 'healthy').length}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Com Problemas</p>
                      <p className="text-2xl md:text-3xl font-bold text-orange-600">
                        {diagnosticData.tokenHealth.filter(t => ['warning', 'critical'].includes(t.health_status)).length}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">UNREGISTERED</p>
                      <p className="text-2xl md:text-3xl font-bold text-red-600">
                        {diagnosticData.tokenHealth.filter(t => t.fcm_error_code === 'UNREGISTERED').length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 w-full md:w-auto">
                  {diagnosticData.tokenHealth.filter(t => !t.is_active || t.error_count >= 3 || t.fcm_error_code === 'UNREGISTERED').length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>Tokens inválidos detectados</span>
                    </div>
                  )}
                  <button
                    onClick={cleanupInvalidTokens}
                    disabled={cleanupLoading}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 whitespace-nowrap"
                  >
                    <Trash2 className={`w-4 h-4 ${cleanupLoading ? 'animate-spin' : ''}`} />
                    {cleanupLoading ? 'Limpando...' : 'Limpar Tokens Inválidos'}
                  </button>
                </div>
              </div>
              {cleanupResult && (
                <div className={`p-3 rounded ${
                  cleanupResult.startsWith('Erro') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                  {cleanupResult}
                </div>
              )}
            </div>
          </div>

          {diagnosticData.fcmTokens === 0 && diagnosticData.notificationPermission === 'granted' && (
            <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-900 text-lg mb-2">
                    Permissão Concedida mas Nenhum Token Registrado
                  </h3>
                  <p className="text-orange-800 mb-4">
                    Você concedeu permissão para notificações, mas nenhum token FCM está registrado no banco de dados.
                    Clique no botão abaixo para tentar registrar seu token agora.
                  </p>
                  <button
                    onClick={registerTokenManually}
                    disabled={registeringToken}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                  >
                    <Plus className={`w-4 h-4 ${registeringToken ? 'animate-spin' : ''}`} />
                    {registeringToken ? 'Registrando...' : 'Registrar Token Agora'}
                  </button>
                  {registerResult && (
                    <div className={`mt-3 p-3 rounded ${
                      registerResult.startsWith('Erro') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {registerResult}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-6 h-6 text-blue-600" />
                <h3 className="font-semibold text-gray-700">Última Atividade</h3>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {diagnosticData.lastActivity
                  ? new Date(diagnosticData.lastActivity).toLocaleString('pt-BR')
                  : 'Nenhuma atividade registrada'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {diagnosticData.minutesInactive} minutos de inatividade
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <Activity className="w-6 h-6 text-orange-600" />
                <h3 className="font-semibold text-gray-700">Registros Abertos</h3>
              </div>
              <div className="flex items-center gap-2">
                {diagnosticData.hasOpenRecords ? (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                ) : (
                  <XCircle className="w-8 h-8 text-gray-400" />
                )}
                <p className="text-2xl font-bold text-gray-900">
                  {diagnosticData.hasOpenRecords ? 'Sim' : 'Não'}
                </p>
              </div>
              {diagnosticData.openModules.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {diagnosticData.openModules.join(', ')}
                </p>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <Smartphone className="w-6 h-6 text-purple-600" />
                <h3 className="font-semibold text-gray-700">Tokens FCM</h3>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {diagnosticData.fcmTokens}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                dispositivos ativos
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <Bell className="w-6 h-6 text-green-600" />
                <h3 className="font-semibold text-gray-700">Permissão</h3>
              </div>
              <div className="flex items-center gap-2">
                {diagnosticData.notificationPermission === 'granted' ? (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600" />
                )}
                <p className="text-lg font-bold text-gray-900">
                  {diagnosticData.notificationPermission === 'granted' ? 'Concedida' :
                   diagnosticData.notificationPermission === 'denied' ? 'Negada' : 'Pendente'}
                </p>
              </div>
              {diagnosticData.notificationPermission !== 'granted' && (
                <button
                  onClick={requestNotificationPermission}
                  className="mt-2 text-sm text-blue-600 hover:underline"
                >
                  Solicitar permissão
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                {diagnosticData.appVisibility.isVisible && diagnosticData.appVisibility.isFocused ? (
                  <Eye className="w-6 h-6 text-green-600" />
                ) : (
                  <EyeOff className="w-6 h-6 text-orange-600" />
                )}
                <h3 className="font-semibold text-gray-700">Estado do App</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Visibilidade:</span>
                  <span className={`font-semibold ${diagnosticData.appVisibility.isVisible ? 'text-green-600' : 'text-orange-600'}`}>
                    {diagnosticData.appVisibility.isVisible ? 'Visível' : 'Oculto'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Foco:</span>
                  <span className={`font-semibold ${diagnosticData.appVisibility.isFocused ? 'text-green-600' : 'text-orange-600'}`}>
                    {diagnosticData.appVisibility.isFocused ? 'Focado' : 'Sem foco'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Estado:</span>
                  <span className="font-semibold text-gray-900">{diagnosticData.appVisibility.visibilityState}</span>
                </div>
              </div>
              <div className={`mt-3 p-2 rounded text-xs ${
                diagnosticData.appVisibility.isVisible && diagnosticData.appVisibility.isFocused
                  ? 'bg-green-100 text-green-800'
                  : 'bg-orange-100 text-orange-800'
              }`}>
                {diagnosticData.appVisibility.isVisible && diagnosticData.appVisibility.isFocused
                  ? 'App em FOREGROUND - Alertas visuais serão exibidos dentro do app'
                  : 'App em BACKGROUND - Push notifications serão exibidas pelo sistema'}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <Bell className="w-6 h-6 text-indigo-600" />
                <h3 className="font-semibold text-gray-700">Fila de Notificações</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-xl font-bold text-gray-900">{diagnosticData.queueStats.total}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pendentes</p>
                  <p className="text-xl font-bold text-orange-600">{diagnosticData.queueStats.pending}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Entregues</p>
                  <p className="text-xl font-bold text-green-600">{diagnosticData.queueStats.delivered}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Falhas</p>
                  <p className="text-xl font-bold text-red-600">{diagnosticData.queueStats.failed}</p>
                </div>
              </div>
            </div>
          </div>

          {diagnosticData.hasOpenRecords && (
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                Ciclo de Notificações de Inatividade
              </h3>

              {diagnosticData.cicloInatividade ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700 mb-1">Ciclo Iniciado Em</p>
                      <p className="text-sm font-semibold text-blue-900">
                        {new Date(diagnosticData.cicloInatividade.ciclo_iniciado_em).toLocaleString('pt-BR')}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Há {Math.floor((Date.now() - new Date(diagnosticData.cicloInatividade.ciclo_iniciado_em).getTime()) / 60000)} minutos
                      </p>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <p className="text-sm text-purple-700 mb-1">Próximo Marcador</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {diagnosticData.cicloInatividade.proximo_marcador ? (
                          `${diagnosticData.cicloInatividade.proximo_marcador} min`
                        ) : (
                          'Ciclo Completo'
                        )}
                      </p>
                      {diagnosticData.cicloInatividade.proximo_marcador && (
                        <p className="text-xs text-purple-600 mt-1">
                          Faltam {Math.max(0, diagnosticData.cicloInatividade.proximo_marcador - diagnosticData.minutesInactive)} minutos
                        </p>
                      )}
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-green-700 mb-1">Status do Ciclo</p>
                      <p className="text-sm font-semibold text-green-900">
                        {diagnosticData.cicloInatividade.ciclo_completo ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            Completo (120 min)
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Activity className="w-4 h-4" />
                            Em Andamento
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {diagnosticData.cicloInatividade.ciclo_completo
                          ? 'Não receberá mais notificações'
                          : 'Aguardando próximo marcador'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-sm font-semibold text-gray-700 mb-3">
                      Sequência de Marcadores (20 → 40 → 80 → 120 minutos)
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {[20, 40, 80, 120].map((marcador, index) => {
                        const enviado = diagnosticData.cicloInatividade!.marcadores_enviados.includes(marcador);
                        const proximo = diagnosticData.cicloInatividade!.proximo_marcador === marcador;

                        return (
                          <div key={marcador} className="flex items-center gap-2">
                            <div className={`
                              px-4 py-2 rounded-lg font-semibold text-sm border-2 transition-all
                              ${enviado
                                ? 'bg-green-100 border-green-500 text-green-800'
                                : proximo
                                ? 'bg-yellow-100 border-yellow-500 text-yellow-800 animate-pulse'
                                : 'bg-gray-100 border-gray-300 text-gray-500'}
                            `}>
                              {enviado && <CheckCircle className="w-4 h-4 inline mr-1" />}
                              {proximo && <Clock className="w-4 h-4 inline mr-1" />}
                              {marcador} min
                            </div>
                            {index < 3 && (
                              <span className="text-gray-400 text-xl">→</span>
                            )}
                          </div>
                        );
                      })}
                      {diagnosticData.cicloInatividade.ciclo_completo && (
                        <>
                          <span className="text-gray-400 text-xl">→</span>
                          <div className="px-4 py-2 rounded-lg font-semibold text-sm border-2 bg-red-100 border-red-500 text-red-800">
                            <XCircle className="w-4 h-4 inline mr-1" />
                            PARAR
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Como funciona:</strong> O sistema envia notificações nos marcadores 20, 40, 80 e 120 minutos.
                      Após enviar a notificação de 120 minutos, o sistema para de enviar automaticamente.
                      Quando você voltar à atividade (marcar um novo registro), o ciclo é resetado.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">
                    Nenhum ciclo de inatividade ativo no momento.
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Um ciclo será iniciado quando você ficar inativo por 20 minutos com registros abertos.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Sistema Backend de Notificações
              </h3>
              {(() => {
                const ultimaExecucao = diagnosticData.lastVerifications[0]?.executado_em;
                const minutosDesdeUltimaExecucao = ultimaExecucao
                  ? Math.floor((Date.now() - new Date(ultimaExecucao).getTime()) / 60000)
                  : null;
                const cronAtivo = minutosDesdeUltimaExecucao !== null && minutosDesdeUltimaExecucao < 60;

                return (
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    cronAtivo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {cronAtivo ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Cron Ativo
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-1" />
                        Cron Inativo
                      </>
                    )}
                    {minutosDesdeUltimaExecucao !== null && (
                      <span className="ml-1">({minutosDesdeUltimaExecucao}min atrás)</span>
                    )}
                  </div>
                );
              })()}
            </div>
            <p className="text-gray-700 mb-4">
              O sistema de notificações de inatividade roda automaticamente no backend através de uma Edge Function
              acionada por cron job externo a cada 5 minutos. Isso garante que você receba notificações mesmo com o
              app completamente fechado.
            </p>
            <button
              onClick={forceInactivityCheck}
              disabled={forceCheckLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${forceCheckLoading ? 'animate-spin' : ''}`} />
              {forceCheckLoading ? 'Verificando...' : 'Forçar Verificação Agora'}
            </button>
            {forceCheckResult && (
              <div className={`mt-3 p-3 rounded ${
                forceCheckResult.startsWith('Erro') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
              }`}>
                {forceCheckResult}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Status dos Tokens FCM</h3>
              <span className="text-sm text-gray-600">
                {diagnosticData.tokenHealth.length} token(s) total
              </span>
            </div>
            <div className="space-y-3">
              {diagnosticData.tokenHealth.length > 0 ? (
                diagnosticData.tokenHealth.map((token) => (
                  <div key={token.id} className={`p-3 rounded border ${
                    token.health_status === 'healthy' ? 'bg-green-50 border-green-200' :
                    token.health_status === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                    token.health_status === 'critical' ? 'bg-orange-50 border-orange-200' :
                    'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-600">
                          {token.token.substring(0, 30)}...
                        </span>
                        {token.fcm_error_code === 'UNREGISTERED' && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                            <AlertTriangle className="w-3 h-3" />
                            UNREGISTERED
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {token.is_active ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className={`text-xs px-2 py-1 rounded ${
                          token.health_status === 'healthy' ? 'bg-green-100 text-green-800' :
                          token.health_status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          token.health_status === 'critical' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {token.health_status}
                        </span>
                        <button
                          onClick={() => deleteIndividualToken(token.id)}
                          disabled={deletingTokenId === token.id}
                          className="p-1 text-red-600 hover:bg-red-100 rounded disabled:opacity-50"
                          title="Remover token"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>Erros: {token.error_count}</div>
                      {token.last_error && (
                        <div className="text-red-600">Último erro: {token.last_error}</div>
                      )}
                      {token.last_success_at && (
                        <div className="text-green-600">
                          Último sucesso: {new Date(token.last_success_at).toLocaleString('pt-BR')}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">Nenhum token registrado</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-4">Últimas Notificações Enviadas</h3>
              <div className="space-y-3">
                {diagnosticData.lastNotifications.length > 0 ? (
                  diagnosticData.lastNotifications.map((notif, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-700">{notif.tipo}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(notif.enviado_em).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 font-medium">{notif.titulo}</p>
                      <p className="text-xs text-gray-600 mt-1">{notif.corpo}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          notif.sucesso_count > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {notif.sucesso_count > 0 ? 'Sucesso' : 'Falha'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {notif.sucesso_count || 0} enviados
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">Nenhuma notificação recente</p>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-4">Últimas Verificações do Sistema</h3>
              <div className="space-y-3">
                {diagnosticData.lastVerifications.length > 0 ? (
                  diagnosticData.lastVerifications.map((verif, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500">
                          {new Date(verif.executado_em).toLocaleString('pt-BR')}
                        </span>
                        <span className="text-xs text-gray-500">
                          {verif.tempo_execucao_ms}ms
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Verificados:</span>
                          <span className="font-semibold text-gray-900 ml-1">
                            {verif.usuarios_verificados}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Enviadas:</span>
                          <span className="font-semibold text-gray-900 ml-1">
                            {verif.notificacoes_enviadas}
                          </span>
                        </div>
                      </div>
                      {verif.erros && verif.erros.length > 0 && (
                        <p className="text-xs text-red-600 mt-2">
                          {verif.erros.length} erro(s) encontrado(s)
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">Nenhuma verificação recente</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
