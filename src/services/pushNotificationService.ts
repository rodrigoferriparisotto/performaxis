import { MessageDeliveryService, UnreadMessage } from './messageDeliveryService';
import { browserCapabilitiesService } from './browserCapabilitiesService';

const NOTIFICATION_TAG_PREFIX = 'message_';

export interface NotificationPayload {
  messageId: string;
  title: string;
  body: string;
  type: 'informacao' | 'aviso' | 'urgente';
  blocking: boolean;
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private permission: NotificationPermission = 'default';

  private constructor() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('Erro ao solicitar permissão de notificação:', error);
      return false;
    }
  }

  hasPermission(): boolean {
    return this.permission === 'granted';
  }

  async sendNotification(payload: NotificationPayload): Promise<boolean> {
    if (!this.hasPermission()) {
      return false;
    }

    try {
      const icon = '/icon-192.png';
      const badge = '/icon-192.png';

      const options: NotificationOptions = {
        body: payload.body,
        icon: icon,
        badge: badge,
        tag: NOTIFICATION_TAG_PREFIX + payload.messageId,
        requireInteraction: payload.blocking,
        vibrate: this.getVibrationPattern(payload.type),
        silent: false,
        renotify: true,
        timestamp: Date.now(),
        data: {
          messageId: payload.messageId,
          type: payload.type,
          blocking: payload.blocking,
          url: window.location.origin,
        },
      };

      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(payload.title, options);
      } else {
        new Notification(payload.title, options);
      }

      return true;
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      return false;
    }
  }

  private getVibrationPattern(type: string): number[] | undefined {
    if (!browserCapabilitiesService.canVibrate()) {
      return undefined;
    }

    switch (type) {
      case 'urgente':
        return [200, 100, 200, 100, 200];
      case 'aviso':
        return [100, 50, 100];
      case 'informacao':
      default:
        return [100];
    }
  }

  async notifyUnreadMessage(message: UnreadMessage, userId: string): Promise<boolean> {
    if (!this.hasPermission()) {
      return false;
    }

    const payload: NotificationPayload = {
      messageId: message.mensagem_id,
      title: message.titulo,
      body: message.conteudo.substring(0, 100) + (message.conteudo.length > 100 ? '...' : ''),
      type: message.tipo,
      blocking: message.bloqueia_sistema,
    };

    const sent = await this.sendNotification(payload);

    if (sent) {
      await MessageDeliveryService.markPushSent(userId, message.mensagem_id);
    }

    return sent;
  }

  async notifyMultipleMessages(messages: UnreadMessage[], userId: string): Promise<number> {
    if (!this.hasPermission() || messages.length === 0) {
      return 0;
    }

    const blockingMessages = messages.filter(m => m.bloqueia_sistema);
    const normalMessages = messages.filter(m => !m.bloqueia_sistema);

    let successCount = 0;

    for (const message of blockingMessages) {
      const sent = await this.notifyUnreadMessage(message, userId);
      if (sent) successCount++;
    }

    if (normalMessages.length > 0) {
      if (normalMessages.length === 1) {
        const sent = await this.notifyUnreadMessage(normalMessages[0], userId);
        if (sent) successCount++;
      } else {
        const payload: NotificationPayload = {
          messageId: 'multiple',
          title: `Você tem ${normalMessages.length} mensagens não lidas`,
          body: 'Clique para visualizar todas as mensagens',
          type: 'informacao',
          blocking: false,
        };

        const sent = await this.sendNotification(payload);
        if (sent) {
          for (const msg of normalMessages) {
            await MessageDeliveryService.markPushSent(userId, msg.mensagem_id);
          }
          successCount += normalMessages.length;
        }
      }
    }

    return successCount;
  }

  async checkAndNotifyPending(userId: string): Promise<void> {
    if (!this.hasPermission()) {
      return;
    }

    try {
      const unreadMessages = await MessageDeliveryService.getUnreadMessages(userId);

      const pendingMessages = unreadMessages.filter(msg => msg.tentativas_entrega < 3);

      if (pendingMessages.length > 0) {
        await this.notifyMultipleMessages(pendingMessages, userId);
      }
    } catch (error) {
      console.error('Erro ao verificar e notificar mensagens pendentes:', error);
    }
  }

  async schedulePeriodicCheck(userId: string): Promise<void> {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      if ('periodicSync' in registration) {
        const status = await (navigator as any).permissions.query({
          name: 'periodic-background-sync',
        });

        if (status.state === 'granted') {
          await (registration as any).periodicSync.register('check-messages', {
            minInterval: 60 * 60 * 1000,
          });
        }
      }
    } catch (error) {
      console.error('Erro ao agendar verificação periódica:', error);
    }
  }

  clearNotification(messageId: string): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.getNotifications({
          tag: NOTIFICATION_TAG_PREFIX + messageId,
        }).then((notifications) => {
          notifications.forEach((notification) => {
            notification.close();
          });
        });
      });
    }
  }

  clearAllNotifications(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.getNotifications().then((notifications) => {
          notifications.forEach((notification) => {
            if (notification.tag?.startsWith(NOTIFICATION_TAG_PREFIX)) {
              notification.close();
            }
          });
        });
      });
    }
  }
}

export const pushNotificationService = PushNotificationService.getInstance();
