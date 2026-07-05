import { supabase } from '../lib/supabase';
import { indexedDBService } from './indexedDBService';
import { logger } from './loggerService';

interface InactivityStatus {
  isInactive: boolean;
  minutesInactive: number;
  lastActivityTimestamp: string | null;
  hasActiveRecords: boolean;
}

class InactivityTrackerService {
  private async getLastActivityFromDatabase(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('ultima_marcacao_usuario')
        .select('ultima_marcacao_em')
        .eq('usuario_id', userId)
        .maybeSingle();

      if (error) throw error;

      return data?.ultima_marcacao_em || null;
    } catch (error) {
      logger.error('Error fetching last activity from database', error, 'InactivityTracker');
      return null;
    }
  }

  private async getLastActivityFromIndexedDB(userId: string): Promise<string | null> {
    try {
      if (!indexedDBService.isSupported()) {
        return null;
      }

      const activeRecords = await indexedDBService.getActiveRecords(userId);

      if (activeRecords.length === 0) {
        return null;
      }

      let latestTimestamp: string | null = null;

      for (const record of activeRecords) {
        const recordTimestamp = record.inicio_em;
        if (!latestTimestamp || recordTimestamp > latestTimestamp) {
          latestTimestamp = recordTimestamp;
        }
      }

      return latestTimestamp;
    } catch (error) {
      logger.error('Error fetching from IndexedDB', error, 'InactivityTracker');
      return null;
    }
  }

  private async hasActiveRecords(userId: string): Promise<boolean> {
    try {
      if (indexedDBService.isSupported()) {
        const activeRecords = await indexedDBService.getActiveRecords(userId);
        return activeRecords.length > 0;
      }

      const tables = [
        'registros_camararia',
        'registros_recepcao',
        'registros_areas_comuns',
        'registros_gestao',
        'registros_cozinha',
        'registros_vendas',
        'registros_revisao',
        'registros_atividades_diarias',
        'registros_atividades_extras'
      ];

      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .eq('usuario_id', userId)
          .eq('status', 'em_andamento')
          .limit(1);

        if (!error && data && data.length > 0) {
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Error checking active records', error, 'InactivityTracker');
      return false;
    }
  }

  async getInactivityStatus(userId: string): Promise<InactivityStatus> {
    logger.debug('Getting inactivity status', { userId }, 'InactivityTracker');

    const hasActiveRecords = await this.hasActiveRecords(userId);

    if (!hasActiveRecords) {
      return {
        isInactive: false,
        minutesInactive: 0,
        lastActivityTimestamp: null,
        hasActiveRecords: false,
      };
    }

    const dbTimestamp = await this.getLastActivityFromDatabase(userId);
    const indexedDBTimestamp = await this.getLastActivityFromIndexedDB(userId);

    const lastActivityTimestamp = this.getLatestTimestamp(dbTimestamp, indexedDBTimestamp);

    if (!lastActivityTimestamp) {
      return {
        isInactive: false,
        minutesInactive: 0,
        lastActivityTimestamp: null,
        hasActiveRecords: true,
      };
    }

    const minutesInactive = this.calculateMinutesInactive(lastActivityTimestamp);
    const isInactive = minutesInactive >= 30;

    logger.debug('Inactivity status calculated', {
      lastActivityTimestamp,
      minutesInactive,
      isInactive,
      hasActiveRecords,
      sources: {
        database: !!dbTimestamp,
        indexedDB: !!indexedDBTimestamp,
      }
    }, 'InactivityTracker');

    return {
      isInactive,
      minutesInactive,
      lastActivityTimestamp,
      hasActiveRecords,
    };
  }

  private getLatestTimestamp(timestamp1: string | null, timestamp2: string | null): string | null {
    if (!timestamp1 && !timestamp2) return null;
    if (!timestamp1) return timestamp2;
    if (!timestamp2) return timestamp1;

    return timestamp1 > timestamp2 ? timestamp1 : timestamp2;
  }

  private calculateMinutesInactive(lastActivityTimestamp: string): number {
    const now = new Date();
    const lastActivity = new Date(lastActivityTimestamp);
    const diffMs = now.getTime() - lastActivity.getTime();
    return Math.floor(diffMs / 1000 / 60);
  }

  async updateLastActivity(userId: string, empresaId: string, modulo: string): Promise<void> {
    try {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('ultima_marcacao_usuario')
        .upsert({
          usuario_id: userId,
          empresa_id: empresaId,
          ultima_marcacao_em: now,
          tipo_marcacao: 'atividade_marcada',
          modulo: modulo
        }, {
          onConflict: 'usuario_id,empresa_id'
        });

      if (error) {
        logger.error('Error updating last activity', error, 'InactivityTracker');
      }
    } catch (error) {
      logger.error('Error in updateLastActivity', error, 'InactivityTracker');
    }
  }

  async clearInactivity(userId: string): Promise<void> {
    try {
      await supabase
        .from('lembretes_inatividade_enviados')
        .delete()
        .eq('usuario_id', userId);

      logger.debug('Inactivity reminders cleared', null, 'InactivityTracker');
    } catch (error) {
      logger.error('Error clearing inactivity', error, 'InactivityTracker');
    }
  }
}

export const inactivityTrackerService = new InactivityTrackerService();
export type { InactivityStatus };
