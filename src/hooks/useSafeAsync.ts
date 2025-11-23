import { useEffect, useRef } from 'react';

export function useSafeAsync() {
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  function run<T>(p: Promise<T>, onResolve: (v: T) => void, onReject?: (e: any) => void) {
    p.then(v => { if (alive.current) onResolve(v); }).catch(e => { if (alive.current && onReject) onReject(e); });
  }
  return { run };
}
