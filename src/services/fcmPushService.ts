import { supabase } from '../lib/supabase';
import { logger } from './loggerService';

interface PushToken {
  id: string;
  usuario_id: string;
  token: string;
  device_info: any;
  is_active: boolean;
  last_used_at: string;
  created_at: string;
  updated_at: string;
  last_error?: string;
  error_count: number;
  last_success_at?: string;
  api_version?: string;
  fcm_error_code?: string;
  usuario?: {
    name: string;
    login: string;
    empresa?: {
      nome: string;
    };
  };
}

interface PushPayload {
  tokens: string[];
  title: string;
  body: string;
  tipo: 'info' | 'aviso' | 'urgente' | 'update' | 'broadcast' | 'reminder' | 'inactivity';
  priority?: 'high' | 'normal';
  ttl?: number;
  badge?: number;
  icon?: string;
  image?: string;
  sound?: string;
  data?: {
    url?: string;
    tipo?: string;
    [key: string]: any;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

interface PushResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  logId?: string;
  errors?: string[];
  performance?: {
    totalTimeMs: number;
    avgTimePerNotificationMs: number;
  };
}

class FCMPushService {
  private async getActiveTokensForUser(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('usuario_id', userId)
        .eq('is_active', true);

      if (error) throw error;

      return data?.map((t) => t.token) || [];
    } catch (error) {
      logger.error('Error fetching user tokens', error, 'FCMPushService');
      return [];
    }
  }

