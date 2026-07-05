import { supabase } from '../lib/supabase';
import { indexedDBService } from './indexedDBService';
import { getDataHoraAtual } from '../utils/dateUtils';
import { logger } from './loggerService';

interface MarkingData {
  tipo_marcacao: 'inicio' | 'conclusao' | 'atividade_marcada' | 'pausa';
  modulo: string;
}

const STORAGE_KEY = 'ultima_marcacao_atividade';

class ActivityMarkingService {
  async registrarMarcacao(data: MarkingData): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logger.debug('[ActivityMarking] No user found');
        return;
      }

      const { data: userData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!userData?.empresa_id) {
        logger.debug('[ActivityMarking] No empresa_id found for user');
        return;
      }

      const timestamp = getDataHoraAtual();

      const activeRecords = await indexedDBService.getActiveRecords(user.id);
      logger.debug(`[ActivityMarking] Found ${activeRecords.length} active records for user`);

      if (activeRecords.length > 0) {
        logger.debug(`[ActivityMarking] Registering ${data.tipo_marcacao} for module: ${data.modulo} at ${timestamp}`);

        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          timestamp,
          tipo: data.tipo_marcacao,
          modulo: data.modulo
        }));

        try {
          await indexedDBService.saveCurrentModule(user.id, data.modulo);
        } catch (error) {
          logger.error('[ActivityMarking] Error saving module to IndexedDB:', error);
        }

        const { error: upsertError } = await supabase
          .from('ultima_marcacao_usuario')
          .upsert({
            usuario_id: user.id,
            empresa_id: userData.empresa_id,
            ultima_marcacao_em: timestamp,
            tipo_marcacao: data.tipo_marcacao,
            modulo: data.modulo
          }, {
            onConflict: 'usuario_id,empresa_id'
          });

        if (upsertError) {
          logger.error('[ActivityMarking] Error saving marking to Supabase:', upsertError);
        } else {
          logger.debug('[ActivityMarking] ✓ Marking saved successfully to database');
        }
      } else {
        logger.debug('No active records - cleaning marking state', null, 'ActivityMarking');
        this.limparMarcacao();

        try {
          await indexedDBService.clearCurrentModule(user.id);
        } catch (error) {
          logger.error('Erro ao limpar módulo do IndexedDB:', error);
        }

        try {
          await supabase
            .from('ultima_marcacao_usuario')
            .delete()
            .eq('usuario_id', user.id)
            .eq('empresa_id', userData.empresa_id);
        } catch (error) {
          logger.error('Erro ao limpar marcação do Supabase:', error);
        }
      }

      const { error: alertError } = await supabase
        .from('alertas_inatividade_marcacao')
        .update({
          fechado_em: timestamp,
          acao_tomada: 'marcacao_feita'
        })
        .eq('usuario_id', user.id)
        .is('fechado_em', null);

      if (alertError) {
        logger.error('Erro ao fechar alertas:', alertError);
      }

    } catch (error) {
      logger.error('Erro ao registrar marcação:', error);
    }
  }

  async registrarInicio(modulo: string): Promise<void> {
    await this.registrarMarcacao({
      tipo_marcacao: 'inicio',
      modulo
    });
  }

  async registrarConclusao(modulo: string): Promise<void> {
    await this.registrarMarcacao({
      tipo_marcacao: 'conclusao',
      modulo
    });
  }

  async registrarAtividadeMarcada(modulo: string): Promise<void> {
    await this.registrarMarcacao({
      tipo_marcacao: 'atividade_marcada',
      modulo
    });
  }

  async registrarPausa(modulo: string): Promise<void> {
    await this.registrarMarcacao({
      tipo_marcacao: 'pausa',
      modulo
    });
  }

  obterUltimaMarcacao(): Date | null {
    try {
      const localData = localStorage.getItem(STORAGE_KEY);
      if (localData) {
        const parsed = JSON.parse(localData);
        return new Date(parsed.timestamp);
      }
      return null;
    } catch (error) {
      logger.error('Erro ao obter última marcação:', error);
      return null;
    }
  }

  obterModuloAtual(): string | null {
    try {
      const localData = localStorage.getItem(STORAGE_KEY);
      if (localData) {
        const parsed = JSON.parse(localData);
        return parsed.modulo || null;
      }
      return null;
    } catch (error) {
      logger.error('Erro ao obter módulo atual:', error);
      return null;
    }
  }

  limparMarcacao(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  async limparRastreamentoCompleto(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      localStorage.removeItem(STORAGE_KEY);

      try {
        await indexedDBService.clearCurrentModule(user.id);
      } catch (error) {
        logger.error('Erro ao limpar módulo do IndexedDB:', error);
      }

      try {
        const { data: userData } = await supabase
          .from('usuarios')
          .select('empresa_id')
          .eq('id', user.id)
          .maybeSingle();

        if (userData?.empresa_id) {
          await supabase
            .from('ultima_marcacao_usuario')
            .delete()
            .eq('usuario_id', user.id)
            .eq('empresa_id', userData.empresa_id);
        }
      } catch (error) {
        logger.error('Erro ao limpar marcação do Supabase:', error);
      }

    } catch (error) {
      logger.error('Erro ao limpar rastreamento completo:', error);
    }
  }
}

export const activityMarkingService = new ActivityMarkingService();
