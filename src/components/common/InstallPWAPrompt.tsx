import React, { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                               (window.navigator as any).standalone === true;

    setIsIOS(isIOSDevice);
    setIsStandalone(isInStandaloneMode);

    if (isInStandaloneMode) {
      return;
    }

    const hasSeenPrompt = localStorage.getItem('pwa-prompt-seen');
    const lastPromptDate = localStorage.getItem('pwa-prompt-date');
    const today = new Date().toDateString();

    if (!hasSeenPrompt || lastPromptDate !== today) {
      if (isIOSDevice) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      if (!hasSeenPrompt || lastPromptDate !== today) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA instalado com sucesso');
    }

    setDeferredPrompt(null);
    handleClose();
  };

  const handleClose = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-seen', 'true');
    localStorage.setItem('pwa-prompt-date', new Date().toDateString());
  };

  if (!showPrompt || isStandalone) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-6 pointer-events-auto transform transition-all">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-16 h-16 bg-blue-800 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white text-2xl font-bold">P</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Instalar PERFORMAXIS
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {isIOS
                ? 'Adicione à tela inicial para acesso rápido e funcionalidade offline'
                : 'Instale o app para acesso rápido e funcionalidade offline'
              }
            </p>

            {isIOS ? (
              <div className="space-y-3">
                <div className="flex items-start space-x-3 text-sm text-gray-700">
                  <Share className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">1. Toque no botão compartilhar</p>
                    <p className="text-gray-500 text-xs mt-1">
                      (ícone de compartilhamento na barra inferior do Safari)
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 text-sm text-gray-700">
                  <Download className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">2. Selecione "Adicionar à Tela de Início"</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Role para baixo e encontre essa opção
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={handleInstallClick}
                className="w-full bg-blue-800 hover:bg-blue-900 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-lg"
              >
                <Download className="w-5 h-5" />
                <span>Instalar App</span>
              </button>
            )}

            {!isIOS && (
              <button
                onClick={handleClose}
                className="w-full mt-2 text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors"
              >
                Agora não
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
