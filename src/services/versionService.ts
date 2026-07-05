import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { fcmPushService } from './fcmPushService';

const VERSION_STORAGE_KEY = 'app_current_version';

export interface AppVersion {
  id: string;
  version: string;
  deployed_at: string;
  created_at: string;
}

export interface UserVersionSeen {
  id: string;
  usuario_id: string;
  versao_vista: string;
  vista_em: string;
  created_at: string;
}

export class VersionService {
  private static channel: RealtimeChannel | null = null;

  static async getCurrentVersion(): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('app_versions')
        .select('version, deployed_at')
        .order('deployed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return null;
      }

      return data?.version || null;
    } catch (error) {
      return null;
    }
  }

  static getStoredVersion(): string | null {
    return localStorage.getItem(VERSION_STORAGE_KEY);
  }

  static setStoredVersion(version: string): void {
    localStorage.setItem(VERSION_STORAGE_KEY, version);
  }

  static async getUserLastSeenVersion(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('usuarios_versoes_vistas')
        .select('versao_vista, vista_em')
        .eq('usuario_id', userId)
        .order('vista_em', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return null;
      }

      return data?.versao_vista || null;
    } catch (error) {
      return null;
    }
  }

  static async checkUserSeenVersion(userId: string, version: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('usuarios_versoes_vistas')
        .select('id')
        .eq('usuario_id', userId)
        .eq('versao_vista', version)
        .maybeSingle();

      if (error) {
        return false;
      }

      return !!data;
    } catch (error) {
      return false;
    }
  }

  static async markVersionAsSeen(userId: string, version: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('usuarios_versoes_vistas')
        .upsert(
          {
            usuario_id: userId,
            versao_vista: version,
            vista_em: new Date().toISOString(),
          },
          {
            onConflict: 'usuario_id,versao_vista',
          }
        );

      if (error) {
        return false;
      }

      this.setStoredVersion(version);
      return true;
    } catch (error) {
      return false;
    }
  }

  static async checkForUpdates(userId?: string): Promise<boolean> {
    const currentVersion = await this.getCurrentVersion();

    if (!currentVersion) {
      return false;
    }

    if (userId) {
      const userSeenVersion = await this.getUserLastSeenVersion(userId);

      if (!userSeenVersion) {
        await this.markVersionAsSeen(userId, currentVersion);
        return false;
      }

      return currentVersion !== userSeenVersion;
    }

    const storedVersion = this.getStoredVersion();

    if (!storedVersion) {
      this.setStoredVersion(currentVersion);
      return false;
    }

    return currentVersion !== storedVersion;
  }

  static subscribeToVersionUpdates(
    onNewVersion: (version: AppVersion) => void
  ): RealtimeChannel {
    this.channel = supabase
      .channel('app-versions-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'app_versions',
        },
        (payload) => {
          onNewVersion(payload.new as AppVersion);
        }
      )
      .subscribe();

    return this.channel;
  }

  static unsubscribe(): void {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }

  static async publishNewVersion(version: string): Promise<{ success: boolean; error?: string; pushResult?: any }> {
    try {
      const { data: newVersion, error } = await supabase
        .from('app_versions')
        .insert({
          version,
          deployed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      let pushResult;
      try {
        pushResult = await fcmPushService.enviarParaTodos(
          'Nova versão disponível!',
          `Versão ${version} - Atualize para continuar usando o sistema`,
          'update',
          {
            priority: 'high',
            data: {
              version,
              tipo: 'update',
              url: '/',
            },
            badge: 1,
          }
        );

        console.log('Update notification sent to all users:', pushResult);
      } catch (pushError) {
        console.error('Error sending update notification:', pushError);
      }

      return { success: true, pushResult };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static clearCache(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });

      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            caches.delete(name);
          });
        });
      }
    }
  }

  static reloadApp(): void {
    this.clearCache();
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }
}
