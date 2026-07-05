import { supabase } from '../lib/supabase';
import { notificationService } from './notificationService';
import type { NotificationLevel } from './notificationService';
import { fcmPushService } from './fcmPushService';

interface PendingRecord {
  registro_id: string;
  tipo_registro: string;
  horas_decorridas: number;
  info_adicional: {
    suite?: string;
    servico?: string;
    tipo?: string;
    status: string;
  };
}

interface ReminderSettings {
  ativo: boolean;
  horario_inicio_nao_perturbe?: string;
  horario_fim_nao_perturbe?: string;
  permitir_som: boolean;
  permitir_vibracao: boolean;
  ativar_lembretes_inatividade?: boolean;
  intensidade_vibracao?: 'fraca' | 'media' | 'forte';
  volume_som?: number;
  tipo_som_preferido?: 'info' | 'warning' | 'urgent' | 'critical';
}

interface TimeMarker {
  hours: number;
  code: '6h' | '8h' | '10h' | '11h';
  level: NotificationLevel;
}

const TIME_MARKERS: TimeMarker[] = [
  { hours: 6, code: '6h', level: 'info' },
  { hours: 8, code: '8h', level: 'warning' },
  { hours: 10, code: '10h', level: 'urgent' },
  { hours: 11, code: '11h', level: 'critical' },
];

interface InactivityMarker {
  minutes: number;
  code: string;
  level: NotificationLevel;
}

const INACTIVITY_MARKERS: InactivityMarker[] = [
  { minutes: 20, code: '20m', level: 'info' },
  { minutes: 40, code: '40m', level: 'warning' },
  { minutes: 80, code: '80m', level: 'urgent' },
  { minutes: 120, code: '120m', level: 'critical' },
];

class ReminderService {
  private async getUserSettings(userId: string): Promise<ReminderSettings | null> {
    try {
      const { data: reminderData, error: reminderError } = await supabase
        .from('configuracoes_lembretes_usuario')
        .select('*')
        .eq('usuario_id', userId)
        .maybeSingle();

      if (reminderError) throw reminderError;

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('intensidade_vibracao, volume_som, tipo_som_preferido')
        .eq('id', userId)
        .maybeSingle();

      if (userError) throw userError;

      if (!reminderData) {
        return {
          ativo: true,
          permitir_som: true,
          permitir_vibracao: true,
          ativar_lembretes_inatividade: true,
          intensidade_vibracao: userData?.intensidade_vibracao || 'media',
          volume_som: userData?.volume_som ?? 100,
          tipo_som_preferido: userData?.tipo_som_preferido || 'warning',
        };
      }

      return {
        ...reminderData,
        intensidade_vibracao: userData?.intensidade_vibracao || 'media',
        volume_som: userData?.volume_som ?? 100,
        tipo_som_preferido: userData?.tipo_som_preferido || 'warning',
      };
    } catch (error) {
      console.error('Error fetching user reminder settings:', error);
      return null;
    }
  }

  private isDoNotDisturbActive(settings: ReminderSettings): boolean {
    if (!settings.horario_inicio_nao_perturbe || !settings.horario_fim_nao_perturbe) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = settings.horario_inicio_nao_perturbe.split(':').map(Number);
    const [endHour, endMin] = settings.horario_fim_nao_perturbe.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private async getPendingRecords(userId: string, horasMinimas: number = 0): Promise<PendingRecord[]> {
    try {
      const { data, error } = await supabase.rpc('obter_registros_pendentes_por_tempo', {
        p_usuario_id: userId,
        p_horas_minimas: horasMinimas,
      });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching pending records:', error);
      return [];
    }
  }

  private async checkReminderSent(
    registroId: string,
    tipoRegistro: string,
    marcoTempo: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('lembretes_enviados')
        .select('id')
        .eq('registro_id', registroId)
        .eq('tipo_registro', tipoRegistro)
        .eq('marco_tempo', marcoTempo)
        .maybeSingle();

      if (error) throw error;

      return !!data;
    } catch (error) {
      console.error('Error checking if reminder was sent:', error);
      return false;
    }
  }

