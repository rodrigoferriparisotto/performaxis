import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Moon, Volume2, VolumeX, Smartphone, TestTube, Clock, Zap, Speaker, Info, AlertCircle, CheckCircle, BatteryWarning } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { reminderService } from '../../services/reminderService';
import { notificationService } from '../../services/notificationService';
import { soundService } from '../../services/soundService';
import { browserCapabilitiesService } from '../../services/browserCapabilitiesService';
import type { ReminderSettings } from '../../services/reminderService';
import BackgroundNotificationInfo from '../common/BackgroundNotificationInfo';
import BatteryOptimizationModal from '../common/BatteryOptimizationModal';
import { getBatteryGuide } from '../../constants/batteryOptimizationGuides';

interface AdvancedSettings {
  intensidade_vibracao: 'fraca' | 'media' | 'forte';
  volume_som: number;
  tipo_som_preferido: 'info' | 'warning' | 'urgent' | 'critical';
  tempo_minimo_badge_horas: number;
}

export default function ConfiguracoesLembretes() {
  const [userId, setUserId] = useState<string | null>(null);
  const [settings, setSettings] = useState<ReminderSettings>({
    ativo: true,
    horario_inicio_nao_perturbe: undefined,
    horario_fim_nao_perturbe: undefined,
    permitir_som: true,
    permitir_vibracao: true,
    ativar_lembretes_inatividade: true,
  });
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>({
    intensidade_vibracao: 'media',
    volume_som: 100,
    tipo_som_preferido: 'warning',
    tempo_minimo_badge_horas: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [batteryOptimizationConfigured, setBatteryOptimizationConfigured] = useState(false);
  const [showBatteryGuideModal, setShowBatteryGuideModal] = useState(false);
  const diagnosticInfo = browserCapabilitiesService.getDiagnosticInfo();

  useEffect(() => {
    loadUserAndSettings();
    setHasNotificationPermission(notificationService.hasPermission());
  }, []);

  const loadUserAndSettings = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);
        await loadSettings(user.id);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar usuário' });
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('configuracoes_lembretes_usuario')
        .select('*')
        .eq('usuario_id', uid)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          ativo: data.ativo,
          horario_inicio_nao_perturbe: data.horario_inicio_nao_perturbe,
          horario_fim_nao_perturbe: data.horario_fim_nao_perturbe,
          permitir_som: data.permitir_som,
          permitir_vibracao: data.permitir_vibracao,
          ativar_lembretes_inatividade: data.ativar_lembretes_inatividade ?? true,
        });
      }

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('intensidade_vibracao, volume_som, tipo_som_preferido, tempo_minimo_badge_horas, battery_optimization_configured')
        .eq('id', uid)
        .maybeSingle();

      if (userError) throw userError;

      if (userData) {
        setAdvancedSettings({
          intensidade_vibracao: userData.intensidade_vibracao || 'media',
          volume_som: userData.volume_som ?? 100,
          tipo_som_preferido: userData.tipo_som_preferido || 'warning',
          tempo_minimo_badge_horas: userData.tempo_minimo_badge_horas ?? 0,
        });
        setBatteryOptimizationConfigured(userData.battery_optimization_configured ?? false);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    if (!userId) return;

    setSaving(true);
    setMessage(null);

    try {
      const success = await reminderService.updateSettings(userId, settings);

      if (!success) {
        throw new Error('Failed to save reminder settings');
      }

      const { error: userError } = await supabase
        .from('usuarios')
        .update({
          intensidade_vibracao: advancedSettings.intensidade_vibracao,
          volume_som: advancedSettings.volume_som,
          tipo_som_preferido: advancedSettings.tipo_som_preferido,
          tempo_minimo_badge_horas: advancedSettings.tempo_minimo_badge_horas,
        })
        .eq('id', userId);

      if (userError) throw userError;

      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar configurações' });
    } finally {
      setSaving(false);
    }
  };

  const handleRequestPermission = async () => {
    const granted = await notificationService.requestPermission();
    setHasNotificationPermission(granted);

    if (granted) {
      setMessage({ type: 'success', text: 'Permissão concedida! Você receberá lembretes.' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({
        type: 'error',
        text: 'Permissão negada. Ative nas configurações do navegador.',
      });
    }
  };

  const handleBatteryGuideConfirm = async (configured: boolean) => {
    if (configured && userId) {
      try {
        await supabase
          .from('usuarios')
          .update({ battery_optimization_configured: true })
          .eq('id', userId);

        setBatteryOptimizationConfigured(true);
        setMessage({ type: 'success', text: 'Configuração de bateria registrada!' });
        setTimeout(() => setMessage(null), 3000);
      } catch (error) {
        console.error('Erro ao salvar status de otimização de bateria:', error);
        setMessage({ type: 'error', text: 'Erro ao salvar configuração' });
      }
    }
    setShowBatteryGuideModal(false);
  };

  const handleTestNotification = async () => {
    if (!hasNotificationPermission) {
      setMessage({ type: 'error', text: 'Por favor, conceda permissão de notificações primeiro' });
      return;
    }

    await notificationService.showNotification({
      title: 'Teste de Lembrete',
      body: 'Este é um exemplo de como os lembretes aparecerão',
      level: advancedSettings.tipo_som_preferido,
      vibrate: settings.permitir_vibracao,
      sound: settings.permitir_som,
      intensidadeVibracao: advancedSettings.intensidade_vibracao,
    });

    setMessage({ type: 'success', text: 'Notificação de teste enviada!' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleTestSound = () => {
    soundService.play(advancedSettings.tipo_som_preferido);
    setMessage({ type: 'success', text: 'Som de teste reproduzido!' });
    setTimeout(() => setMessage(null), 2000);
  };

  const handleTestVibration = () => {
    const result = notificationService.testVibration(
      advancedSettings.intensidade_vibracao,
      advancedSettings.tipo_som_preferido
    );

    setMessage({
      type: result.success ? 'success' : 'error',
      text: result.message,
    });
    setTimeout(() => setMessage(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Carregando configurações...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configurações de Lembretes</h1>
            <p className="text-sm text-gray-600">
              Gerencie como você recebe lembretes de atividades pendentes
            </p>
          </div>
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

        <BackgroundNotificationInfo />

        {!hasNotificationPermission && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <BellOff className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-1">
                  Permissão de Notificações Necessária
                </h3>
                <p className="text-sm text-yellow-800 mb-3">
                  Para receber lembretes, você precisa permitir notificações do navegador.
                </p>
                <button
                  onClick={handleRequestPermission}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                >
                  Permitir Notificações
                </button>
              </div>
            </div>
          </div>
        )}

        {browserCapabilitiesService.needsBatteryOptimizationGuide() &&
          !batteryOptimizationConfigured &&
          hasNotificationPermission &&
          settings.ativo && (
            <div className="mb-6 p-4 bg-orange-50 border-l-4 border-orange-400 rounded-lg shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <BatteryWarning className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-900 mb-1">
                    Configure seu Android para receber 100% das notificações
                  </h3>
                  <p className="text-sm text-orange-800 mb-3">
                    O Android pode pausar apps em segundo plano. Configure em 2 minutos para garantir que você receba todos os lembretes importantes.
                  </p>
                  <button
                    onClick={() => setShowBatteryGuideModal(true)}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                  >
                    Como Configurar
                  </button>
                </div>
              </div>
            </div>
          )}

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {settings.ativo ? (
                <Bell className="w-5 h-5 text-green-600" />
              ) : (
                <BellOff className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <h3 className="font-semibold text-gray-900">Lembretes Ativos</h3>
                <p className="text-sm text-gray-600">
                  {settings.ativo
                    ? 'Você receberá lembretes de atividades pendentes'
                    : 'Lembretes desativados'}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.ativo}
                onChange={(e) => setSettings({ ...settings, ativo: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Lembretes de Inatividade</h3>
                <p className="text-sm text-gray-600">
                  Receba alertas quando ficar inativo por 30 minutos ou mais
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.ativar_lembretes_inatividade ?? true}
                onChange={(e) =>
                  setSettings({ ...settings, ativar_lembretes_inatividade: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3 mb-4">
              <Moon className="w-5 h-5 text-gray-700" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Modo Não Perturbe</h3>
                <p className="text-sm text-gray-600">
                  Defina um período em que não deseja receber lembretes
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Início (opcional)
                </label>
                <input
                  type="time"
                  value={settings.horario_inicio_nao_perturbe || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, horario_inicio_nao_perturbe: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fim (opcional)
                </label>
                <input
                  type="time"
                  value={settings.horario_fim_nao_perturbe || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, horario_fim_nao_perturbe: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {settings.permitir_som ? (
                  <Volume2 className="w-5 h-5 text-gray-700" />
                ) : (
                  <VolumeX className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">Som de Alerta</h3>
                  <p className="text-sm text-gray-600">
                    Reproduzir som ao receber lembretes
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.permitir_som}
                  onChange={(e) => setSettings({ ...settings, permitir_som: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-gray-700" />
                <div>
                  <h3 className="font-semibold text-gray-900">Vibração</h3>
                  <p className="text-sm text-gray-600">Vibrar dispositivo ao receber lembretes</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.permitir_vibracao}
                  onChange={(e) =>
                    setSettings({ ...settings, permitir_vibracao: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Configurações Avançadas</h3>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Zap className="w-5 h-5 text-purple-600" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Intensidade da Vibração</h4>
                    <p className="text-sm text-gray-600">Escolha a força da vibração</p>
                  </div>
                  <button
                    onClick={handleTestVibration}
                    className="px-3 py-1 text-sm border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors"
                  >
                    Testar
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 ml-8">
                  {(['fraca', 'media', 'forte'] as const).map((intensity) => (
                    <button
                      key={intensity}
                      onClick={() =>
                        setAdvancedSettings({ ...advancedSettings, intensidade_vibracao: intensity })
                      }
                      className={`py-2 px-4 rounded-lg border-2 transition-colors ${
                        advancedSettings.intensidade_vibracao === intensity
                          ? 'border-purple-600 bg-purple-50 text-purple-900 font-semibold'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {intensity.charAt(0).toUpperCase() + intensity.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Volume2 className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Volume do Som</h4>
                    <p className="text-sm text-gray-600">Ajuste o volume dos alertas sonoros</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    {advancedSettings.volume_som}%
                  </span>
                </div>
                <div className="ml-8">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={advancedSettings.volume_som}
                    onChange={(e) =>
                      setAdvancedSettings({ ...advancedSettings, volume_som: parseInt(e.target.value) })
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Speaker className="w-5 h-5 text-green-600" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Tipo de Som</h4>
                    <p className="text-sm text-gray-600">Escolha o som dos alertas</p>
                  </div>
                  <button
                    onClick={handleTestSound}
                    className="px-3 py-1 text-sm border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors"
                  >
                    Testar
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 ml-8">
                  {[
                    { value: 'info', label: 'Suave', color: 'blue' },
                    { value: 'warning', label: 'Moderado', color: 'yellow' },
                    { value: 'urgent', label: 'Urgente', color: 'orange' },
                    { value: 'critical', label: 'Crítico', color: 'red' },
                  ].map((sound) => (
                    <button
                      key={sound.value}
                      onClick={() =>
                        setAdvancedSettings({
                          ...advancedSettings,
                          tipo_som_preferido: sound.value as any,
                        })
                      }
                      className={`py-2 px-4 rounded-lg border-2 transition-colors ${
                        advancedSettings.tipo_som_preferido === sound.value
                          ? `border-${sound.color}-600 bg-${sound.color}-50 text-${sound.color}-900 font-semibold`
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {sound.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Tempo Mínimo para Badge</h4>
                    <p className="text-sm text-gray-600">
                      Mostrar atividades no badge apenas após este tempo
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 ml-8">
                  {[
                    { value: 0, label: 'Imediato' },
                    { value: 1, label: '1 hora' },
                    { value: 3, label: '3 horas' },
                    { value: 6, label: '6 horas' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        setAdvancedSettings({
                          ...advancedSettings,
                          tempo_minimo_badge_horas: option.value,
                        })
                      }
                      className={`py-2 px-4 rounded-lg border-2 transition-colors ${
                        advancedSettings.tempo_minimo_badge_horas === option.value
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-2">Como Funcionam os Lembretes?</h3>
            <ul className="text-sm text-gray-600 space-y-2 ml-6 list-disc">
              <li>
                <span className="font-medium">Lembretes de Atividades:</span> Você receberá lembretes após 6h, 8h, 10h e 11h de atividade em andamento
              </li>
              <li>
                <span className="font-medium">Lembretes de Inatividade:</span> Alertas a cada 30 minutos sem interação (30min, 1h, 1h30, 2h...)
              </li>
              <li>Os lembretes ficam mais urgentes conforme o tempo passa</li>
              <li>Apenas atividades com status "em andamento" geram lembretes</li>
              <li>As verificações acontecem automaticamente em intervalos regulares</li>
            </ul>
          </div>

          <div className="border-t pt-6">
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium mb-3"
            >
              <Info className="w-5 h-5" />
              {showDiagnostics ? 'Ocultar Diagnóstico' : 'Mostrar Diagnóstico do Dispositivo'}
            </button>

            {showDiagnostics && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-700">Plataforma</p>
                    <p className="text-gray-600 capitalize">{diagnosticInfo.platform}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Navegador</p>
                    <p className="text-gray-600 capitalize">{diagnosticInfo.browser}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">PWA Instalado</p>
                    <div className="flex items-center gap-1">
                      {diagnosticInfo.isStandalone ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-green-600">Sim</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-yellow-600" />
                          <span className="text-yellow-600">Não</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Permissão de Notificações</p>
                    <div className="flex items-center gap-1">
                      {diagnosticInfo.notificationPermission === 'granted' ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-green-600">Concedida</span>
                        </>
                      ) : diagnosticInfo.notificationPermission === 'denied' ? (
                        <>
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <span className="text-red-600">Negada</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-yellow-600" />
                          <span className="text-yellow-600">Não solicitada</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-300 pt-3 space-y-2">
                  <div className="flex items-start gap-2">
                    {diagnosticInfo.canPlaySound ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-700 text-sm">Som de Notificações</p>
                      <p className="text-xs text-gray-600 mt-1">{diagnosticInfo.soundLimitations}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    {diagnosticInfo.canVibrate ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-700 text-sm">Vibração</p>
                      <p className="text-xs text-gray-600 mt-1">{diagnosticInfo.vibrationLimitations}</p>
                    </div>
                  </div>
                </div>

                {!diagnosticInfo.isStandalone && diagnosticInfo.platform === 'android' && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                    <p className="font-medium text-blue-900">Dica:</p>
                    <p className="text-blue-800 mt-1">
                      Para melhor experiência no Android, instale o app na tela inicial: Menu do navegador → Instalar app / Adicionar à tela inicial
                    </p>
                  </div>
                )}

                {diagnosticInfo.notificationPermission === 'denied' && (
                  <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
                    <p className="font-medium text-red-900">Atenção:</p>
                    <p className="text-red-800 mt-1">
                      As notificações estão bloqueadas. Para habilitar, vá nas configurações do navegador e permita notificações para este site.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>

            {hasNotificationPermission && (
              <button
                onClick={handleTestNotification}
                className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                <TestTube className="w-5 h-5" />
                Testar
              </button>
            )}
          </div>

          {browserCapabilitiesService.needsBatteryOptimizationGuide() && hasNotificationPermission && (
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <BatteryWarning className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Guia de Otimização de Bateria</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Precisa configurar novamente? Acesse o guia completo de otimização de bateria para o seu dispositivo Android.
              </p>
              <button
                onClick={() => setShowBatteryGuideModal(true)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                Ver Guia de Otimização de Bateria
              </button>
            </div>
          )}
        </div>

        <BatteryOptimizationModal
          isOpen={showBatteryGuideModal}
          onClose={() => setShowBatteryGuideModal(false)}
          onConfirm={handleBatteryGuideConfirm}
          guide={getBatteryGuide(browserCapabilitiesService.detect().androidManufacturer)}
        />
      </div>
    </div>
  );
}
