import { soundService } from './soundService';
import { logger } from './loggerService';

type NotificationLevel = 'info' | 'warning' | 'urgent' | 'critical';
type VibrationIntensity = 'fraca' | 'media' | 'forte';

interface NotificationOptions {
  title: string;
  body: string;
  level?: NotificationLevel;
  tag?: string;
  data?: any;
  vibrate?: boolean;
  sound?: boolean;
  intensidadeVibracao?: VibrationIntensity;
}

class NotificationService {
  private isSupported: boolean;
  private permission: NotificationPermission = 'default';
  private pushMessageCallbacks: Array<(message: any) => void> = [];

  constructor() {
    this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    if (this.isSupported) {
      this.permission = Notification.permission;
    }

    // Configurar listener para mensagens do Service Worker
    this.setupServiceWorkerListener();
  }

  private setupServiceWorkerListener(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        logger.debug('Message from SW', event.data, 'NotificationService');

        if (event.data && event.data.type === 'PUSH_NOTIFICATION') {
          this.handleForegroundPushNotification(event.data);

          this.pushMessageCallbacks.forEach(callback => {
            try {
              callback(event.data);
            } catch (error) {
              logger.error('Error in push callback', error, 'NotificationService');
            }
          });
        }
      });
    }
  }

  private async handleForegroundPushNotification(data: any): Promise<void> {
    const { title, body, tipo, url } = data;

    // Determinar level baseado no tipo
    let level: NotificationLevel = 'info';
    if (tipo === 'urgente' || tipo === 'inactivity') {
      level = 'urgent';
    } else if (tipo === 'critical') {
      level = 'critical';
    } else if (tipo === 'aviso' || tipo === 'warning') {
      level = 'warning';
    }

    // Exibir notificação
    await this.showNotification({
      title,
      body,
      level,
      data: { url, tipo, ...data },
      vibrate: true,
      sound: true,
    });
  }

  /**
   * Registra callback para receber notificações push quando app está em foreground
   */
  onPushMessage(callback: (message: any) => void): () => void {
    this.pushMessageCallbacks.push(callback);

    // Retorna função para remover o callback
    return () => {
      const index = this.pushMessageCallbacks.indexOf(callback);
      if (index > -1) {
        this.pushMessageCallbacks.splice(index, 1);
      }
    };
  }

  private isVibrationSupported(): boolean {
    return 'vibrate' in navigator;
  }

  private triggerVibration(pattern: number[]): boolean {
    if (!this.isVibrationSupported()) {
      logger.debug('Vibration API not supported', undefined, 'NotificationService');
      return false;
    }

    try {
      const result = navigator.vibrate(pattern);
      logger.debug('Vibration triggered', { pattern, result }, 'NotificationService');
      return result;
    } catch (error) {
      logger.error('Error triggering vibration', error, 'NotificationService');
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      logger.warn('Notifications not supported', undefined, 'NotificationService');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission === 'denied') {
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      this.permission = result;
      return result === 'granted';
    } catch (error) {
      logger.error('Error requesting notification permission', error, 'NotificationService');
      return false;
    }
  }

  async showNotification(options: NotificationOptions): Promise<void> {
    if (!this.isSupported || this.permission !== 'granted') {
      logger.debug('Cannot show notification: not supported or permission denied', undefined, 'NotificationService');
      return;
    }

    const { title, body, level = 'info', tag, data, vibrate = true, sound = true, intensidadeVibracao = 'media' } = options;

    const icon = '/logo_performaxis_tumb.jpg';
    const badge = '/logo_performaxis_tumb.jpg';

    const vibrationPattern = this.getVibrationPattern(level, intensidadeVibracao);

    if (vibrate && vibrationPattern) {
      this.triggerVibration(vibrationPattern);
    }

    if (sound) {
      soundService.play(level);
    }

    const notificationOptions: NotificationOptions & { icon?: string; badge?: string; requireInteraction?: boolean; silent?: boolean; renotify?: boolean; timestamp?: number } = {
      body,
      icon,
      badge,
      tag: tag || `reminder-${Date.now()}`,
      data: data || {},
      vibrate: vibrate && vibrationPattern ? vibrationPattern : undefined,
      silent: false,
      requireInteraction: level === 'critical' || level === 'urgent',
      renotify: true,
      timestamp: Date.now(),
    };

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, notificationOptions);
      } else {
        const notification = new Notification(title, notificationOptions);

        notification.onclick = (event) => {
          event.preventDefault();
          window.focus();

          if (data?.url) {
            window.location.pathname = data.url;
          }

          notification.close();
        };

        if (level !== 'critical') {
          setTimeout(() => {
            notification.close();
          }, 10000);
        }
      }
    } catch (error) {
      logger.error('Error showing notification', error, 'NotificationService');
    }
  }

  private getVibrationPattern(level: NotificationLevel, intensity: VibrationIntensity = 'media'): number[] | undefined {
    const basePatterns: Record<NotificationLevel, number[]> = {
      info: [500],
      warning: [300, 100, 400],
      urgent: [500, 200, 700, 200, 500],
      critical: [800, 200, 800, 200, 800, 200, 800, 200, 800],
    };

    const pattern = basePatterns[level];
    if (!pattern) return undefined;

    const multipliers: Record<VibrationIntensity, number> = {
      fraca: 0.6,
      media: 1.0,
      forte: 1.5,
    };

    const multiplier = multipliers[intensity];
    return pattern.map(duration => Math.round(duration * multiplier));
  }

  hasPermission(): boolean {
    return this.isSupported && this.permission === 'granted';
  }

  isPermissionDenied(): boolean {
    return this.isSupported && this.permission === 'denied';
  }

  canRequestPermission(): boolean {
    return this.isSupported && this.permission === 'default';
  }

  testVibration(intensity: VibrationIntensity = 'media', level: NotificationLevel = 'info'): { success: boolean; message: string } {
    if (!this.isVibrationSupported()) {
      return {
        success: false,
        message: 'Vibração não suportada neste dispositivo ou navegador',
      };
    }

    const pattern = this.getVibrationPattern(level, intensity);
    if (!pattern) {
      return {
        success: false,
        message: 'Padrão de vibração inválido',
      };
    }

    const result = this.triggerVibration(pattern);
    return {
      success: result,
      message: result ? 'Vibração acionada com sucesso!' : 'Falha ao acionar vibração',
    };
  }
}

export const notificationService = new NotificationService();
export type { NotificationLevel, NotificationOptions, VibrationIntensity };