  private async saveReminderSent(
    registroId: string,
    tipoRegistro: string,
    marcoTempo: string,
    userId: string,
    empresaId: string
  ): Promise<void> {
    try {
      const { error } = await supabase.from('lembretes_enviados').insert({
        registro_id: registroId,
        tipo_registro: tipoRegistro,
        marco_tempo: marcoTempo,
        usuario_id: userId,
        empresa_id: empresaId,
        enviado_em: new Date().toISOString(),
        respondido: false,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving reminder:', error);
    }
  }

  private getModuleName(tipoRegistro: string): string {
    const moduleNames: Record<string, string> = {
      camararia: 'Camararia',
      recepcao: 'Recepção',
      areas_comuns: 'Áreas Comuns',
      gestao: 'Gestão',
      atividades_diarias: 'Atividades Diárias',
      atividades_extras: 'Atividades Extras',
      cozinha: 'Cozinha',
      vendas: 'Vendas',
      revisao: 'Revisão',
      manutencao: 'Manutenção',
      noturnas: 'Noturnas',
    };
    return moduleNames[tipoRegistro] || tipoRegistro;
  }

  private getRecordDescription(record: PendingRecord): string {
    const info = record.info_adicional;

    if (info.suite) {
      return info.servico
        ? `${info.suite} - ${info.servico}`
        : info.suite;
    }

    if (info.tipo) {
      return info.tipo;
    }

    return 'Registro';
  }

  private getModuleUrl(tipoRegistro: string): string {
    const moduleUrls: Record<string, string> = {
      camararia: 'camararia',
      recepcao: 'recepcao',
      areas_comuns: 'areas-comuns',
      gestao: 'gestao',
      atividades_diarias: 'atividades-diarias',
      atividades_extras: 'atividades-extras',
      cozinha: 'cozinha',
      vendas: 'vendas',
      revisao: 'revisao',
      manutencao: 'manutencao',
      noturnas: 'noturnas',
    };
    return moduleUrls[tipoRegistro] || 'dashboard';
  }

  async checkAndSendReminders(userId: string, empresaId: string): Promise<number> {
    if (!notificationService.hasPermission()) {
      return 0;
    }

    const settings = await this.getUserSettings(userId);

    if (!settings || !settings.ativo) {
      return 0;
    }

    if (this.isDoNotDisturbActive(settings)) {
      return 0;
    }

    const pendingRecords = await this.getPendingRecords(userId, 6);

    if (pendingRecords.length === 0) {
      return 0;
    }

    let remindersSent = 0;

    for (const record of pendingRecords) {
      for (const marker of TIME_MARKERS) {
        if (record.horas_decorridas >= marker.hours) {
          const alreadySent = await this.checkReminderSent(
            record.registro_id,
            record.tipo_registro,
            marker.code
          );

          if (!alreadySent) {
            const moduleName = this.getModuleName(record.tipo_registro);
            const recordDesc = this.getRecordDescription(record);
            const hoursText = Math.floor(record.horas_decorridas);

            let title = '';
            let body = '';

            switch (marker.level) {
              case 'info':
                title = `${moduleName} - ${hoursText}h decorridas`;
                body = `${recordDesc} - Você já concluiu esta atividade?`;
                break;
              case 'warning':
                title = `${moduleName} - ${hoursText}h decorridas`;
                body = `${recordDesc} - Por favor, finalize esta atividade`;
                break;
              case 'urgent':
                title = `ATENÇÃO: ${moduleName} - ${hoursText}h!`;
                body = `${recordDesc} - Finalize urgentemente esta atividade`;
                break;
              case 'critical':
                title = `URGENTE: ${moduleName} - ${hoursText}h!`;
                body = `${recordDesc} - Finalize IMEDIATAMENTE esta atividade!`;
                break;
            }

            await notificationService.showNotification({
              title,
              body,
              level: marker.level,
              tag: `reminder-${record.registro_id}-${marker.code}`,
              data: {
                url: `#${this.getModuleUrl(record.tipo_registro)}`,
                recordId: record.registro_id,
                tipoRegistro: record.tipo_registro,
              },
              vibrate: settings.permitir_vibracao,
              sound: settings.permitir_som,
              intensidadeVibracao: settings.intensidade_vibracao || 'media',
            });

            try {
              await fcmPushService.enviarParaUsuario(
                userId,
                title,
                body,
                'reminder',
                {
                  priority: marker.level === 'critical' || marker.level === 'urgent' ? 'high' : 'normal',
                  data: {
                    url: `#${this.getModuleUrl(record.tipo_registro)}`,
                    recordId: record.registro_id,
                    tipoRegistro: record.tipo_registro,
                    marker: marker.code,
                  },
                  badge: 1,
                }
              );
            } catch (pushError) {
              console.error('Error sending push notification for reminder:', pushError);
            }

            await this.saveReminderSent(
              record.registro_id,
              record.tipo_registro,
              marker.code,
              userId,
              empresaId
            );

            remindersSent++;
          }
        }
      }
    }

    return remindersSent;
  }

  async createDefaultSettings(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('configuracoes_lembretes_usuario')
        .upsert({
          usuario_id: userId,
          ativo: true,
          permitir_som: true,
          permitir_vibracao: true,
          ativar_lembretes_inatividade: true,
        }, {
          onConflict: 'usuario_id',
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error creating default reminder settings:', error);
    }
  }

  async updateSettings(userId: string, settings: Partial<ReminderSettings>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('configuracoes_lembretes_usuario')
        .upsert(
          {
            usuario_id: userId,
            ...settings,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'usuario_id',
          }
        );

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error updating reminder settings:', error);
      return false;
    }
  }

  async markReminderResponded(registroId: string, tipoRegistro: string): Promise<void> {
    try {
      await supabase
        .from('lembretes_enviados')
        .update({ respondido: true })
        .eq('registro_id', registroId)
        .eq('tipo_registro', tipoRegistro);
    } catch (error) {
      console.error('Error marking reminder as responded:', error);
    }
  }

  async getPendingRecordsCount(userId: string): Promise<number> {
    const records = await this.getPendingRecords(userId);
    return records.length;
  }

  async getPendingRecordsWithDetails(userId: string) {
    const records = await this.getPendingRecords(userId);

    return records.map((record) => ({
      id: record.registro_id,
      tipo: this.getModuleName(record.tipo_registro),
      tipoRegistro: record.tipo_registro,
      descricao: this.getRecordDescription(record),
      horasDecorridas: Math.floor(record.horas_decorridas),
      minutosDecorridos: Math.floor((record.horas_decorridas % 1) * 60),
      nivel: this.getUrgencyLevel(record.horas_decorridas),
      modulePage: this.getModuleUrl(record.tipo_registro),
    }));
  }

  private getUrgencyLevel(hours: number): 'low' | 'medium' | 'high' | 'critical' {
    if (hours >= 11) return 'critical';
    if (hours >= 10) return 'high';
    if (hours >= 8) return 'medium';
    return 'low';
  }

  private async checkInactivityReminderSent(
    userId: string,
    minutesInactive: number
  ): Promise<boolean> {
    try {
      const deduplicationWindowMs = 5 * 60 * 1000;
      const recentTime = new Date(Date.now() - deduplicationWindowMs);

      const { data, error } = await supabase
        .from('lembretes_inatividade_enviados')
        .select('id, minutos_inatividade')
        .eq('usuario_id', userId)
        .gte('enviado_em', recentTime.toISOString())
        .order('enviado_em', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) return false;

      const minuteDiff = Math.abs(data.minutos_inatividade - minutesInactive);
      return minuteDiff < 15;
    } catch (error) {
      console.error('Error checking if inactivity reminder was sent:', error);
      return false;
    }
  }

  private async saveInactivityReminderSent(
    userId: string,
    empresaId: string,
    minutesInactive: number
  ): Promise<void> {
    try {
      const { error } = await supabase.from('lembretes_inatividade_enviados').insert({
        usuario_id: userId,
        empresa_id: empresaId,
        minutos_inatividade: minutesInactive,
        enviado_em: new Date().toISOString(),
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving inactivity reminder:', error);
    }
  }

  private async cleanupOldInactivityReminders(userId: string): Promise<void> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      await supabase
        .from('lembretes_inatividade_enviados')
        .delete()
        .eq('usuario_id', userId)
        .lt('created_at', oneDayAgo.toISOString());
    } catch (error) {
      console.error('Error cleaning up old inactivity reminders:', error);
    }
  }

  private getInactivityMarkerForMinutes(minutes: number): InactivityMarker | null {
    if (minutes < 20) return null;

    for (let i = INACTIVITY_MARKERS.length - 1; i >= 0; i--) {
      const marker = INACTIVITY_MARKERS[i];
      if (minutes >= marker.minutes) {
        return marker;
      }
    }

    if (minutes >= 120) {
      return {
        minutes,
        code: `${minutes}m`,
        level: 'critical',
      };
    }

    return null;
  }

  private getInactivityNotificationText(minutes: number): { title: string; body: string } {
    if (minutes < 60) {
      return {
        title: 'Você está inativo',
        body: `Você está há ${minutes} minutos sem registrar atividades`,
      };
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    let timeText = '';
    if (remainingMinutes === 0) {
      timeText = hours === 1 ? '1 hora' : `${hours} horas`;
    } else {
      timeText = `${hours}h${remainingMinutes}`;
    }

    if (minutes >= 120) {
      return {
        title: 'CRÍTICO: Inatividade prolongada!',
        body: `Você está há ${timeText} sem registrar atividades - Verifique atividades pendentes`,
      };
    }

    if (minutes >= 80) {
      return {
        title: 'URGENTE: Você está inativo!',
        body: `Você está há ${timeText} sem registrar atividades`,
      };
    }

    return {
      title: 'ATENÇÃO: Você está inativo',
      body: `Você está há ${timeText} sem registrar atividades`,
    };
  }

  async checkInactivityReminder(
    userId: string,
    empresaId: string,
    minutesInactive: number
  ): Promise<boolean> {
    if (!notificationService.hasPermission()) {
      return false;
    }

    const settings = await this.getUserSettings(userId);

    if (!settings || !settings.ativo || !settings.ativar_lembretes_inatividade) {
      return false;
    }

    if (this.isDoNotDisturbActive(settings)) {
      return false;
    }

    const pendingRecords = await this.getPendingRecords(userId, 0);

    if (pendingRecords.length === 0) {
      return false;
    }

    const marker = this.getInactivityMarkerForMinutes(minutesInactive);

    if (!marker) {
      return false;
    }

    const alreadySent = await this.checkInactivityReminderSent(userId, minutesInactive);

    if (alreadySent) {
      return false;
    }

    const { title, body } = this.getInactivityNotificationText(minutesInactive);

    await notificationService.showNotification({
      title,
      body,
      level: marker.level,
      tag: 'inactivity-reminder',
      data: {
        url: '/',
        type: 'inactivity',
        minutesInactive,
      },
      vibrate: settings.permitir_vibracao,
      sound: settings.permitir_som,
      intensidadeVibracao: settings.intensidade_vibracao || 'media',
    });

    try {
      await fcmPushService.enviarParaUsuario(
        userId,
        title,
        body,
        'inactivity',
        {
          priority: marker.level === 'critical' || marker.level === 'urgent' ? 'high' : 'normal',
          data: {
            url: '/',
            type: 'inactivity',
            minutesInactive: minutesInactive.toString(),
            marker: marker.code,
          },
          badge: 1,
        }
      );
    } catch (pushError) {
    }

    await this.saveInactivityReminderSent(userId, empresaId, minutesInactive);

    await this.cleanupOldInactivityReminders(userId);

    return true;
  }

  async clearInactivityReminders(userId: string): Promise<void> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      await supabase
        .from('lembretes_inatividade_enviados')
        .delete()
        .eq('usuario_id', userId)
        .gte('enviado_em', oneHourAgo.toISOString());
    } catch (error) {
      console.error('Error clearing inactivity reminders:', error);
    }
  }
}

export const reminderService = new ReminderService();
export type { PendingRecord, ReminderSettings };
