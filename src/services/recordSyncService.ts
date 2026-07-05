import { supabase } from '../lib/supabase';
import { indexedDBService, type ActiveRecord } from './indexedDBService';
import { logger } from './loggerService';

class RecordSyncService {
  async syncActiveRecordsToIndexedDB(userId: string, empresaId: string): Promise<void> {
    if (!indexedDBService.isSupported()) {
      return;
    }

    try {
      const activeRecords = await this.fetchActiveRecordsFromSupabase(userId, empresaId);

      for (const record of activeRecords) {
        await indexedDBService.saveActiveRecord(record);
      }


      // Se não houver registros ativos, limpar o current_module
      if (activeRecords.length === 0) {
        await indexedDBService.clearCurrentModule(userId);
      }
    } catch (error) {
      logger.error('Error syncing active records to IndexedDB:', error);
    }
  }

  private async fetchActiveRecordsFromSupabase(
    userId: string,
    empresaId: string
  ): Promise<ActiveRecord[]> {
    const activeRecords: ActiveRecord[] = [];

    const tables = [
      { name: 'registros_camararia', tipo: 'camararia' },
      { name: 'registros_recepcao', tipo: 'recepcao' },
      { name: 'registros_areas_comuns', tipo: 'areas_comuns' },
      { name: 'registros_gestao', tipo: 'gestao' },
      { name: 'registros_atividades_diarias', tipo: 'atividades_diarias' },
      { name: 'registros_atividades_extras', tipo: 'atividades_extras' },
      { name: 'registros_cozinha', tipo: 'cozinha' },
      { name: 'registros_vendas', tipo: 'vendas' },
      { name: 'registros_revisao', tipo: 'revisao' },
    ];

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table.name)
          .select('id, hora_inicio, usuario_id, empresa_id, status')
          .eq('usuario_id', userId)
          .eq('empresa_id', empresaId)
          .eq('status', 'em_andamento');

        if (error) {
          console.error(`Error fetching ${table.name}:`, error);
          continue;
        }

        if (data) {
          for (const record of data) {
            activeRecords.push({
              id: record.id,
              tipo_registro: table.tipo,
              hora_inicio: record.hora_inicio,
              usuario_id: record.usuario_id,
              empresa_id: record.empresa_id,
              info_adicional: {
                status: record.status,
              },
            });
          }
        }
      } catch (error) {
        console.error(`Error processing ${table.name}:`, error);
      }
    }

    return activeRecords;
  }

  async markRecordAsCompleted(recordId: string): Promise<void> {
    if (!indexedDBService.isSupported()) {
      return;
    }

    try {
      await indexedDBService.removeActiveRecord(recordId);
    } catch (error) {
      logger.error('Error removing completed record from IndexedDB:', error);
    }
  }

  async addActiveRecordToIndexedDB(
    recordId: string,
    tipoRegistro: string,
    horaInicio: string,
    userId: string,
    empresaId: string,
    infoAdicional: {
      suite?: string;
      servico?: string;
      tipo?: string;
      status: string;
    }
  ): Promise<void> {
    if (!indexedDBService.isSupported()) {
      return;
    }

    try {
      await indexedDBService.saveActiveRecord({
        id: recordId,
        tipo_registro: tipoRegistro,
        hora_inicio: horaInicio,
        usuario_id: userId,
        empresa_id: empresaId,
        info_adicional: infoAdicional,
      });
    } catch (error) {
      logger.error('Error adding active record to IndexedDB:', error);
    }
  }

  async checkAndCleanupCompletedRecords(userId: string, empresaId: string): Promise<void> {
    if (!indexedDBService.isSupported()) {
      return;
    }

    try {
      const localRecords = await indexedDBService.getActiveRecords(userId);

      for (const localRecord of localRecords) {
        const stillActive = await this.isRecordStillActive(
          localRecord.id,
          localRecord.tipo_registro,
          empresaId
        );

        if (!stillActive) {
          await indexedDBService.removeActiveRecord(localRecord.id);
        }
      }

      // Após cleanup, verificar se ainda há registros
      const remainingRecords = await indexedDBService.getActiveRecords(userId);
      if (remainingRecords.length === 0) {
        await indexedDBService.clearCurrentModule(userId);
      }
    } catch (error) {
      logger.error('Error checking and cleaning up completed records:', error);
    }
  }

  private async isRecordStillActive(
    recordId: string,
    tipoRegistro: string,
    empresaId: string
  ): Promise<boolean> {
    const tableMap: Record<string, string> = {
      camararia: 'registros_camararia',
      recepcao: 'registros_recepcao',
      areas_comuns: 'registros_areas_comuns',
      gestao: 'registros_gestao',
      atividades_diarias: 'registros_atividades_diarias',
      atividades_extras: 'registros_atividades_extras',
      cozinha: 'registros_cozinha',
      vendas: 'registros_vendas',
      revisao: 'registros_revisao',
    };

    const tableName = tableMap[tipoRegistro];
    if (!tableName) {
      return false;
    }

    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('status')
        .eq('id', recordId)
        .eq('empresa_id', empresaId)
        .maybeSingle();

      if (error || !data) {
        return false;
      }

      return data.status === 'em_andamento';
    } catch (error) {
      logger.error('Error checking record status:', error);
      return false;
    }
  }
}

export const recordSyncService = new RecordSyncService();
