import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { fcmPushService } from './fcmPushService';
import { logger } from './loggerService';

export interface BroadcastMessage {
  id: string;
  titulo: string;
  conteudo: string;
  tipo: 'info' | 'aviso' | 'urgente';
  bloqueia_sistema: boolean;
  autor_id: string | null;
  empresa_id: string | null;
  ativa: boolean;
  created_at: string;
  updated_at: string;
  autor?: {
    name: string;
  };
}

export interface MessageReadStatus {
  id: string;
  mensagem_id: string;
  usuario_id: string;
  lida_em: string;
}

export interface MessageStatistics {
  mensagem_id: string;
  total_usuarios: number;
  usuarios_leram: number;
  percentual_leitura: number;
  total_destinatarios?: number;
  nao_lidas?: number;
  push_enviadas?: number;
  tentativas_media?: number;
}

export class BroadcastMessageService {
  private static channel: RealtimeChannel | null = null;

  /**
   * Get unread messages for the current user
   */
  static async getUnreadMessages(): Promise<BroadcastMessage[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return [];
      }

      // Get all active messages
      const { data: messages, error: messagesError } = await supabase
        .from('mensagens_broadcast')
        .select(`
          *,
          autor:usuarios!mensagens_broadcast_autor_id_fkey(name)
        `)
        .eq('ativa', true)
        .order('created_at', { ascending: false });

      if (messagesError) {
        logger.error('Error fetching messages', messagesError, 'BroadcastMessageService');
        return [];
      }

      if (!messages || messages.length === 0) {
        return [];
      }

      const { data: readMessages, error: readError } = await supabase
        .from('mensagens_broadcast_lidas')
        .select('mensagem_id')
        .eq('usuario_id', user.id);

      if (readError) {
        logger.error('Error fetching read messages', readError, 'BroadcastMessageService');
        return messages;
      }

      const readMessageIds = new Set(readMessages?.map(rm => rm.mensagem_id) || []);

