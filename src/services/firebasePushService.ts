import { getToken, onMessage, MessagePayload } from 'firebase/messaging';
import { getFirebaseMessaging, isFirebaseConfigured, validateVapidKey } from './firebaseConfig';
import { supabase } from '../lib/supabase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export interface PushTokenData {
  id: string;
  usuario_id: string;
  token: string;
  device_info: {
    userAgent?: string;
    platform?: string;
    vendor?: string;
  };
  created_at: string;
  updated_at: string;
  last_used_at: string;
  is_active: boolean;
  last_error?: string;
  error_count: number;
  last_success_at?: string;
  api_version?: string;
  fcm_error_code?: string;
}

const getDeviceInfo = () => {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    vendor: navigator.vendor,
  };
};

export const requestPushNotificationPermission = async (usuarioId: string): Promise<string | null> => {
  try {
    if (!isFirebaseConfigured()) {
      console.warn('[FCM] Firebase is not configured. Push notifications are disabled.');
      return null;
    }

    if (!validateVapidKey()) {
      console.error('[FCM] VAPID key is not configured');
      return null;
    }

    const messaging = getFirebaseMessaging();
    if (!messaging) {
      console.error('Firebase Messaging is not available');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return null;
    }

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });

    if (token) {
      console.log('[FCM] Token obtido com sucesso');
      await savePushToken(usuarioId, token);
      console.log('[FCM] Token salvo com sucesso no banco de dados');
      return token;
    }

    console.warn('[FCM] Nenhum token foi obtido do Firebase');
    return null;
  } catch (error) {
    console.error('Error requesting push notification permission:', error);
    return null;
  }
};

export const savePushToken = async (usuarioId: string, token: string): Promise<void> => {
  try {
    const deviceInfo = getDeviceInfo();

    const { data: existingToken, error: fetchError } = await supabase
      .from('push_tokens')
      .select('id')
      .eq('usuario_id', usuarioId)
      .eq('token', token)
      .maybeSingle();

    if (fetchError) {
      console.error('[FCM] Erro ao verificar token existente:', fetchError);
      throw fetchError;
    }

    if (existingToken) {
      console.log('[FCM] Token já existe, atualizando registro:', existingToken.id);
      const { error: updateError } = await supabase
        .from('push_tokens')
        .update({
          last_used_at: new Date().toISOString(),
          is_active: true,
          device_info: deviceInfo,
        })
        .eq('id', existingToken.id);

      if (updateError) {
        console.error('[FCM] Erro ao atualizar token:', updateError);
        throw updateError;
      }
      console.log('[FCM] Token atualizado com sucesso');
    } else {
      console.log('[FCM] Inserindo novo token no banco de dados');
      const { data: newToken, error: insertError } = await supabase
        .from('push_tokens')
        .insert({
          usuario_id: usuarioId,
          token,
          device_info: deviceInfo,
          is_active: true,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[FCM] Erro ao inserir token:', insertError);
        throw insertError;
      }
      console.log('[FCM] Novo token inserido com sucesso:', newToken?.id);
    }
  } catch (error) {
    console.error('[FCM] Error saving push token:', error);
    throw error;
  }
};

export const deactivatePushToken = async (token: string): Promise<void> => {
  try {
    await supabase
      .from('push_tokens')
      .update({ is_active: false })
      .eq('token', token);
  } catch (error) {
    console.error('Error deactivating push token:', error);
  }
};

export const getUserPushTokens = async (usuarioId: string): Promise<PushTokenData[]> => {
  try {
    const { data, error } = await supabase
      .from('push_tokens')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('is_active', true)
      .order('last_used_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user push tokens:', error);
    return [];
  }
};

export const deleteUserPushToken = async (tokenId: string): Promise<void> => {
  try {
    await supabase
      .from('push_tokens')
      .delete()
      .eq('id', tokenId);
  } catch (error) {
    console.error('Error deleting push token:', error);
    throw error;
  }
};

export const setupForegroundMessageListener = (
  callback: (payload: MessagePayload) => void
): (() => void) | null => {
  try {
    if (!isFirebaseConfigured()) {
      return null;
    }

    const messaging = getFirebaseMessaging();
    if (!messaging) {
      return null;
    }

    const unsubscribe = onMessage(messaging, (payload) => {
        callback(payload);
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up foreground message listener:', error);
    return null;
  }
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const retryGetToken = async (usuarioId: string, maxRetries: number = 3): Promise<string | null> => {
  const backoffDelays = [5000, 15000, 30000];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[FCM Retry] Tentativa ${attempt + 1} de ${maxRetries}`);
      const token = await requestPushNotificationPermission(usuarioId);

      if (token) {
        console.log(`[FCM Retry] Token obtido com sucesso na tentativa ${attempt + 1}`);
        return token;
      }

      if (attempt < maxRetries - 1) {
        const delay = backoffDelays[attempt];
        console.log(`[FCM Retry] Aguardando ${delay / 1000}s antes da próxima tentativa...`);
        await sleep(delay);
      }
    } catch (error) {
      console.error(`[FCM Retry] Erro na tentativa ${attempt + 1}:`, error);

      if (attempt < maxRetries - 1) {
        const delay = backoffDelays[attempt];
        console.log(`[FCM Retry] Aguardando ${delay / 1000}s antes da próxima tentativa...`);
        await sleep(delay);
      }
    }
  }

  console.error(`[FCM Retry] Falha após ${maxRetries} tentativas`);
  return null;
};

export const sendTestNotification = async (usuarioId: string, title: string, body: string): Promise<void> => {
  try {
    const tokens = await getUserPushTokens(usuarioId);

    if (tokens.length === 0) {
      throw new Error('No active push tokens found for user');
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push-notification`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokens: tokens.map(t => t.token),
          title,
          body,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send push notification');
    }
  } catch (error) {
    console.error('Error sending test notification:', error);
    throw error;
  }
};
