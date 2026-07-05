import { useEffect, useRef } from 'react';
import { recordSyncService } from '../services/recordSyncService';
import { indexedDBService } from '../services/indexedDBService';

interface UseRecordSyncOptions {
  userId: string | null;
  empresaId: string | null;
  enabled?: boolean;
}

export function useRecordSync(options: UseRecordSyncOptions) {
  const { userId, empresaId, enabled = true } = options;
  const syncedRef = useRef(false);
  const cleanupIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const initializeSync = async () => {
      if (!userId || !empresaId || !enabled || syncedRef.current) {
        return;
      }

      if (!indexedDBService.isSupported()) {
        return;
      }

      try {
        await indexedDBService.init();

        await recordSyncService.syncActiveRecordsToIndexedDB(userId, empresaId);

        await recordSyncService.checkAndCleanupCompletedRecords(userId, empresaId);

        syncedRef.current = true;

        cleanupIntervalRef.current = window.setInterval(
          async () => {
            await recordSyncService.checkAndCleanupCompletedRecords(userId, empresaId);
          },
          10 * 60 * 1000
        );
      } catch (error) {
      }
    };

    initializeSync();

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
        cleanupIntervalRef.current = null;
      }
    };
  }, [userId, empresaId, enabled]);

  const syncNow = async () => {
    if (!userId || !empresaId) {
      return;
    }

    try {
      await recordSyncService.syncActiveRecordsToIndexedDB(userId, empresaId);
      await recordSyncService.checkAndCleanupCompletedRecords(userId, empresaId);
    } catch (error) {
    }
  };

  const markRecordCompleted = async (recordId: string) => {
    try {
      await recordSyncService.markRecordAsCompleted(recordId);
    } catch (error) {
    }
  };

  const addActiveRecord = async (
    recordId: string,
    tipoRegistro: string,
    horaInicio: string,
    infoAdicional: {
      suite?: string;
      servico?: string;
      tipo?: string;
      status: string;
    }
  ) => {
    if (!userId || !empresaId) {
      return;
    }

    try {
      await recordSyncService.addActiveRecordToIndexedDB(
        recordId,
        tipoRegistro,
        horaInicio,
        userId,
        empresaId,
        infoAdicional
      );
    } catch (error) {
    }
  };

  return {
    syncNow,
    markRecordCompleted,
    addActiveRecord,
  };
}
