import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Controla a instalação do PWA:
 * - Android/Chrome: captura o beforeinstallprompt e expõe instalar() que
 *   abre o prompt nativo do navegador.
 * - iOS/Safari: não existe prompt nativo — a tela usa ehIos para mostrar
 *   o passo a passo (Compartilhar → Adicionar à Tela de Início).
 * - Já instalado (standalone): nada é exibido.
 */
export function usePwaInstall() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [instalado, setInstalado] = useState(true); // assume instalado até provar o contrário

  useEffect(() => {
    const emStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalado(emStandalone);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalado(true);
      setPromptEvent(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const instalar = async (): Promise<boolean> => {
    if (!promptEvent) return false;
    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        setPromptEvent(null);
      }
      return outcome === 'accepted';
    } catch {
      return false;
    }
  };

  const ua = navigator.userAgent;
  const ehIos = /iphone|ipad|ipod/i.test(ua);
  const ehMobile = ehIos || /android/i.test(ua);

  return {
    podeInstalar: promptEvent !== null,
    instalado,
    ehIos,
    ehMobile,
    instalar,
  };
}