      return messages.filter(message => !readMessageIds.has(message.id));
    } catch (error) {
      logger.error('Error in getUnreadMessages', error, 'BroadcastMessageService');
      return [];
    }
  }

  /**
   * Mark a message as read for the current user
   */
  static async markAsRead(messageId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('mensagens_broadcast_lidas')
        .insert({
          mensagem_id: messageId,
          usuario_id: user.id,
          lida_em: new Date().toISOString(),
        });

      if (error) {
        // If error is due to unique constraint (already read), consider it success
        if (error.code === '23505') {
          return { success: true };
        }
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Publish a new broadcast message (gestor only)
   */
  static async publishMessage(
    titulo: string,
    conteudo: string,
    tipo: 'info' | 'aviso' | 'urgente',
    bloqueiaSistema: boolean,
    empresaId: string | null = null
  ): Promise<{ success: boolean; error?: string; pushResult?: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data: userData } = await supabase
        .from('usuarios')
        .select('profile, empresa_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!userData) {
        return { success: false, error: 'User data not found' };
      }

      if (userData.profile !== 'gestor') {
        logger.warn('Unauthorized broadcast attempt by non-gestor', { userId: user.id, profile: userData.profile }, 'BroadcastMessageService');
        return { success: false, error: 'Apenas gestores de empresa podem enviar mensagens broadcast' };
      }

      if (!userData.empresa_id) {
        logger.warn('Unauthorized broadcast attempt without empresa_id', { userId: user.id }, 'BroadcastMessageService');
        return { success: false, error: 'Você precisa estar vinculado a uma empresa para enviar mensagens' };
      }

      if (empresaId && empresaId !== userData.empresa_id) {
        logger.warn('Unauthorized broadcast attempt to different empresa', {
          userId: user.id,
          userEmpresaId: userData.empresa_id,
          targetEmpresaId: empresaId
        }, 'BroadcastMessageService');
        return { success: false, error: 'Você só pode enviar mensagens para sua própria empresa' };
      }

      const finalEmpresaId = empresaId || userData.empresa_id;

      const { data: newMessage, error } = await supabase
        .from('mensagens_broadcast')
        .insert({
          titulo,
          conteudo,
          tipo,
          bloqueia_sistema: bloqueiaSistema,
          autor_id: user.id,
          empresa_id: finalEmpresaId,
          ativa: true,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      let pushResult;
      try {
        pushResult = await fcmPushService.enviarParaEmpresa(
          finalEmpresaId,
          titulo,
          conteudo.substring(0, 200) + (conteudo.length > 200 ? '...' : ''),
          'broadcast',
          {
            priority: tipo === 'urgente' ? 'high' : 'normal',
            data: {
              messageId: newMessage.id,
              tipo,
              bloqueiaSistema: bloqueiaSistema.toString(),
              url: '/',
              broadcast: 'true',
            },
            badge: 1,
          }
        );

        logger.info('Broadcast push notification sent immediately', pushResult, 'BroadcastMessageService');

        if (tipo === 'urgente') {
          setTimeout(async () => {
            try {
              const unreadUsers = await this.getUnreadUserIds(newMessage.id);

              if (unreadUsers.length > 0) {
                const retryResult = await fcmPushService.enviarParaGrupo(
                  unreadUsers,
                  `LEMBRETE: ${titulo}`,
                  conteudo.substring(0, 200) + (conteudo.length > 200 ? '...' : ''),
                  'urgente',
                  {
                    priority: 'high',
                    data: {
                      messageId: newMessage.id,
                      tipo: 'urgente',
                      bloqueiaSistema: bloqueiaSistema.toString(),
                      url: '/',
                      broadcast: 'true',
                      retry: 'true',
                    },
                    badge: 1,
                  }
                );

                logger.info('Urgent broadcast retry sent', { unreadCount: unreadUsers.length, result: retryResult }, 'BroadcastMessageService');
              }
            } catch (retryError) {
              logger.error('Error sending urgent retry', retryError, 'BroadcastMessageService');
            }
          }, 3 * 60 * 1000);
        }
      } catch (pushError) {
        logger.error('Error sending push notification', pushError, 'BroadcastMessageService');
      }

      return { success: true, pushResult };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get IDs of users who haven't read a message yet
   */
  private static async getUnreadUserIds(messageId: string): Promise<string[]> {
    try {
      const { data: message } = await supabase
        .from('mensagens_broadcast')
        .select('empresa_id')
        .eq('id', messageId)
        .maybeSingle();

      if (!message || !message.empresa_id) {
        return [];
      }

      const { data: allUsers } = await supabase
        .from('usuarios')
        .select('id')
        .eq('empresa_id', message.empresa_id);

      if (!allUsers || allUsers.length === 0) {
        return [];
      }

      const { data: readRecords } = await supabase
        .from('mensagens_broadcast_lidas')
        .select('usuario_id')
        .eq('mensagem_id', messageId);

      const readUserIds = new Set(readRecords?.map(r => r.usuario_id) || []);

      return allUsers.filter(u => !readUserIds.has(u.id)).map(u => u.id);
    } catch (error) {
      logger.error('Error getting unread user IDs', error, 'BroadcastMessageService');
      return [];
    }
  }

  /**
   * Deactivate a broadcast message (admin/gestor only)
   */
  static async deactivateMessage(messageId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('mensagens_broadcast')
        .update({ ativa: false })
        .eq('id', messageId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all broadcast messages with read statistics (admin/gestor only)
   */
  static async getMessagesWithStats(): Promise<(BroadcastMessage & { stats?: MessageStatistics })[]> {
    try {
      const { data: messages, error: messagesError } = await supabase
        .from('mensagens_broadcast')
        .select(`
          *,
          autor:usuarios!mensagens_broadcast_autor_id_fkey(name)
        `)
        .order('created_at', { ascending: false });

      if (messagesError) {
        logger.error('Error fetching messages', messagesError, 'BroadcastMessageService');
        return [];
      }

      if (!messages || messages.length === 0) {
        return [];
      }

      const messagesWithStats = await Promise.all(
        messages.map(async (message) => {
          const stats = await this.getMessageStatistics(message.id, message.empresa_id);
          return {
            ...message,
            stats,
          };
        })
      );

      return messagesWithStats;
    } catch (error) {
      logger.error('Error in getMessagesWithStats', error, 'BroadcastMessageService');
      return [];
    }
  }

  /**
   * Get read statistics for a specific message
   */
  static async getMessageStatistics(messageId: string, empresaId: string | null): Promise<MessageStatistics> {
    try {
      const { data, error } = await supabase.rpc('obter_estatisticas_entrega', {
        p_mensagem_id: messageId,
      });

      if (error) {
        logger.error('Error getting delivery statistics', error, 'BroadcastMessageService');
        throw error;
      }

      const stats = data?.[0];

      if (!stats) {
        return {
          mensagem_id: messageId,
          total_usuarios: 0,
          usuarios_leram: 0,
          percentual_leitura: 0,
          total_destinatarios: 0,
          nao_lidas: 0,
          push_enviadas: 0,
          tentativas_media: 0,
        };
      }

      const total = Number(stats.total_destinatarios) || 0;
      const read = Number(stats.lidas) || 0;
      const percentage = total > 0 ? (read / total) * 100 : 0;

      return {
        mensagem_id: messageId,
        total_usuarios: total,
        usuarios_leram: read,
        percentual_leitura: Math.round(percentage * 100) / 100,
        total_destinatarios: total,
        nao_lidas: Number(stats.nao_lidas) || 0,
        push_enviadas: Number(stats.push_enviadas) || 0,
        tentativas_media: Number(stats.tentativas_media) || 0,
      };
    } catch (error) {
      logger.error('Error getting message statistics', error, 'BroadcastMessageService');
      return {
        mensagem_id: messageId,
        total_usuarios: 0,
        usuarios_leram: 0,
        percentual_leitura: 0,
        total_destinatarios: 0,
        nao_lidas: 0,
        push_enviadas: 0,
        tentativas_media: 0,
      };
    }
  }

  /**
   * Subscribe to broadcast messages changes via Realtime
   */
  static subscribeToMessages(
    onNewMessage: (message: BroadcastMessage) => void,
    onMessageDeleted?: (messageId: string) => void,
    onMessageUpdated?: (message: BroadcastMessage) => void
  ): RealtimeChannel {
    this.channel = supabase
      .channel('broadcast-messages-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens_broadcast',
        },
        async (payload) => {
          const newMessage = payload.new as BroadcastMessage;

          // Fetch author information
          const { data: authorData } = await supabase
            .from('usuarios')
            .select('name')
            .eq('id', newMessage.autor_id)
            .maybeSingle();

          if (authorData) {
            newMessage.autor = authorData;
          }

          onNewMessage(newMessage);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'mensagens_broadcast',
        },
        (payload) => {
          const deletedMessage = payload.old as { id: string };
          if (onMessageDeleted && deletedMessage.id) {
            logger.info('Message deleted via realtime', { messageId: deletedMessage.id }, 'BroadcastMessageService');
            onMessageDeleted(deletedMessage.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mensagens_broadcast',
        },
        async (payload) => {
          const updatedMessage = payload.new as BroadcastMessage;

          // Fetch author information
          const { data: authorData } = await supabase
            .from('usuarios')
            .select('name')
            .eq('id', updatedMessage.autor_id)
            .maybeSingle();

          if (authorData) {
            updatedMessage.autor = authorData;
          }

          if (onMessageUpdated) {
            logger.info('Message updated via realtime', { messageId: updatedMessage.id }, 'BroadcastMessageService');
            onMessageUpdated(updatedMessage);
          }
        }
      )
      .subscribe();

    return this.channel;
  }

  /**
   * Unsubscribe from broadcast messages
   */
  static unsubscribe(): void {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }

  /**
   * Delete a single broadcast message permanently (admin/gestor only)
   * This will also delete all related read records and push notification logs
   */
  static async deleteMessage(messageId: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Starting message deletion', { messageId }, 'BroadcastMessageService');

      // First, verify the message exists and get its details
      const { data: messageData, error: fetchError } = await supabase
        .from('mensagens_broadcast')
        .select('id, titulo, empresa_id')
        .eq('id', messageId)
        .maybeSingle();

      if (fetchError) {
        logger.error('Error fetching message for deletion', fetchError, 'BroadcastMessageService');
        return { success: false, error: `Erro ao buscar mensagem: ${fetchError.message}` };
      }

      if (!messageData) {
        logger.warn('Message not found for deletion', { messageId }, 'BroadcastMessageService');
        return { success: false, error: 'Mensagem não encontrada ou sem permissão para excluir' };
      }

      // Delete all read records
      const { error: readError, count: readCount } = await supabase
        .from('mensagens_broadcast_lidas')
        .delete({ count: 'exact' })
        .eq('mensagem_id', messageId);

      if (readError) {
        logger.error('Error deleting read records', readError, 'BroadcastMessageService');
        return { success: false, error: `Erro ao excluir registros de leitura: ${readError.message}` };
      }

      logger.info('Deleted read records', { messageId, count: readCount }, 'BroadcastMessageService');

      // Delete push notification logs if they exist
      const { error: pushError, count: pushCount } = await supabase
        .from('push_notifications_log')
        .delete({ count: 'exact' })
        .contains('dados', { messageId: messageId });

      if (pushError) {
        logger.warn('Warning deleting push logs', pushError, 'BroadcastMessageService');
      } else {
        logger.info('Deleted push logs', { messageId, count: pushCount }, 'BroadcastMessageService');
      }

      // Finally delete the message itself
      const { error: messageError } = await supabase
        .from('mensagens_broadcast')
        .delete()
        .eq('id', messageId);

      if (messageError) {
        logger.error('Error deleting message', messageError, 'BroadcastMessageService');
        return { success: false, error: `Erro ao excluir mensagem: ${messageError.message}` };
      }

      // Verify deletion
      const { data: verifyData, error: verifyError } = await supabase
        .from('mensagens_broadcast')
        .select('id')
        .eq('id', messageId)
        .maybeSingle();

      if (verifyError) {
        logger.warn('Error verifying deletion', verifyError, 'BroadcastMessageService');
      } else if (verifyData) {
        logger.error('Message still exists after deletion', { messageId }, 'BroadcastMessageService');
        return { success: false, error: 'Erro: A mensagem não foi excluída. Verifique suas permissões.' };
      }

      logger.info('Message deleted successfully', { messageId, titulo: messageData.titulo }, 'BroadcastMessageService');
      return { success: true };
    } catch (error: any) {
      logger.error('Unexpected error deleting message', error, 'BroadcastMessageService');
      return { success: false, error: error.message || 'Erro inesperado ao excluir mensagem' };
    }
  }

  /**
   * Delete multiple broadcast messages permanently (admin/gestor only)
   * This will also delete all related read records and push notification logs
   */
  static async deleteMultipleMessages(messageIds: string[]): Promise<{
    success: boolean;
    deletedCount: number;
    failedCount: number;
    errors: Array<{ messageId: string; error: string }>;
  }> {
    const results = {
      success: true,
      deletedCount: 0,
      failedCount: 0,
      errors: [] as Array<{ messageId: string; error: string }>,
    };

    for (const messageId of messageIds) {
      const result = await this.deleteMessage(messageId);
      if (result.success) {
        results.deletedCount++;
      } else {
        results.failedCount++;
        results.errors.push({
          messageId,
          error: result.error || 'Unknown error',
        });
      }
    }

    if (results.failedCount > 0) {
      results.success = false;
    }

    return results;
  }
}
