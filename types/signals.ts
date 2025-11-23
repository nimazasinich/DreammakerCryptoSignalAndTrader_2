export type Action = 'BUY' | 'SELL' | 'HOLD';

export type Bar = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type CoreSignal = {
  action: Action;
  strength: number;       // 0.1..1
  confidence: number;     // 0.1..0.95
  score: number;          // normalized 0..1 (currently same as confidence)
  reasons: string[];      // ≤5
};

export type LayerScore = {
  score: number;          // 0..1
  reasons: string[];      // ≤3 typically
};

export type PatternScores = {
  elliott: LayerScore;
  harmonic: LayerScore;
  classical: LayerScore;
  combined: LayerScore;   // weighted combination
};

export type AuxScores = {
  fibonacci: LayerScore;
  sar: LayerScore;
  rpercent: LayerScore;
};

export type SentimentScores = {
  sentiment: LayerScore;
  news: LayerScore;
  whales: LayerScore;
  combined: LayerScore;   // internal weighting
};

export type MLScore = LayerScore;

/**
 * Category-level score for HTS Smart Scoring Engine
 * Represents aggregated performance of all detectors within a category
 */
export type CategoryScore = {
  name: 'core' | 'smc' | 'patterns' | 'sentiment' | 'ml';
  rawScore: number;         // 0..1 - averaged score from category detectors
  weightedScore: number;    // rawScore * categoryWeight
  weight: number;           // current category weight (may be adaptive)
  contributingDetectors: string[]; // list of detector names that contributed
  description?: string;
};

/**
 * Effective weights used in scoring (may differ from config if adaptive is enabled)
 */
export type EffectiveWeights = {
  categories: {
    core: number;
    smc: number;
    patterns: number;
    sentiment: number;
    ml: number;
  };
  detectors?: Record<string, number>; // optional per-detector weights
  isAdaptive: boolean;      // true if weights were adjusted by adaptive engine
  lastUpdated?: number;     // timestamp of last weight update
};

/**
 * Lightweight telemetry summary (not full history)
 */
export type TelemetrySummary = {
  totalSignals: number;
  winRate: number;          // 0..1
  avgConfidence: number;    // 0..1
  bestCategory?: string;    // category with highest win rate
  lastUpdate?: number;      // timestamp
};

export type FinalDecision = {
  action: Action;
  score: number;          // 0..1 (final aggregated score)
  confidence: number;     // 0..1 (confidence in the decision)
  finalScore?: number;    // DEPRECATED: use 'score' instead

  // HTS Smart Scoring Extensions
  finalStrategyScore?: number;  // 0..1 - strategy-level score from category aggregation
  categoryScores?: CategoryScore[]; // detailed breakdown by category (Core/SMC/Patterns/Sentiment/ML)
  effectiveWeights?: EffectiveWeights; // current weights used (static or adaptive)
  telemetrySummary?: TelemetrySummary; // lightweight performance summary

  components: {
    core: CoreSignal;
    smc: LayerScore;
    patterns: PatternScores;
    sentiment: SentimentScores;
    ml: MLScore;
    aux: AuxScores;       // auxiliary contributions (non-weighted in final unless mapped)
  };
};
