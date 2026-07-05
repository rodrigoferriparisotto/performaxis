import { useState, useEffect, useRef } from 'react';

export interface Achievement {
  percentage: number;
  message: string;
  timestamp: number;
}

interface UseAchievementTrackerProps {
  currentPercentage: number;
  userName?: string;
  registroId?: string;
  enabled?: boolean;
}

export const useAchievementTracker = ({
  currentPercentage,
  userName,
  registroId,
  enabled = true
}: UseAchievementTrackerProps) => {
  const [achievementsShown, setAchievementsShown] = useState<number[]>([]);
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);
  const previousPercentageRef = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const milestones = [25, 50, 75, 100];

  useEffect(() => {
    if (!enabled) return;

    // Limpar debounce anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce para evitar múltiplas notificações
    debounceTimerRef.current = setTimeout(() => {
      const previousPercentage = previousPercentageRef.current;

      // Verificar se houve progresso positivo
      if (currentPercentage > previousPercentage) {
        // Encontrar marcos que foram ultrapassados
        const newMilestones = milestones.filter(milestone => {
          return (
            currentPercentage >= milestone &&
            previousPercentage < milestone &&
            !achievementsShown.includes(milestone)
          );
        });

        // Se há novos marcos, mostrar o primeiro (para evitar múltiplas notificações simultâneas)
        if (newMilestones.length > 0) {
          const milestone = newMilestones[0];

          setCurrentAchievement({
            percentage: milestone,
            message: '', // Será preenchido pelo componente que usa o hook
            timestamp: Date.now()
          });

          // Marcar como mostrado
          setAchievementsShown(prev => [...prev, milestone]);

          // Se há mais marcos para mostrar, agendá-los
          if (newMilestones.length > 1) {
            setTimeout(() => {
              const nextMilestone = newMilestones[1];
              setCurrentAchievement({
                percentage: nextMilestone,
                message: '',
                timestamp: Date.now()
              });
              setAchievementsShown(prev => [...prev, nextMilestone]);
            }, 5000); // Mostrar próximo após 5 segundos
          }
        }
      }

      previousPercentageRef.current = currentPercentage;
    }, 300); // Debounce de 300ms

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [currentPercentage, enabled, achievementsShown]);

  // Resetar conquistas quando registro muda
  useEffect(() => {
    if (registroId) {
      setAchievementsShown([]);
      previousPercentageRef.current = 0;
    }
  }, [registroId]);

  const dismissAchievement = () => {
    setCurrentAchievement(null);
  };

  const resetAchievements = () => {
    setAchievementsShown([]);
    setCurrentAchievement(null);
    previousPercentageRef.current = 0;
  };

  return {
    currentAchievement,
    achievementsShown,
    dismissAchievement,
    resetAchievements
  };
};
