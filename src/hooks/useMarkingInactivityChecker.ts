import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useActivityMarkingTracker } from './useActivityMarkingTracker';
import { activityMarkingService } from '../services/activityMarkingService';
import { indexedDBService } from '../services/indexedDBService';
import { getDataHoraAtual } from '../utils/dateUtils';
import { logger } from '../services/loggerService';

interface UseMarkingInactivityCheckerOptions {
  userId: string | null;
  empresaId: string | null;
  enabled?: boolean;
  inactivityThresholdMinutes?: number;
}

interface MarkingInactivityState {
  showAlert: boolean;
  minutesSinceLastMarking: number;
  isPostponed: boolean;
  postponedUntil: Date | null;
  activeModule: string | null;
}

const POSTPONE_KEY = 'marking_alert_postponed_until';
const CHECK_INTERVAL_MS = 60 * 1000;
const DEFAULT_THRESHOLD_MINUTES = 20;

export function useMarkingInactivityChecker(options: UseMarkingInactivityCheckerOptions) {
  const {
    userId,
    empresaId,
    enabled = true,
    inactivityThresholdMinutes = DEFAULT_THRESHOLD_MINUTES,
  } = options;

  const [state, setState] = useState<MarkingInactivityState>({
    showAlert: false,
    minutesSinceLastMarking: 0,
    isPostponed: false,
    postponedUntil: null,
    activeModule: null,
  });

  const { obterUltimaMarcacao } = useActivityMarkingTracker();
  const intervalRef = useRef<number | null>(null);
  const lastAlertShownRef = useRef<number>(0);

  const checkPostponement = useCallback((): boolean => {
    const postponedUntil = localStorage.getItem(POSTPONE_KEY);
    if (postponedUntil) {
      const postponedDate = new Date(postponedUntil);
      if (postponedDate > new Date()) {
        setState((prev) => ({
          ...prev,
          isPostponed: true,
          postponedUntil: postponedDate,
        }));
        return true;
      } else {
        localStorage.removeItem(POSTPONE_KEY);
        setState((prev) => ({
          ...prev,
          isPostponed: false,
          postponedUntil: null,
        }));
      }
    }
    return false;
  }, []);

  const getActiveModule = useCallback((): string | null => {
    return activityMarkingService.obterModuloAtual();
  }, []);

  const registerAlert = useCallback(async () => {
    if (!userId || !empresaId) return;

    const activeModule = getActiveModule();

    try {
      const { error } = await supabase
        .from('alertas_inatividade_marcacao')
        .insert({
          usuario_id: userId,
          empresa_id: empresaId,
          mostrado_em: getDataHoraAtual(),
          modulo: activeModule,
        });

      if (error) {
        console.error('Erro ao registrar alerta:', error);
      }
    } catch (error) {
      console.error('Erro ao registrar alerta:', error);
    }
  }, [userId, empresaId, getActiveModule]);

  const checkMarkingInactivity = useCallback(async () => {
    if (!userId || !empresaId || !enabled) {
      return;
    }

    const isVisible = !document.hidden;
    if (!isVisible) {
      return;
    }

    if (checkPostponement()) {
      return;
    }

    try {
      const activeRecords = await indexedDBService.getActiveRecords(userId);

      if (activeRecords.length === 0) {
        activityMarkingService.limparMarcacao();
        lastAlertShownRef.current = 0;

        setState((prev) => ({
          ...prev,
          minutesSinceLastMarking: 0,
          showAlert: false,
        }));
        return;
      }

      const ultimaMarcacao = await obterUltimaMarcacao();

      if (!ultimaMarcacao) {
        setState((prev) => ({
          ...prev,
          minutesSinceLastMarking: 0,
          showAlert: false,
        }));
        return;
      }

      const now = new Date();
      const diffMs = now.getTime() - ultimaMarcacao.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      setState((prev) => ({
        ...prev,
        minutesSinceLastMarking: diffMinutes,
      }));

      if (diffMinutes >= inactivityThresholdMinutes) {
        const nearestMarker = Math.floor(diffMinutes / inactivityThresholdMinutes) * inactivityThresholdMinutes;

        if (lastAlertShownRef.current < nearestMarker) {
          logger.debug('Showing inactivity alert', {
            diffMinutes,
            nearestMarker,
            lastShown: lastAlertShownRef.current,
            activeRecordsCount: activeRecords.length,
          }, 'MarkingInactivityChecker');

          const activeModule = getActiveModule();
          await registerAlert();
          lastAlertShownRef.current = nearestMarker;

          setState((prev) => ({
            ...prev,
            showAlert: true,
            activeModule,
          }));
        }
      } else {
        if (lastAlertShownRef.current >= inactivityThresholdMinutes) {
          lastAlertShownRef.current = 0;
        }

        setState((prev) => ({
          ...prev,
          showAlert: false,
        }));
      }
    } catch (error) {
      logger.error('Error checking marking inactivity', error, 'MarkingInactivityChecker');
    }
  }, [userId, empresaId, enabled, inactivityThresholdMinutes, obterUltimaMarcacao, checkPostponement, registerAlert, getActiveModule]);

  const postponeAlert = useCallback(async (minutes: number = 10) => {
    if (!userId) return;

    const postponedUntil = new Date();
    postponedUntil.setMinutes(postponedUntil.getMinutes() + minutes);

    localStorage.setItem(POSTPONE_KEY, postponedUntil.toISOString());

    try {
      const { data: lastAlert } = await supabase
        .from('alertas_inatividade_marcacao')
        .select('id')
        .eq('usuario_id', userId)
        .is('fechado_em', null)
        .order('mostrado_em', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastAlert) {
        await supabase
          .from('alertas_inatividade_marcacao')
          .update({
            adiado_ate: postponedUntil.toISOString(),
            acao_tomada: 'adiar',
          })
          .eq('id', lastAlert.id);
      }
    } catch (error) {
      logger.error('Error postponing alert', error, 'MarkingInactivityChecker');
    }

    setState((prev) => ({
      ...prev,
      showAlert: false,
      isPostponed: true,
      postponedUntil,
    }));
  }, [userId]);

  const closeAlert = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: lastAlert } = await supabase
        .from('alertas_inatividade_marcacao')
        .select('id')
        .eq('usuario_id', userId)
        .is('fechado_em', null)
        .order('mostrado_em', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastAlert) {
        await supabase
          .from('alertas_inatividade_marcacao')
          .update({
            fechado_em: getDataHoraAtual(),
            acao_tomada: 'revisar_agora',
          })
          .eq('id', lastAlert.id);
      }
    } catch (error) {
      logger.error('Error closing alert', error, 'MarkingInactivityChecker');
    }

    setState((prev) => ({
      ...prev,
      showAlert: false,
    }));
  }, [userId]);

  useEffect(() => {
    if (!userId || !empresaId || !enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    checkMarkingInactivity();

    intervalRef.current = window.setInterval(() => {
      checkMarkingInactivity();
    }, CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [userId, empresaId, enabled, checkMarkingInactivity]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkMarkingInactivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkMarkingInactivity]);

  return {
    ...state,
    postponeAlert,
    closeAlert,
    checkNow: checkMarkingInactivity,
  };
}
