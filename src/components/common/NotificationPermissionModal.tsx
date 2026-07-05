import React, { useState } from 'react';
import { Bell, X, AlertTriangle } from 'lucide-react';
import { requestPushNotificationPermission } from '../../services/firebasePushService';
import { isFirebaseConfigured } from '../../services/firebaseConfig';

interface NotificationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  usuarioId?: string;
}

export default function NotificationPermissionModal({
  isOpen,
  onClose,
  onAccept,
  usuarioId,
}: NotificationPermissionModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredToken, setRegisteredToken] = useState<string | null>(null);
  const hasPushEnabled = isFirebaseConfigured();

  if (!isOpen) return null;

  if (!usuarioId) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Carregando Dados
            </h2>

            <p className="text-gray-600 mb-6">
              Aguarde enquanto carregamos seus dados de usuário...
            </p>

            <button
              onClick={onClose}
              className="w-full text-gray-600 py-2 px-6 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleAccept = async () => {
    setIsProcessing(true);
    setError(null);
    setRegisteredToken(null);

    try {
      if (hasPushEnabled) {
        const token = await requestPushNotificationPermission(usuarioId);

        if (token) {
          console.log('[Modal] Push notification token registered successfully');
          setRegisteredToken(token.slice(-8));
        } else {
          setError('Não foi possível registrar o token FCM. Tentando novamente...');

          await new Promise(resolve => setTimeout(resolve, 2000));

          const retryToken = await requestPushNotificationPermission(usuarioId);
          if (retryToken) {
            console.log('[Modal] Push notification token registered on retry');
            setRegisteredToken(retryToken.slice(-8));
            setError(null);
          } else {
            throw new Error('Failed to register FCM token after retry');
          }
        }
      }

      await onAccept();
    } catch (err) {
      console.error('[Modal] Error enabling notifications:', err);
      setError('Erro ao ativar notificações. Por favor, verifique as permissões do navegador e tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Bell className="w-8 h-8 text-blue-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Ative os Lembretes
          </h2>

          <p className="text-gray-600 mb-6">
            Receba notificações automáticas para não esquecer de finalizar suas atividades.
            Os lembretes são enviados após 20min, 40min, 1h20 e 2h de atividade em andamento.
          </p>

          {error && (
            <div className="w-full mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {registeredToken && (
            <div className="w-full mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-700 font-medium">
                ✓ Token FCM registrado com sucesso! (***{registeredToken})
              </p>
            </div>
          )}

          {hasPushEnabled && !registeredToken && (
            <div className="w-full mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700 font-medium">
                ⓘ Notificações Push disponíveis - funcionam mesmo com o app fechado!
              </p>
            </div>
          )}

          <div className="w-full space-y-3 mb-6 text-left">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Não Perca Nada</p>
                <p className="text-xs text-gray-600">
                  Lembretes progressivos conforme o tempo passa
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Sempre Ativo</p>
                <p className="text-xs text-gray-600">
                  Notificações funcionam mesmo com o app fechado
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Controle Total</p>
                <p className="text-xs text-gray-600">
                  Configure horários e preferências nas configurações
                </p>
              </div>
            </div>
          </div>

          <div className="w-full space-y-3">
            <button
              onClick={handleAccept}
              disabled={isProcessing}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Ativando...' : 'Ativar Lembretes'}
            </button>

            <button
              onClick={onClose}
              className="w-full text-gray-600 py-2 px-6 rounded-lg hover:bg-gray-100 transition-colors text-sm"
            >
              Agora não
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Você pode alterar essa configuração a qualquer momento
          </p>
        </div>
      </div>
    </div>
  );
}
