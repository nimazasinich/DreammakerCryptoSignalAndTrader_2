import { useEffect, useState } from 'react';

export interface OnlineStatus {
  isOnline: boolean;
  lastChangedAt: number | null;
}

export function useOnlineStatus(): OnlineStatus {
  const getInitialStatus = () => {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  };

  const [isOnline, setIsOnline] = useState(getInitialStatus);
  const [lastChangedAt, setLastChangedAt] = useState<number | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastChangedAt(Date.now());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastChangedAt(Date.now());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, lastChangedAt };
}

