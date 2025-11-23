import { useEffect, useRef } from 'react';

export function useDebouncedEffect(fn: () => void | (() => void), deps: any[], delay: number) {
  const cleanupRef = useRef<void | (() => void)>();
  useEffect(() => {
    const t = setTimeout(() => { cleanupRef.current = fn() || undefined; }, delay);
    return () => { clearTimeout(t); if (cleanupRef.current) cleanupRef.current(); cleanupRef.current = undefined; };
  }, deps);
}