  private async getActiveTokensForCompany(empresaId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('push_tokens')
        .select('token, usuarios!inner(empresa_id)')
        .eq('usuarios.empresa_id', empresaId)
        .eq('is_active', true);

      if (error) throw error;

      return data?.map((t) => t.token) || [];
    } catch (error) {
      logger.error('Error fetching company tokens', error, 'FCMPushService');
      return [];
    }
  }

  private async getAllActiveTokens(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('is_active', true);

      if (error) throw error;

      return data?.map((t) => t.token) || [];
    } catch (error) {
      logger.error('Error fetching all tokens', error, 'FCMPushService');
      return [];
    }
  }

  private async callPushEdgeFunction(payload: PushPayload): Promise<PushResult> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/send-push-notification`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Push notification failed: ${errorText}`);
      }

      const result = await response.json();

      return {
        success: true,
        successCount: result.successCount || 0,
        failureCount: result.failureCount || 0,
        errors: result.errors,
      };
    } catch (error) {
      logger.error('Error calling push edge function', error, 'FCMPushService');
      return {
        success: false,
        successCount: 0,
        failureCount: payload.tokens.length,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  private async logPushNotification(
    tipo: string,
    titulo: string,
    corpo: string,
    usuarioId: string | null,
    empresaId: string | null,
    tokens: string[],
    sucessoCount: number,
    falhaCount: number,
    tentativas: number,
    dados: any
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('push_notifications_log')
        .insert({
          tipo,
          titulo,
          corpo,
          usuario_id: usuarioId,
          empresa_id: empresaId,
          tokens_alvo: tokens,
          sucesso_count: sucessoCount,
          falha_count: falhaCount,
          tentativas,
          dados: dados || {},
        })
        .select('id')
        .single();

      if (error) throw error;

      return data?.id || null;
    } catch (error) {
      logger.error('Error logging push notification', error, 'FCMPushService');
      return null;
    }
  }

  async enviarParaUsuario(
    usuarioId: string,
    titulo: string,
    corpo: string,
    tipo: PushPayload['tipo'],
    options?: {
      priority?: 'high' | 'normal';
      data?: any;
      icon?: string;
      badge?: number;
    }
  ): Promise<PushResult> {
    if (!titulo || !corpo) {
      logger.error('Title and body are required for push notifications', { titulo, corpo }, 'FCMPushService');
      return {
        success: false,
        successCount: 0,
        failureCount: 0,
        errors: ['Title and body are required'],
      };
    }

    const tokens = await this.getActiveTokensForUser(usuarioId);

    if (tokens.length === 0) {
      logger.warn(`No active tokens found for user ${usuarioId}`, undefined, 'FCMPushService');
      return {
        success: false,
        successCount: 0,
        failureCount: 0,
      };
    }

    const defaultPriority = (tipo === 'urgente' || tipo === 'inactivity' || tipo === 'reminder') ? 'high' : 'normal';

    const payload: PushPayload = {
      tokens,
      title: titulo,
      body: corpo,
      tipo,
      priority: options?.priority || defaultPriority,
      icon: options?.icon,
      badge: options?.badge,
      data: options?.data,
    };

    const result = await this.callPushEdgeFunction(payload);

    const { data: userData } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', usuarioId)
      .maybeSingle();

    const logId = await this.logPushNotification(
      tipo,
      titulo,
      corpo,
      usuarioId,
      userData?.empresa_id || null,
      tokens,
      result.successCount,
      result.failureCount,
      1,
      options?.data
    );

    return {
      ...result,
      logId: logId || undefined,
    };
  }

  async enviarParaGrupo(
    usuariosIds: string[],
    titulo: string,
    corpo: string,
    tipo: PushPayload['tipo'],
    options?: {
      priority?: 'high' | 'normal';
      data?: any;
      icon?: string;
      badge?: number;
    }
  ): Promise<PushResult> {
    const allTokens: string[] = [];

    for (const userId of usuariosIds) {
      const tokens = await this.getActiveTokensForUser(userId);
      allTokens.push(...tokens);
    }

    if (allTokens.length === 0) {
      logger.warn('No active tokens found for user group', undefined, 'FCMPushService');
      return {
        success: false,
        successCount: 0,
        failureCount: 0,
      };
    }

    const uniqueTokens = [...new Set(allTokens)];

    const payload: PushPayload = {
      tokens: uniqueTokens,
      title: titulo,
      body: corpo,
      tipo,
      priority: options?.priority || 'high',
      icon: options?.icon,
      badge: options?.badge,
      data: options?.data,
    };

    const result = await this.callPushEdgeFunction(payload);

    const logId = await this.logPushNotification(
      tipo,
      titulo,
      corpo,
      null,
      null,
      uniqueTokens,
      result.successCount,
      result.failureCount,
      1,
      options?.data
    );

    return {
      ...result,
      logId: logId || undefined,
    };
  }

  async enviarParaEmpresa(
    empresaId: string,
    titulo: string,
    corpo: string,
    tipo: PushPayload['tipo'],
    options?: {
      priority?: 'high' | 'normal';
      data?: any;
      icon?: string;
      badge?: number;
    }
  ): Promise<PushResult> {
    const tokens = await this.getActiveTokensForCompany(empresaId);

    if (tokens.length === 0) {
      logger.warn(`No active tokens found for company ${empresaId}`, undefined, 'FCMPushService');
      return {
        success: false,
        successCount: 0,
        failureCount: 0,
      };
    }

    const payload: PushPayload = {
      tokens,
      title: titulo,
      body: corpo,
      tipo,
      priority: options?.priority || 'high',
      icon: options?.icon,
      badge: options?.badge,
      data: options?.data,
    };

    const result = await this.callPushEdgeFunction(payload);

    const logId = await this.logPushNotification(
      tipo,
      titulo,
      corpo,
      null,
      empresaId,
      tokens,
      result.successCount,
      result.failureCount,
      1,
      options?.data
    );

    return {
      ...result,
      logId: logId || undefined,
    };
  }

  async enviarParaTodos(
    titulo: string,
    corpo: string,
    tipo: PushPayload['tipo'],
    options?: {
      priority?: 'high' | 'normal';
      data?: any;
      icon?: string;
      badge?: number;
    }
  ): Promise<PushResult> {
    const tokens = await this.getAllActiveTokens();

    if (tokens.length === 0) {
      logger.warn('No active tokens found in the system', undefined, 'FCMPushService');
      return {
        success: false,
        successCount: 0,
        failureCount: 0,
      };
    }

    const batchSize = 100;
    let totalSuccess = 0;
    let totalFailure = 0;
    const allErrors: string[] = [];

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);

      const payload: PushPayload = {
        tokens: batch,
        title: titulo,
        body: corpo,
        tipo,
        priority: options?.priority || 'high',
        icon: options?.icon,
        badge: options?.badge,
        data: options?.data,
      };

      const result = await this.callPushEdgeFunction(payload);
      totalSuccess += result.successCount;
      totalFailure += result.failureCount;

      if (result.errors) {
        allErrors.push(...result.errors);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const logId = await this.logPushNotification(
      tipo,
      titulo,
      corpo,
      null,
      null,
      tokens,
      totalSuccess,
      totalFailure,
      1,
      options?.data
    );

    return {
      success: totalFailure === 0,
      successCount: totalSuccess,
      failureCount: totalFailure,
      logId: logId || undefined,
      errors: allErrors.length > 0 ? allErrors : undefined,
    };
  }

  async obterTokensUsuario(usuarioId: string): Promise<PushToken[]> {
    try {
      const { data, error } = await supabase
        .from('push_tokens')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('Error fetching user tokens', error, 'FCMPushService');
      return [];
    }
  }

  async testarNotificacao(
    usuarioId: string,
    tokenEspecifico?: string
  ): Promise<PushResult> {
    const tokens = tokenEspecifico
      ? [tokenEspecifico]
      : await this.getActiveTokensForUser(usuarioId);

    if (tokens.length === 0) {
      return {
        success: false,
        successCount: 0,
        failureCount: 0,
      };
    }

    const payload: PushPayload = {
      tokens,
      title: 'Teste de Notificação Push',
      body: 'Se você recebeu esta mensagem, as notificações push estão funcionando corretamente!',
      tipo: 'info',
      priority: 'high',
      data: {
        tipo: 'test',
        timestamp: new Date().toISOString(),
      },
    };

    const result = await this.callPushEdgeFunction(payload);

    const { data: userData } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', usuarioId)
      .maybeSingle();

    await this.logPushNotification(
      'test',
      payload.title,
      payload.body,
      usuarioId,
      userData?.empresa_id || null,
      tokens,
      result.successCount,
      result.failureCount,
      1,
      payload.data
    );

    return result;
  }

  async desativarToken(tokenId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('push_tokens')
        .update({ is_active: false })
        .eq('id', tokenId);

      if (error) throw error;

      return true;
    } catch (error) {
      logger.error('Error deactivating token', error, 'FCMPushService');
      return false;
    }
  }

  async reativarToken(tokenId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('push_tokens')
        .update({ is_active: true })
        .eq('id', tokenId);

      if (error) throw error;

      return true;
    } catch (error) {
      logger.error('Error reactivating token', error, 'FCMPushService');
      return false;
    }
  }

  async obterEstatisticas(empresaId?: string) {
    try {
      let query = supabase
        .from('push_tokens')
        .select('*, usuarios!inner(empresa_id)', { count: 'exact' });

      if (empresaId) {
        query = query.eq('usuarios.empresa_id', empresaId);
      }

      const { count: totalTokens } = await query;

      let activeQuery = supabase
        .from('push_tokens')
        .select('*, usuarios!inner(empresa_id)', { count: 'exact' })
        .eq('is_active', true);

      if (empresaId) {
        activeQuery = activeQuery.eq('usuarios.empresa_id', empresaId);
      }

      const { count: activeTokens } = await activeQuery;

      const logQuery = supabase
        .from('push_notifications_log')
        .select('*', { count: 'exact' });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count: todayNotifications } = await logQuery.gte(
        'enviado_em',
        today.toISOString()
      );

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { count: weekNotifications } = await logQuery.gte(
        'enviado_em',
        weekAgo.toISOString()
      );

      const { data: successRateData } = await supabase
        .from('push_notifications_log')
        .select('sucesso_count, falha_count')
        .gte('enviado_em', weekAgo.toISOString());

      let totalSuccess = 0;
      let totalFailure = 0;

      if (successRateData) {
        for (const record of successRateData) {
          totalSuccess += record.sucesso_count || 0;
          totalFailure += record.falha_count || 0;
        }
      }

      const successRate =
        totalSuccess + totalFailure > 0
          ? (totalSuccess / (totalSuccess + totalFailure)) * 100
          : 0;

      return {
        totalTokens: totalTokens || 0,
        activeTokens: activeTokens || 0,
        inactiveTokens: (totalTokens || 0) - (activeTokens || 0),
        todayNotifications: todayNotifications || 0,
        weekNotifications: weekNotifications || 0,
        successRate: Math.round(successRate * 10) / 10,
        totalSuccess,
        totalFailure,
      };
    } catch (error) {
      logger.error('Error fetching push statistics', error, 'FCMPushService');
      return {
        totalTokens: 0,
        activeTokens: 0,
        inactiveTokens: 0,
        todayNotifications: 0,
        weekNotifications: 0,
        successRate: 0,
        totalSuccess: 0,
        totalFailure: 0,
      };
    }
  }
}

export const fcmPushService = new FCMPushService();
export type { PushPayload, PushResult, PushToken };
