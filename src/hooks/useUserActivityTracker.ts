import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'performaxis_last_activity';
const THROTTLE_DELAY = 5000;

export function useUserActivityTracker() {
  const [lastActivityTime, setLastActivityTime] = useState<number>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const timestamp = parseInt(stored, 10);
      const minutesSinceStored = (Date.now() - timestamp) / 1000 / 60;
      if (minutesSinceStored < 30) {
        return timestamp;
      }
    }
    return Date.now();
  });

  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isThrottlingRef = useRef(false);

  const updateActivity = useCallback(() => {
    if (isThrottlingRef.current) {
      return;
    }

    isThrottlingRef.current = true;
    const now = Date.now();
    setLastActivityTime(now);
    localStorage.setItem(STORAGE_KEY, now.toString());

    throttleTimeoutRef.current = setTimeout(() => {
      isThrottlingRef.current = false;
    }, THROTTLE_DELAY);
  }, []);

  const getMinutesInactive = useCallback((): number => {
    const now = Date.now();
    const diffMs = now - lastActivityTime;
    return Math.floor(diffMs / 1000 / 60);
  }, [lastActivityTime]);

  const resetActivity = useCallback(() => {
    updateActivity();
  }, [updateActivity]);

  useEffect(() => {
    const events = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    const handleActivity = () => {
      updateActivity();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateActivity();
      }
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);

    updateActivity();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, [updateActivity]);

  return {
    lastActivityTime,
    getMinutesInactive,
    resetActivity,
  };
}
