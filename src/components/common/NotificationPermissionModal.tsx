import React, { useState } from 'react';
import { Bell, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { requestPushNotificationPermission } from '../../services/firebasePushService';
import { isFirebaseConfigured } from '../../services/firebaseConfig';

interface NotificationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  usuarioId?: string;
}

type Problema = 'bloqueado' | 'iphone_sem_instalar' | 'sem_suporte' | 'falha_registro' | null;

const ehIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const ehInstalado = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

function diagnosticarAntes(): Problema {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    // no iPhone as notificações só existem com o app instalado na tela de início
    return ehIos() && !ehInstalado() ? 'iphone_sem_instalar' : 'sem_suporte';
  }
  if (Notification.permission === 'denied') return 'bloqueado';
  return null;
}

function ComoResolver({ problema }: { problema: Exclude<Problema, null> }) {
  if (problema === 'bloqueado') {
    return (
      <div className="w-full mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left">
        <p className="text-sm font-semibold text-amber-900 mb-1">As notificações estão bloqueadas neste aparelho</p>
        <p className="text-xs text-amber-900 mb-2">O navegador recusou o pedido. Para liberar:</p>
        <ol className="text-xs text-amber-900 list-decimal pl-4 space-y-1">
          <li>Toque no ícone à esquerda do endereço (sininho riscado ou cadeado).</li>
          <li>Abra <strong>Permissões</strong> e ligue <strong>Notificações</strong>.</li>
          <li>Recarregue a página e toque em <strong>Ativar Lembretes</strong> de novo.</li>
        </ol>
        <p className="text-xs text-amber-800 mt-2">
          No app instalado: Configurações do celular → Apps → PERFORMAXIS → Notificações → Permitir.
        </p>
      </div>
    );
  }
  if (problema === 'iphone_sem_instalar') {
    return (
      <div className="w-full mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left">
        <p className="text-sm font-semibold text-amber-900 mb-1">No iPhone, instale o app primeiro</p>
        <p className="text-xs text-amber-900">
          Toque em <strong>Compartilhar</strong> → <strong>Adicionar à Tela de Início</strong>, abra o PERFORMAXIS
          pelo ícone e ative os lembretes por lá.
        </p>
      </div>
    );
  }
  if (problema === 'sem_suporte') {
    return (
      <div className="w-full mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left">
        <p className="text-sm font-semibold text-amber-900 mb-1">Este navegador não aceita notificações</p>
        <p className="text-xs text-amber-900">Use o Google Chrome (Android/computador) ou o app instalado no iPhone.</p>
      </div>
    );
  }
  return (
    <div className="w-full mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-left">
      <p className="text-sm text-red-700">
        A permissão foi dada, mas não conseguimos registrar este aparelho agora. Verifique a internet e tente de novo
        em alguns minutos.
      </p>
    </div>
  );
}

export default function NotificationPermissionModal({
  isOpen,
  onClose,
  onAccept,
  usuarioId,
}: NotificationPermissionModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [problema, setProblema] = useState<Problema>(null);
  const [registrado, setRegistrado] = useState(false);
  const hasPushEnabled = isFirebaseConfigured();

  if (!isOpen) return null;

  const handleAccept = async () => {
    setIsProcessing(true);
    setProblema(null);
    setRegistrado(false);

    try {
      if (hasPushEnabled) {
        const antes = diagnosticarAntes();
        if (antes) {
          setProblema(antes);
          return;
        }

        let token = await requestPushNotificationPermission(usuarioId!);
        if (!token && Notification.permission === 'granted') {
          // permissão ok mas o registro falhou: uma nova tentativa costuma resolver
          await new Promise((resolve) => setTimeout(resolve, 2000));
          token = await requestPushNotificationPermission(usuarioId!);
        }

        if (!token) {
          setProblema(Notification.permission === 'granted' ? 'falha_registro' : 'bloqueado');
          return;
        }
        setRegistrado(true);
      }

      await onAccept();
    } catch (err) {
      console.error('[Modal] Error enabling notifications:', err);
      setProblema('falha_registro');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[calc(100dvh-1.5rem)] overflow-y-auto p-5 sm:p-6 relative">
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!usuarioId ? (
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Carregando dados</h2>
            <p className="text-sm text-gray-600 mb-4">Aguarde enquanto carregamos seus dados de usuário...</p>
            <button onClick={onClose} className="w-full text-gray-600 py-2 rounded-lg hover:bg-gray-100">
              Fechar
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <Bell className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Ative os Lembretes</h2>

            <p className="text-sm text-gray-600 mb-4">
              Receba um aviso no celular para não esquecer de finalizar suas atividades — mesmo com o app fechado.
            </p>

            {problema && <ComoResolver problema={problema} />}

            {registrado && (
              <div className="w-full mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <p className="text-sm text-green-700 font-medium">Lembretes ativados neste aparelho!</p>
              </div>
            )}

            {!problema && !registrado && (
              <ul className="w-full mb-5 text-left text-sm text-gray-700 space-y-2">
                <li className="flex gap-2">
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  Lembretes aos 20 min, 40 min, 1h20 e 2h de atividade em andamento
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                  Funciona com o app fechado
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" />
                  Horários e preferências ajustáveis nas configurações
                </li>
              </ul>
            )}

            <div className="w-full space-y-2">
              <button
                onClick={handleAccept}
                disabled={isProcessing}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Ativando...' : problema ? 'Tentar de novo' : 'Ativar Lembretes'}
              </button>
              <button
                onClick={onClose}
                className="w-full text-gray-600 py-2 px-6 rounded-lg hover:bg-gray-100 transition-colors text-sm"
              >
                Agora não
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-3">Você pode alterar isso a qualquer momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}
