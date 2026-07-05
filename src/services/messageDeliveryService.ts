import { supabase } from '../lib/supabase';

export interface UnreadMessage {
  mensagem_id: string;
  titulo: string;
  conteudo: string;
  tipo: 'informacao' | 'aviso' | 'urgente';
  bloqueia_sistema: boolean;
  criada_em: string;
  tentativas_entrega: number;
}

export interface DeliveryStats {
  total_destinatarios: number;
  lidas: number;
  nao_lidas: number;
  push_enviadas: number;
  tentativas_media: number;
}

export class MessageDeliveryService {
  static async getUnreadMessages(userId: string): Promise<UnreadMessage[]> {
    try {
      const { data, error } = await supabase.rpc('obter_mensagens_nao_lidas', {
        p_usuario_id: userId,
      });

      if (error) {
        console.error('Erro ao buscar mensagens não lidas:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar mensagens não lidas:', error);
      return [];
    }
  }

  static async registerDeliveryAttempt(
    userId: string,
    messageId: string,
    method: 'realtime' | 'push' | 'email' | 'verificacao' | 'manual' = 'verificacao'
  ): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('registrar_tentativa_entrega', {
        p_usuario_id: userId,
        p_mensagem_id: messageId,
        p_metodo: method,
      });

      if (error) {
        console.error('Erro ao registrar tentativa de entrega:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao registrar tentativa de entrega:', error);
      return false;
    }
  }

  static async markPushSent(userId: string, messageId: string): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('marcar_push_enviada', {
        p_usuario_id: userId,
        p_mensagem_id: messageId,
      });

      if (error) {
        console.error('Erro ao marcar push enviada:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao marcar push enviada:', error);
      return false;
    }
  }

  static async getDeliveryStats(messageId: string): Promise<DeliveryStats | null> {
    try {
      const { data, error } = await supabase.rpc('obter_estatisticas_entrega', {
        p_mensagem_id: messageId,
      });

      if (error) {
        console.error('Erro ao buscar estatísticas de entrega:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Erro ao buscar estatísticas de entrega:', error);
      return null;
    }
  }

  static async markMessageAsRead(userId: string, messageId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('mensagens_broadcast_lidas')
        .upsert({
          usuario_id: userId,
          mensagem_id: messageId,
          lida_em: new Date().toISOString(),
        }, {
          onConflict: 'usuario_id,mensagem_id'
        });

      if (error) {
        console.error('Erro ao marcar mensagem como lida:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao marcar mensagem como lida:', error);
      return false;
    }
  }

  static async updateLastCheck(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          ultima_verificacao_mensagens: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Erro ao atualizar última verificação:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao atualizar última verificação:', error);
      return false;
    }
  }

  static async checkForBlockingMessages(userId: string): Promise<UnreadMessage | null> {
    try {
      const messages = await this.getUnreadMessages(userId);
      const blockingMessage = messages.find(msg => msg.bloqueia_sistema);
      return blockingMessage || null;
    } catch (error) {
      console.error('Erro ao verificar mensagens bloqueantes:', error);
      return null;
    }
  }

  static async processUnreadMessages(
    userId: string,
    onMessage: (message: UnreadMessage) => void
  ): Promise<void> {
    try {
      const messages = await this.getUnreadMessages(userId);

      for (const message of messages) {
        await this.registerDeliveryAttempt(userId, message.mensagem_id, 'verificacao');
        onMessage(message);
      }

      await this.updateLastCheck(userId);
    } catch (error) {
      console.error('Erro ao processar mensagens não lidas:', error);
    }
  }

  static async getUsersWithoutDelivery(messageId: string): Promise<string[]> {
    try {
      const { data: message } = await supabase
        .from('mensagens_broadcast')
        .select('empresa_id')
        .eq('id', messageId)
        .single();

      if (!message) return [];

      const { data: users } = await supabase
        .from('usuarios')
        .select('id')
        .eq('empresa_id', message.empresa_id)
        .eq('active', true);

      if (!users) return [];

      const { data: readRecords } = await supabase
        .from('mensagens_broadcast_lidas')
        .select('usuario_id')
        .eq('mensagem_id', messageId)
        .not('lida_em', 'is', null);

      const readUserIds = new Set(readRecords?.map(r => r.usuario_id) || []);
      const undeliveredUsers = users
        .filter(u => !readUserIds.has(u.id))
        .map(u => u.id);

      return undeliveredUsers;
    } catch (error) {
      console.error('Erro ao buscar usuários sem entrega:', error);
      return [];
    }
  }
}
