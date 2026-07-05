import { logger } from './loggerService';

export interface QueuedNotification {
  id: string;
  title: string;
  body: string;
  tipo: 'info' | 'aviso' | 'urgente' | 'broadcast' | 'reminder' | 'inactivity';
  priority: 'high' | 'normal';
  data?: any;
  icon?: string;
  badge?: number;
  createdAt: number;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: number;
  delivered: boolean;
  deliveredAt?: number;
}

const DB_NAME = 'performaxis-notifications';
const DB_VERSION = 1;
const STORE_NAME = 'notification-queue';

class NotificationQueueService {
  private db: IDBDatabase | null = null;

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        logger.error('Error opening notification queue DB', request.error, 'NotificationQueueService');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('delivered', 'delivered', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('nextRetryAt', 'nextRetryAt', { unique: false });
          store.createIndex('tipo', 'tipo', { unique: false });
        }
      };
    });
  }

  async enqueue(
    title: string,
    body: string,
    tipo: QueuedNotification['tipo'],
    options?: {
      priority?: 'high' | 'normal';
      data?: any;
      icon?: string;
      badge?: number;
      maxRetries?: number;
    }
  ): Promise<string> {
    try {
      const db = await this.openDB();
      const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const notification: QueuedNotification = {
        id,
        title,
        body,
        tipo,
        priority: options?.priority || 'normal',
        data: options?.data,
        icon: options?.icon,
        badge: options?.badge,
        createdAt: Date.now(),
        retryCount: 0,
        maxRetries: options?.maxRetries || 3,
        delivered: false,
      };

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(notification);

        request.onsuccess = () => {
          logger.info('Notification queued', { id, title, tipo }, 'NotificationQueueService');
          resolve(id);
        };

        request.onerror = () => {
          logger.error('Error queuing notification', request.error, 'NotificationQueueService');
          reject(request.error);
        };
      });
    } catch (error) {
      logger.error('Error in enqueue', error, 'NotificationQueueService');
      throw error;
    }
  }

  async markAsDelivered(id: string): Promise<void> {
    try {
      const db = await this.openDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
          const notification = getRequest.result as QueuedNotification;

          if (notification) {
            notification.delivered = true;
            notification.deliveredAt = Date.now();

            const updateRequest = store.put(notification);

            updateRequest.onsuccess = () => {
              logger.info('Notification marked as delivered', { id }, 'NotificationQueueService');
              resolve();
            };

            updateRequest.onerror = () => {
              logger.error('Error updating notification', updateRequest.error, 'NotificationQueueService');
              reject(updateRequest.error);
            };
          } else {
            resolve();
          }
        };

        getRequest.onerror = () => {
          logger.error('Error getting notification', getRequest.error, 'NotificationQueueService');
          reject(getRequest.error);
        };
      });
    } catch (error) {
      logger.error('Error in markAsDelivered', error, 'NotificationQueueService');
    }
  }

  async incrementRetry(id: string, delayMs: number = 30000): Promise<void> {
    try {
      const db = await this.openDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
          const notification = getRequest.result as QueuedNotification;

          if (notification && notification.retryCount < notification.maxRetries) {
            notification.retryCount++;
            notification.nextRetryAt = Date.now() + delayMs;

            const updateRequest = store.put(notification);

            updateRequest.onsuccess = () => {
              logger.info('Notification retry scheduled', { id, retryCount: notification.retryCount }, 'NotificationQueueService');
              resolve();
            };

            updateRequest.onerror = () => {
              logger.error('Error scheduling retry', updateRequest.error, 'NotificationQueueService');
              reject(updateRequest.error);
            };
          } else {
            resolve();
          }
        };

        getRequest.onerror = () => {
          logger.error('Error getting notification for retry', getRequest.error, 'NotificationQueueService');
          reject(getRequest.error);
        };
      });
    } catch (error) {
      logger.error('Error in incrementRetry', error, 'NotificationQueueService');
    }
  }

  async getPendingNotifications(): Promise<QueuedNotification[]> {
    try {
      const db = await this.openDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('delivered');
        const request = index.getAll(false);

        request.onsuccess = () => {
          const now = Date.now();
          const notifications = request.result as QueuedNotification[];

          const pending = notifications.filter(n => {
            if (n.retryCount >= n.maxRetries) {
              return false;
            }

            if (n.nextRetryAt && n.nextRetryAt > now) {
              return false;
            }

            return true;
          });

          resolve(pending);
        };

        request.onerror = () => {
          logger.error('Error getting pending notifications', request.error, 'NotificationQueueService');
          reject(request.error);
        };
      });
    } catch (error) {
      logger.error('Error in getPendingNotifications', error, 'NotificationQueueService');
      return [];
    }
  }

  async cleanupOldNotifications(olderThanMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    try {
      const db = await this.openDB();
      const cutoffTime = Date.now() - olderThanMs;

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('createdAt');
        const request = index.openCursor();

        let deletedCount = 0;

        request.onsuccess = (event: any) => {
          const cursor = event.target.result;

          if (cursor) {
            const notification = cursor.value as QueuedNotification;

            if (notification.createdAt < cutoffTime && (notification.delivered || notification.retryCount >= notification.maxRetries)) {
              cursor.delete();
              deletedCount++;
            }

            cursor.continue();
          } else {
            logger.info('Old notifications cleaned up', { deletedCount }, 'NotificationQueueService');
            resolve(deletedCount);
          }
        };

        request.onerror = () => {
          logger.error('Error cleaning up notifications', request.error, 'NotificationQueueService');
          reject(request.error);
        };
      });
    } catch (error) {
      logger.error('Error in cleanupOldNotifications', error, 'NotificationQueueService');
      return 0;
    }
  }

  async getQueueStats(): Promise<{
    total: number;
    pending: number;
    delivered: number;
    failed: number;
  }> {
    try {
      const db = await this.openDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const notifications = request.result as QueuedNotification[];

          const stats = {
            total: notifications.length,
            pending: notifications.filter(n => !n.delivered && n.retryCount < n.maxRetries).length,
            delivered: notifications.filter(n => n.delivered).length,
            failed: notifications.filter(n => !n.delivered && n.retryCount >= n.maxRetries).length,
          };

          resolve(stats);
        };

        request.onerror = () => {
          logger.error('Error getting queue stats', request.error, 'NotificationQueueService');
          reject(request.error);
        };
      });
    } catch (error) {
      logger.error('Error in getQueueStats', error, 'NotificationQueueService');
      return { total: 0, pending: 0, delivered: 0, failed: 0 };
    }
  }

  async clearQueue(): Promise<void> {
    try {
      const db = await this.openDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          logger.info('Notification queue cleared', {}, 'NotificationQueueService');
          resolve();
        };

        request.onerror = () => {
          logger.error('Error clearing queue', request.error, 'NotificationQueueService');
          reject(request.error);
        };
      });
    } catch (error) {
      logger.error('Error in clearQueue', error, 'NotificationQueueService');
    }
  }
}

export const notificationQueueService = new NotificationQueueService();
