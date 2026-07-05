import { useEffect, useRef, useState } from 'react';
import { reminderService } from '../services/reminderService';
import { notificationService } from '../services/notificationService';
import { useUserActivityTracker } from './useUserActivityTracker';
import { indexedDBService } from '../services/indexedDBService';
import { browserCapabilitiesService } from '../services/browserCapabilitiesService';
import { inactivityTrackerService } from '../services/inactivityTrackerService';
import { logger } from '../services/loggerService';

interface UseReminderCheckerOptions {
  userId: string | null;
  empresaId: string | null;
  intervalMs?: number;
  enabled?: boolean;
}

interface ReminderCheckerState {
  pendingCount: number;
  lastCheckTime: Date | null;
  isChecking: boolean;
}

export function useReminderChecker(options: UseReminderCheckerOptions) {
  const { userId, empresaId, intervalMs, enabled = true } = options;

  const capabilities = browserCapabilitiesService.detect();
  const actualIntervalMs = intervalMs || browserCapabilitiesService.getRecommendedCheckInterval();

  const [state, setState] = useState<ReminderCheckerState>({
    pendingCount: 0,
    lastCheckTime: null,
    isChecking: false,
  });

  const [hasPermission, setHasPermission] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const backgroundSyncRegisteredRef = useRef(false);

  const { getMinutesInactive, resetActivity } = useUserActivityTracker();

  const checkReminders = async () => {
    if (!userId || !empresaId || !enabled || !hasPermission || state.isChecking) {
      return;
    }

    setState((prev) => ({ ...prev, isChecking: true }));

    try {
      const remindersSent = await reminderService.checkAndSendReminders(userId, empresaId);
      const pendingCount = await reminderService.getPendingRecordsCount(userId);

      setState({
        pendingCount,
        lastCheckTime: new Date(),
        isChecking: false,
      });

      if (indexedDBService.isSupported()) {
        await indexedDBService.saveReminderState({
          userId,
          lastCheckTime: new Date().toISOString(),
          pendingCount,
          lastNotificationSent: remindersSent > 0 ? new Date().toISOString() : undefined,
        });
      }

      if (remindersSent > 0) {
        logger.info(`Sent ${remindersSent} reminder(s)`, undefined, 'ReminderChecker');
      }
    } catch (error) {
      logger.error('Error checking reminders', error, 'ReminderChecker');
      setState((prev) => ({ ...prev, isChecking: false }));
    }
  };


  const requestNotificationPermission = async () => {
    const granted = await notificationService.requestPermission();
    setHasPermission(granted);

    if (granted && userId) {
      await reminderService.createDefaultSettings(userId);
    }

    return granted;
  };

  useEffect(() => {
    setHasPermission(notificationService.hasPermission());
  }, []);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && hasPermission && userId && empresaId) {
        await checkReminders();

        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'CHECK_REMINDERS_NOW',
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId, empresaId, hasPermission, enabled]);

  useEffect(() => {
    if (!userId || !empresaId || !enabled || !hasPermission) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    checkReminders();

    intervalRef.current = window.setInterval(() => {
      checkReminders();
    }, actualIntervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [userId, empresaId, actualIntervalMs, enabled, hasPermission]);

  useEffect(() => {
    const registerBackgroundSync = async () => {
      if (!userId || !hasPermission || backgroundSyncRegisteredRef.current) {
        return;
      }

      if (!capabilities.canBackgroundSync) {
        logger.debug('Background sync not supported', { platform: capabilities.platform, browser: capabilities.browser }, 'ReminderChecker');
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;

        if ('periodicSync' in registration) {
          const status = await (navigator as any).permissions.query({
            name: 'periodic-background-sync',
          });

          if (status.state === 'granted') {
            await (registration as any).periodicSync.register('periodic-reminder-check', {
              minInterval: browserCapabilitiesService.getMinimumPeriodicSyncInterval(),
            });
            logger.info('Periodic background sync registered for reminders', undefined, 'ReminderChecker');
            backgroundSyncRegisteredRef.current = true;
          }
        } else if ('sync' in registration) {
          await (registration as any).sync.register('reminder-check-sync');
          logger.info('Background sync registered for reminders', undefined, 'ReminderChecker');
          backgroundSyncRegisteredRef.current = true;
        }
      } catch (error) {
        logger.error('Error registering background sync', error, 'ReminderChecker');
      }
    };

    registerBackgroundSync();
  }, [userId, hasPermission, capabilities.canBackgroundSync]);

  return {
    ...state,
    hasPermission,
    canRequestPermission: notificationService.canRequestPermission(),
    isPermissionDenied: notificationService.isPermissionDenied(),
    requestPermission: requestNotificationPermission,
    checkNow: checkReminders,
  };
}
