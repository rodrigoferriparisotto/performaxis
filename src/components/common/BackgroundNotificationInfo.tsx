import React, { useState, useEffect } from 'react';
import { Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { browserCapabilitiesService } from '../../services/browserCapabilitiesService';
import type { BrowserCapabilities } from '../../services/browserCapabilitiesService';

const BackgroundNotificationInfo: React.FC = () => {
  const [capabilities, setCapabilities] = useState<BrowserCapabilities | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const caps = browserCapabilitiesService.detect();
    setCapabilities(caps);
  }, []);

  if (!capabilities) return null;

  const getStatusIcon = () => {
    if (capabilities.canBackgroundSync) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    if (capabilities.platform === 'android') {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  const getStatusText = () => {
    if (capabilities.canBackgroundSync) {
      return 'Notificações em segundo plano totalmente suportadas';
    }
    if (capabilities.platform === 'android') {
      return 'Suporte limitado - Instale o app para melhor funcionamento';
    }
    return 'Suporte limitado de notificações em segundo plano';
  };

  const getPlatformName = () => {
    switch (capabilities.platform) {
      case 'ios':
        return 'iOS/iPhone';
      case 'android':
        return 'Android';
      case 'desktop':
        return 'Desktop';
      default:
        return 'Desconhecido';
    }
  };

  const getBrowserName = () => {
    switch (capabilities.browser) {
      case 'chrome':
        return 'Chrome';
      case 'firefox':
        return 'Firefox';
      case 'safari':
        return 'Safari';
      case 'edge':
        return 'Edge';
      case 'opera':
        return 'Opera';
      default:
        return 'Desconhecido';
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        {getStatusIcon()}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-blue-900">{getStatusText()}</h3>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
            </button>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            {browserCapabilitiesService.getLimitationsMessage()}
          </p>

          {expanded && (
            <div className="mt-4 space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-blue-900">Plataforma:</span>
                  <span className="ml-2 text-blue-700">{getPlatformName()}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-900">Navegador:</span>
                  <span className="ml-2 text-blue-700">{getBrowserName()}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-900">PWA Instalado:</span>
                  <span className="ml-2 text-blue-700">
                    {capabilities.isStandalone ? 'Sim' : 'Não'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-blue-900">Background Sync:</span>
                  <span className="ml-2 text-blue-700">
                    {capabilities.canBackgroundSync ? 'Disponível' : 'Não disponível'}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-blue-200">
                <p className="font-medium text-blue-900 mb-2">Recursos suportados:</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    {capabilities.hasNotifications ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-blue-700">Notificações</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {capabilities.hasServiceWorker ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-blue-700">Service Worker</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {capabilities.hasVibration ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-blue-700">Vibração</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {capabilities.hasIndexedDB ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-blue-700">IndexedDB</span>
                  </div>
                </div>
              </div>

              {capabilities.platform === 'android' && !capabilities.isStandalone && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>Dica:</strong> Para receber notificações mesmo com o app fechado,
                    instale o aplicativo na tela inicial. No Chrome, toque no menu (⋮) e
                    selecione "Instalar aplicativo" ou "Adicionar à tela inicial".
                  </p>
                </div>
              )}

              {capabilities.platform === 'ios' && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>Limitação do iOS:</strong> Devido a restrições da Apple, as
                    notificações em segundo plano funcionam apenas quando o app está aberto ou
                    foi usado recentemente. Mantenha o app aberto para receber todas as
                    notificações.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BackgroundNotificationInfo;
