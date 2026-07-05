import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { activityTrackingService } from '../services/activityTrackingService';

interface MarkingData {
  tipo_marcacao: 'inicio' | 'conclusao' | 'atividade_marcada' | 'pausa';
  modulo: string;
}

const STORAGE_KEY = 'ultima_marcacao_atividade';

export const useActivityMarkingTracker = () => {
  const registrarMarcacao = useCallback(async (data: MarkingData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!userData?.empresa_id) return;

      const timestamp = new Date().toISOString();

      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        timestamp,
        tipo: data.tipo_marcacao,
        modulo: data.modulo
      }));

      // Atualizar rastreamento de atividade para sistema backend de notificações
      const acaoMap: Record<string, 'inicio' | 'pausa' | 'conclusao' | 'marcacao'> = {
        'inicio': 'inicio',
        'pausa': 'pausa',
        'conclusao': 'conclusao',
        'atividade_marcada': 'marcacao'
      };

      await activityTrackingService.updateActivity({
        usuarioId: user.id,
        empresaId: userData.empresa_id,
        modulo: data.modulo,
        acao: acaoMap[data.tipo_marcacao] || 'marcacao'
      });

      // Compatibilidade: manter tabela antiga também
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
        console.error('Erro ao salvar marcação no Supabase:', upsertError);
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
        console.error('Erro ao fechar alertas:', alertError);
      }

    } catch (error) {
      console.error('Erro ao registrar marcação:', error);
    }
  }, []);

  const obterUltimaMarcacao = useCallback(async (): Promise<Date | null> => {
    try {
      const localData = localStorage.getItem(STORAGE_KEY);
      if (localData) {
        const parsed = JSON.parse(localData);
        return new Date(parsed.timestamp);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from('ultima_marcacao_usuario')
        .select('ultima_marcacao_em')
        .eq('usuario_id', user.id)
        .maybeSingle();

      if (data?.ultima_marcacao_em) {
        const timestamp = new Date(data.ultima_marcacao_em);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          timestamp: data.ultima_marcacao_em,
          tipo: 'sync',
          modulo: 'sync'
        }));
        return timestamp;
      }

      return null;
    } catch (error) {
      console.error('Erro ao obter última marcação:', error);
      return null;
    }
  }, []);

  const limparMarcacao = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    registrarMarcacao,
    obterUltimaMarcacao,
    limparMarcacao
  };
};
