import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BroadcastMessageService, BroadcastMessage } from '../services/broadcastMessageService';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface BroadcastMessageContextType {
  unreadMessages: BroadcastMessage[];
  currentMessage: BroadcastMessage | null;
  hasUnreadMessages: boolean;
  markAsRead: (messageId: string) => Promise<void>;
  showNextMessage: () => void;
  refreshMessages: () => Promise<void>;
}

const defaultBroadcastMessageContext: BroadcastMessageContextType = {
  unreadMessages: [],
  currentMessage: null,
  hasUnreadMessages: false,
  markAsRead: async () => {},
  showNextMessage: () => {},
  refreshMessages: async () => {},
};

const BroadcastMessageContext = createContext<BroadcastMessageContextType>(
  defaultBroadcastMessageContext
);

interface BroadcastMessageProviderProps {
  children: ReactNode;
}

export const BroadcastMessageProvider: React.FC<BroadcastMessageProviderProps> = ({ children }) => {
  const [unreadMessages, setUnreadMessages] = useState<BroadcastMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<BroadcastMessage | null>(null);
  const { user } = useAuth();

  const refreshMessages = async () => {
    try {
      const messages = await BroadcastMessageService.getUnreadMessages();
      setUnreadMessages(messages);

      // If there are unread messages and no current message is being shown, show the first one
      if (messages.length > 0 && !currentMessage) {
        setCurrentMessage(messages[0]);
      }
    } catch (error) {
      console.error('Error refreshing broadcast messages:', error);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const result = await BroadcastMessageService.markAsRead(messageId);

      if (result.success) {
        // Remove the message from unread list
        setUnreadMessages((prev) => prev.filter((msg) => msg.id !== messageId));

        // If this was the current message, clear it
        if (currentMessage?.id === messageId) {
          setCurrentMessage(null);
        }
      } else {
        console.error('Error marking message as read:', result.error);
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const showNextMessage = () => {
    if (unreadMessages.length > 0) {
      // Show the next unread message
      const nextMessage = unreadMessages.find((msg) => msg.id !== currentMessage?.id);
      setCurrentMessage(nextMessage || null);
    } else {
      setCurrentMessage(null);
    }
  };

  // Initial load of unread messages
  useEffect(() => {
    if (!user) {
      setUnreadMessages([]);
      setCurrentMessage(null);
      return;
    }

    refreshMessages();
  }, [user]);

  // Subscribe to new messages via Realtime
  useEffect(() => {
    if (!user) {
      return;
    }

    const handleNewMessage = async (message: BroadcastMessage) => {
      // Check if this message is for the current user's company
      try {
        const { data: userData } = await supabase
          .from('usuarios')
          .select('empresa_id')
          .eq('id', user.id)
          .maybeSingle();

        if (message.empresa_id === null || message.empresa_id === userData?.empresa_id) {
          setUnreadMessages((prev) => [message, ...prev]);

          // If no message is currently being shown, show this one
          if (!currentMessage) {
            setCurrentMessage(message);
          }
        }
      } catch (error) {
        console.error('Error checking message permissions:', error);
      }
    };

    const channel = BroadcastMessageService.subscribeToMessages(handleNewMessage);

    return () => {
      BroadcastMessageService.unsubscribe();
    };
  }, [user, currentMessage]);

  // Automatically show next message when current one is closed
  useEffect(() => {
    if (!currentMessage && unreadMessages.length > 0) {
      setCurrentMessage(unreadMessages[0]);
    }
  }, [currentMessage, unreadMessages]);

  return (
    <BroadcastMessageContext.Provider
      value={{
        unreadMessages,
        currentMessage,
        hasUnreadMessages: unreadMessages.length > 0,
        markAsRead,
        showNextMessage,
        refreshMessages,
      }}
    >
      {children}
    </BroadcastMessageContext.Provider>
  );
};

export const useBroadcastMessage = (): BroadcastMessageContextType => {
  const context = useContext(BroadcastMessageContext);
  return context;
};
