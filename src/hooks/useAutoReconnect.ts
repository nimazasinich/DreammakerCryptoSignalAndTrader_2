import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { calculateBackoff } from '../lib/exponentialBackoff';
import { useLiveData } from '../components/LiveDataContext';
import { useOnlineStatus } from './useOnlineStatus';

type ReconnectState = 'idle' | 'waiting' | 'reconnecting' | 'connected' | 'failed' | 'offline';

interface AutoReconnectOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
}

export interface AutoReconnectResult {
  status: ReconnectState;
  attempt: number;
  nextRetryInMs: number | null;
  triggerReconnect: () => void;
  reset: () => void;
  pendingDelayMs: number | null;
}

export function useAutoReconnect(options: AutoReconnectOptions = {}): AutoReconnectResult {
  const { connect, isConnected } = useLiveData();
  const { isOnline } = useOnlineStatus();
  const { maxAttempts = 5, baseDelay = 1000, maxDelay = 30_000 } = options;

  const [status, setStatus] = useState<ReconnectState>('idle');
  const [attempt, setAttempt] = useState(0);
  const [nextRetryAt, setNextRetryAt] = useState<number | null>(null);
  const [nextRetryInMs, setNextRetryInMs] = useState<number | null>(null);
  const [pendingDelayMs, setPendingDelayMs] = useState<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const scheduleRetry = useCallback(
    (attemptNumber: number) => {
      setAttempt(attemptNumber);
      const delay = calculateBackoff(attemptNumber - 1, baseDelay, maxDelay);
      const retryTimestamp = Date.now() + delay;
      setNextRetryAt(retryTimestamp);
      setPendingDelayMs(delay);
      setStatus('waiting');

      clearTimer();
      timeoutRef.current = window.setTimeout(async () => {
        setStatus('reconnecting');
        setNextRetryAt(null);
        setPendingDelayMs(null);
        try {
          await connect();
          setStatus('connected');
          setAttempt(0);
        } catch (error) {
          if (attemptNumber >= maxAttempts) {
            setStatus('failed');
          } else {
            setAttempt((prev) => prev + 1);
            scheduleRetry(attemptNumber + 1);
          }
        }
      }, delay);
    },
    [baseDelay, connect, maxAttempts, maxDelay]
  );

  const reset = useCallback(() => {
    clearTimer();
    setAttempt(0);
    setStatus(isOnline ? (isConnected ? 'connected' : 'idle') : 'offline');
    setNextRetryAt(null);
    setNextRetryInMs(null);
    setPendingDelayMs(null);
  }, [isConnected, isOnline]);

  const triggerReconnect = useCallback(async () => {
    clearTimer();
    setNextRetryAt(null);
    setPendingDelayMs(null);
    const nextAttempt = attempt + 1;
    setAttempt(nextAttempt);
    setStatus('reconnecting');

    try {
      await connect();
      setStatus('connected');
      setAttempt(0);
    } catch (error) {
      if (nextAttempt >= maxAttempts) {
        setStatus('failed');
      } else {
        scheduleRetry(nextAttempt + 1);
      }
    }
  }, [attempt, connect, maxAttempts, scheduleRetry]);

  useEffect(() => {
    if (!isOnline) {
      clearTimer();
      setStatus('offline');
      setNextRetryAt(null);
      return;
    }

    if (isConnected) {
      reset();
      return;
    }

    if (status === 'idle' || status === 'failed') {
      setAttempt(1);
      scheduleRetry(1);
    }
  }, [isOnline, isConnected, reset, scheduleRetry, status]);

  useEffect(() => {
    if (!nextRetryAt) {
      setNextRetryInMs(null);
      return;
    }

    const update = () => {
      setNextRetryInMs(Math.max(0, nextRetryAt - Date.now()));
    };

    update();
    const intervalId = window.setInterval(update, 250);
    return () => window.clearInterval(intervalId);
  }, [nextRetryAt]);

  useEffect(() => {
    return () => clearTimer();
  }, []);

  const derivedStatus: ReconnectState = useMemo(() => {
    if (!isOnline) return 'offline';
    if (isConnected) return 'connected';
    return status;
  }, [isConnected, isOnline, status]);

  return {
    status: derivedStatus,
    attempt,
    nextRetryInMs,
    triggerReconnect,
    reset,
    pendingDelayMs,
  };
}

