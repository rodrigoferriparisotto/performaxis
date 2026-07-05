import { useState, useEffect, useCallback } from 'react';
import { MessageDeliveryService, UnreadMessage } from '../services/messageDeliveryService';
import { pushNotificationService } from '../services/pushNotificationService';

interface MessageCheckerState {
  unreadMessages: UnreadMessage[];
  unreadCount: number;
  blockingMessage: UnreadMessage | null;
  isChecking: boolean;
}

export function useMessageChecker(userId: string | null, isAuthenticated: boolean) {
  const [state, setState] = useState<MessageCheckerState>({
    unreadMessages: [],
    unreadCount: 0,
    blockingMessage: null,
    isChecking: false,
  });

  const checkMessages = useCallback(async () => {
    if (!userId || !isAuthenticated) {
      return;
    }

    setState(prev => ({ ...prev, isChecking: true }));

    try {
      const messages = await MessageDeliveryService.getUnreadMessages(userId);

      const blockingMessage = messages.find(msg => msg.bloqueia_sistema) || null;

      setState({
        unreadMessages: messages,
        unreadCount: messages.length,
        blockingMessage,
        isChecking: false,
      });

      for (const message of messages) {
        await MessageDeliveryService.registerDeliveryAttempt(
          userId,
          message.mensagem_id,
          'verificacao'
        );
      }

      if (messages.length > 0) {
        if (pushNotificationService.hasPermission()) {
          await pushNotificationService.notifyMultipleMessages(messages, userId);
        }
      }

      await MessageDeliveryService.updateLastCheck(userId);
    } catch (error) {
      console.error('Erro ao verificar mensagens:', error);
      setState(prev => ({ ...prev, isChecking: false }));
    }
  }, [userId, isAuthenticated]);

  const markAsRead = useCallback(async (messageId: string) => {
    if (!userId) return;

    const success = await MessageDeliveryService.markMessageAsRead(userId, messageId);

    if (success) {
      setState(prev => ({
        ...prev,
        unreadMessages: prev.unreadMessages.filter(msg => msg.mensagem_id !== messageId),
        unreadCount: Math.max(0, prev.unreadCount - 1),
        blockingMessage: prev.blockingMessage?.mensagem_id === messageId ? null : prev.blockingMessage,
      }));

      pushNotificationService.clearNotification(messageId);
    }

    return success;
  }, [userId]);

  const refreshMessages = useCallback(() => {
    checkMessages();
  }, [checkMessages]);

  useEffect(() => {
    if (userId && isAuthenticated) {
      checkMessages();

      const interval = setInterval(() => {
        checkMessages();
      }, 5 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [userId, isAuthenticated, checkMessages]);

  return {
    unreadMessages: state.unreadMessages,
    unreadCount: state.unreadCount,
    blockingMessage: state.blockingMessage,
    isChecking: state.isChecking,
    markAsRead,
    refreshMessages,
  };
}
