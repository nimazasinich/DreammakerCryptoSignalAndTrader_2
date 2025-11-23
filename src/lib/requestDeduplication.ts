/**
 * Tracks in-flight requests so duplicate calls can share the same promise.
 */

interface InFlightEntry<T> {
  promise: Promise<T>;
  startedAt: number;
  subscribers: number;
}

const inFlightRequests = new Map<string, InFlightEntry<any>>();

function cleanup(key: string) {
  inFlightRequests.delete(key);
}

export function dedupedFetch<T>(key: string | null, fetcher: () => Promise<T>): Promise<T> {
  if (!key) {
    return fetcher();
  }

  const existing = inFlightRequests.get(key);
  if (existing) {
    existing.subscribers += 1;
    return existing.promise;
  }

  const promise = fetcher().finally(() => {
    cleanup(key);
  });

  inFlightRequests.set(key, {
    promise,
    startedAt: Date.now(),
    subscribers: 1,
  });

  return promise;
}

export function cancelDedupedRequest(key: string) {
  if (!key) return;
  cleanup(key);
}

export function getInFlightRequestCount() {
  return inFlightRequests.size;
}

export function getInFlightRequestKeys() {
  return Array.from(inFlightRequests.keys());
}

