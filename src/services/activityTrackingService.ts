import { supabase } from '../lib/supabase';
import { logger } from './loggerService';

/**
 * Serviço centralizado para rastrear atividade dos usuários
 * Atualiza a tabela ultima_marcacao_usuario sempre que usuário realiza uma ação
 * Usado pelo sistema backend de notificações de inatividade
 */

interface UpdateActivityParams {
  usuarioId: string;
  empresaId: string;
  modulo: string;
  acao: 'inicio' | 'pausa' | 'conclusao' | 'marcacao';
}

export const activityTrackingService = {
  /**
   * Atualiza timestamp de última atividade do usuário
   * Registra log para auditoria e debugging
   */
  async updateActivity(params: UpdateActivityParams): Promise<void> {
    const { usuarioId, empresaId, modulo, acao } = params;

    try {
      // Buscar timestamp anterior
      const { data: marcacaoAnterior } = await supabase
        .from('ultima_marcacao_usuario')
        .select('ultima_marcacao_em')
        .eq('usuario_id', usuarioId)
        .maybeSingle();

      const timestampAnterior = marcacaoAnterior?.ultima_marcacao_em || null;
      const timestampNovo = new Date().toISOString();

      // Atualizar ou inserir última marcação
      const { error: upsertError } = await supabase
        .from('ultima_marcacao_usuario')
        .upsert({
          usuario_id: usuarioId,
          empresa_id: empresaId,
          ultima_marcacao_em: timestampNovo,
          tipo_marcacao: acao,
          modulo: modulo,
          updated_at: timestampNovo,
        }, {
          onConflict: 'usuario_id'
        });

      if (upsertError) {
        logger.error('Error updating ultima_marcacao_usuario', upsertError, 'ActivityTracking');
        throw upsertError;
      }

      // Registrar log para debugging
      const { error: logError } = await supabase
        .from('logs_atualizacao_marcacao')
        .insert({
          usuario_id: usuarioId,
          empresa_id: empresaId,
          modulo,
          acao,
          timestamp_anterior: timestampAnterior,
          timestamp_novo: timestampNovo,
        });

      if (logError) {
        logger.error('Error registering activity log (non-critical)', logError, 'ActivityTracking');
      }

      logger.debug(`Activity registered: ${modulo} - ${acao}`, null, 'ActivityTracking');

    } catch (error) {
      logger.error('Error updating activity', error, 'ActivityTracking');
      throw error;
    }
  },

  /**
   * Registra início de um registro/atividade
   */
  async trackRecordStart(usuarioId: string, empresaId: string, modulo: string): Promise<void> {
    return this.updateActivity({
      usuarioId,
      empresaId,
      modulo,
      acao: 'inicio'
    });
  },

  /**
   * Registra pausa em um registro/atividade
   */
  async trackRecordPause(usuarioId: string, empresaId: string, modulo: string): Promise<void> {
    return this.updateActivity({
      usuarioId,
      empresaId,
      modulo,
      acao: 'pausa'
    });
  },

  /**
   * Registra conclusão de um registro/atividade
   */
  async trackRecordCompletion(usuarioId: string, empresaId: string, modulo: string): Promise<void> {
    return this.updateActivity({
      usuarioId,
      empresaId,
      modulo,
      acao: 'conclusao'
    });
  },

  /**
   * Registra marcação de atividade
   */
  async trackActivityMarking(usuarioId: string, empresaId: string, modulo: string): Promise<void> {
    return this.updateActivity({
      usuarioId,
      empresaId,
      modulo,
      acao: 'marcacao'
    });
  },

  /**
   * Busca última marcação do usuário
   */
  async getLastActivity(usuarioId: string): Promise<Date | null> {
    try {
      const { data, error } = await supabase
        .from('ultima_marcacao_usuario')
        .select('ultima_marcacao_em')
        .eq('usuario_id', usuarioId)
        .maybeSingle();

      if (error) throw error;

      return data?.ultima_marcacao_em ? new Date(data.ultima_marcacao_em) : null;
    } catch (error) {
      console.error('[ActivityTracking] Erro ao buscar última atividade:', error);
      return null;
    }
  },

  /**
   * Calcula minutos de inatividade do usuário
   */
  async getMinutesInactive(usuarioId: string): Promise<number> {
    const lastActivity = await this.getLastActivity(usuarioId);

    if (!lastActivity) {
      return 0;
    }

    const now = new Date();
    const diffMs = now.getTime() - lastActivity.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    return diffMinutes;
  },

  /**
   * Verifica se usuário tem registros abertos em algum módulo
   */
  async hasOpenRecords(usuarioId: string): Promise<{ hasOpen: boolean; modules: string[] }> {
    const modulesToCheck = [
      { table: 'registros_camararia', name: 'Camararia' },
      { table: 'registros_areas_comuns', name: 'Áreas Comuns' },
      { table: 'registros_cozinha', name: 'Cozinha' },
      { table: 'registros_gestao', name: 'Gestão' },
      { table: 'registros_recepcao', name: 'Recepção' },
      { table: 'registros_vendas', name: 'Vendas' },
      { table: 'registros_revisao', name: 'Revisão' },
      { table: 'registros_atividades_diarias', name: 'Atividades Diárias' },
      { table: 'registros_atividades_extras', name: 'Atividades Extras' },
    ];

    const modulesWithOpenRecords: string[] = [];

    for (const module of modulesToCheck) {
      try {
        const { data, error } = await supabase
          .from(module.table)
          .select('id')
          .eq('usuario_executor_id', usuarioId)
          .eq('status', 'em_andamento')
          .limit(1);

        if (!error && data && data.length > 0) {
          modulesWithOpenRecords.push(module.name);
        }
      } catch (error) {
        console.error(`[ActivityTracking] Erro ao verificar ${module.table}:`, error);
      }
    }

    return {
      hasOpen: modulesWithOpenRecords.length > 0,
      modules: modulesWithOpenRecords
    };
  }
};
