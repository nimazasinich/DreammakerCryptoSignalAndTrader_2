/**
 * Detector Metrics Counters
 * Lightweight counters to track detector health and degradation
 * Additive enhancement - no external DB changes required
 */

export interface DetectorCounter {
  ok: number;
  fail: number;
  lastSuccess?: number; // timestamp
  lastFailure?: number; // timestamp
  lastError?: string;
}

export interface DetectorCounters {
  sentiment: DetectorCounter;
  news: DetectorCounter;
  whales: DetectorCounter;
  market: DetectorCounter;
  blockchain: DetectorCounter;
}

/**
 * Global detector counters (in-memory)
 */
export const detectorCounters: DetectorCounters = {
  sentiment: { ok: 0, fail: 0 },
  news: { ok: 0, fail: 0 },
  whales: { ok: 0, fail: 0 },
  market: { ok: 0, fail: 0 },
  blockchain: { ok: 0, fail: 0 },
};

/**
 * Record a successful detector execution
 */
export function recordDetectorSuccess(detector: keyof DetectorCounters): void {
  const counter = detectorCounters[detector];
  counter.ok++;
  counter.lastSuccess = Date.now();
}

/**
 * Record a failed detector execution
 */
export function recordDetectorFailure(
  detector: keyof DetectorCounters,
  error?: string
): void {
  const counter = detectorCounters[detector];
  counter.fail++;
  counter.lastFailure = Date.now();
  if (error) {
    counter.lastError = error;
  }
}

/**
 * Get health score for a detector (0-1, where 1 is healthy)
 */
export function getDetectorHealth(detector: keyof DetectorCounters): number {
  const counter = detectorCounters[detector];
  const total = counter.ok + counter.fail;

  if (total === 0) return 1; // No data yet, assume healthy

  return counter.ok / total;
}

/**
 * Get overall system health (average of all detectors)
 */
export function getOverallHealth(): number {
  const detectors = Object.keys(detectorCounters) as Array<
    keyof DetectorCounters
  >;
  const healthScores = (detectors || []).map(getDetectorHealth);

  return (
    healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length
  );
}

/**
 * Reset all counters (for testing)
 */
export function resetDetectorCounters(): void {
  Object.keys(detectorCounters).forEach((key) => {
    const detector = key as keyof DetectorCounters;
    detectorCounters[detector] = { ok: 0, fail: 0 };
  });
}

/**
 * Get summary for all detectors
 */
export function getDetectorSummary() {
  return {
    counters: detectorCounters,
    health: {
      sentiment: getDetectorHealth('sentiment'),
      news: getDetectorHealth('news'),
      whales: getDetectorHealth('whales'),
      market: getDetectorHealth('market'),
      blockchain: getDetectorHealth('blockchain'),
      overall: getOverallHealth(),
    },
  };
}
