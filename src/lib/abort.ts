export function makeAbortable() {
  const ctrl = new AbortController();
  return { signal: ctrl.signal, cancel: () => ctrl.abort() };
}
