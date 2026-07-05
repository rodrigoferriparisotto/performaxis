import { supabase } from '../lib/supabase';
import { indexedDBService } from './indexedDBService';
import { activityMarkingService } from './activityMarkingService';
import { logger } from './loggerService';

interface HealthCheckResult {
  orphanedMarkings: number;
  missingMarkings: number;
  fixedOrphanedMarkings: number;
  createdMissingMarkings: number;
  errors: string[];
}

class NotificationHealthCheckService {
  async performHealthCheck(userId: string, empresaId: string): Promise<HealthCheckResult> {
    logger.debug('Starting notification system health check', { userId }, 'HealthCheck');

    const result: HealthCheckResult = {
      orphanedMarkings: 0,
      missingMarkings: 0,
      fixedOrphanedMarkings: 0,
      createdMissingMarkings: 0,
      errors: []
    };

    try {
      await this.checkOrphanedMarkings(userId, empresaId, result);
      await this.checkMissingMarkings(userId, empresaId, result);
    } catch (error) {
      logger.error('Error during health check', error, 'HealthCheck');
      result.errors.push(`Health check error: ${error}`);
    }

    logger.debug('Health check completed', result, 'HealthCheck');
    return result;
  }

  private async checkOrphanedMarkings(
    userId: string,
    empresaId: string,
    result: HealthCheckResult
  ): Promise<void> {
    try {
      const { data: marking, error: markingError } = await supabase
        .from('ultima_marcacao_usuario')
        .select('*')
        .eq('usuario_id', userId)
        .eq('empresa_id', empresaId)
        .maybeSingle();

      if (markingError) throw markingError;

      if (!marking) {
        return;
      }

      const activeRecords = await indexedDBService.getActiveRecords(userId);

      if (activeRecords.length === 0) {
        logger.debug('Found orphaned marking', { userId }, 'HealthCheck');
        result.orphanedMarkings = 1;

        const tables = [
          'registros_camararia',
          'registros_recepcao',
          'registros_areas_comuns',
          'registros_gestao',
          'registros_cozinha',
          'registros_vendas',
          'registros_revisao',
          'registros_atividades_diarias',
          'registros_atividades_extras',
          'manutencoes'
        ];

        let hasActiveRecords = false;

        for (const table of tables) {
          const { data, error } = await supabase
            .from(table)
            .select('id')
            .or(`usuario_id.eq.${userId},usuario_executor_id.eq.${userId}`)
            .eq('status', 'em_andamento')
            .limit(1);

          if (!error && data && data.length > 0) {
            hasActiveRecords = true;
            logger.debug(`Found active records in ${table}`, null, 'HealthCheck');
            break;
          }
        }

        if (!hasActiveRecords) {
          logger.debug('Cleaning orphaned marking', null, 'HealthCheck');
          await activityMarkingService.limparRastreamentoCompleto();
          result.fixedOrphanedMarkings = 1;
        }
      }
    } catch (error) {
      logger.error('Error checking orphaned markings', error, 'HealthCheck');
      result.errors.push(`Orphaned markings check error: ${error}`);
    }
  }

  private async checkMissingMarkings(
    userId: string,
    empresaId: string,
    result: HealthCheckResult
  ): Promise<void> {
    try {
      const { data: marking, error: markingError } = await supabase
        .from('ultima_marcacao_usuario')
        .select('*')
        .eq('usuario_id', userId)
        .eq('empresa_id', empresaId)
        .maybeSingle();

      if (markingError) throw markingError;

      if (marking) {
        return;
      }

      const activeRecords = await indexedDBService.getActiveRecords(userId);

      if (activeRecords.length > 0) {
        logger.debug('Found missing marking', { userId }, 'HealthCheck');
        result.missingMarkings = 1;

        const latestRecord = activeRecords.reduce((latest: any, current: any) => {
          return new Date(current.inicio_em) > new Date(latest.inicio_em) ? current : latest;
        });

        logger.debug('Creating missing marking', { modulo: latestRecord.modulo }, 'HealthCheck');

        const { error: insertError } = await supabase
          .from('ultima_marcacao_usuario')
          .insert({
            usuario_id: userId,
            empresa_id: empresaId,
            ultima_marcacao_em: latestRecord.inicio_em,
            tipo_marcacao: 'inicio',
            modulo: latestRecord.modulo
          });

        if (insertError) {
          logger.error('Error creating missing marking', insertError, 'HealthCheck');
          result.errors.push(`Missing marking creation error: ${insertError.message}`);
        } else {
          result.createdMissingMarkings = 1;
          logger.debug('Missing marking created successfully', null, 'HealthCheck');
        }
      }
    } catch (error) {
      logger.error('Error checking missing markings', error, 'HealthCheck');
      result.errors.push(`Missing markings check error: ${error}`);
    }
  }

  async checkAndLogHealth(userId: string, empresaId: string): Promise<void> {
    try {
      const result = await this.performHealthCheck(userId, empresaId);

      if (result.orphanedMarkings > 0 || result.missingMarkings > 0 || result.errors.length > 0) {
        logger.warn('Health check found issues', {
          orphaned: result.orphanedMarkings,
          missing: result.missingMarkings,
          fixed: result.fixedOrphanedMarkings + result.createdMissingMarkings,
          errors: result.errors
        }, 'HealthCheck');

        await supabase
          .from('logs_verificacao_inatividade')
          .insert({
            executado_em: new Date().toISOString(),
            usuarios_verificados: 1,
            notificacoes_enviadas: 0,
            erros: result.errors.length > 0 ? result.errors : null,
            detalhes: {
              type: 'health_check',
              userId,
              result
            }
          });
      }
    } catch (error) {
      logger.error('Fatal error during health check', error, 'HealthCheck');
    }
  }
}

export const notificationHealthCheckService = new NotificationHealthCheckService();
