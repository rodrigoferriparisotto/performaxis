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

    const resultados = await Promise.all(tables.map(async (table) => {
      try {
        const { data, error } = await supabase
          .from(table.name)
          .select('id, hora_inicio, usuario_id, empresa_id, status')
          .eq('usuario_id', userId)
          .eq('empresa_id', empresaId)
          .eq('status', 'em_andamento');

        if (error) {
          console.error(`Error fetching ${table.name}:`, error);
          return [];
        }

        return (data || []).map((record): ActiveRecord => ({
          id: record.id,
          tipo_registro: table.tipo,
          hora_inicio: record.hora_inicio,
          usuario_id: record.usuario_id,
          empresa_id: record.empresa_id,
          info_adicional: {
            status: record.status,
          },
        }));
      } catch (error) {
        console.error(`Error processing ${table.name}:`, error);
        return [];
      }
    }));
    activeRecords.push(...resultados.flat());

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

      const ativos = await this.idsAindaAtivos(localRecords, empresaId);
      if (ativos) {
        await Promise.all(
          localRecords
            .filter((r) => !ativos.has(r.id))
            .map((r) => indexedDBService.removeActiveRecord(r.id))
        );
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

  /**
   * Uma consulta por tabela envolvida (em paralelo) em vez de uma por registro.
   * Devolve null se alguma consulta falhar, para não apagar nada por engano.
   */
  private async idsAindaAtivos(
    registros: { id: string; tipo_registro: string }[],
    empresaId: string
  ): Promise<Set<string> | null> {
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

    const porTabela = new Map<string, string[]>();
    for (const r of registros) {
      const tabela = tableMap[r.tipo_registro];
      if (!tabela) continue;
      porTabela.set(tabela, [...(porTabela.get(tabela) || []), r.id]);
    }

    const ativos = new Set<string>();
    try {
      const respostas = await Promise.all(
        [...porTabela.entries()].map(([tabela, ids]) =>
          supabase
            .from(tabela)
            .select('id')
            .in('id', ids)
            .eq('empresa_id', empresaId)
            .eq('status', 'em_andamento')
        )
      );
      for (const { data, error } of respostas) {
        if (error) return null;
        (data || []).forEach((linha: { id: string }) => ativos.add(linha.id));
      }
      return ativos;
    } catch (error) {
      logger.error('Error checking record status:', error);
      return null;
    }
  }
}

export const recordSyncService = new RecordSyncService();
