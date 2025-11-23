/**
 * QUANTUM SCORING SYSTEM - CONSTITUTIONAL TYPES
 * The Bill of Rights: All detector outputs must conform to these types
 */

/**
 * Quantum Score: Universal scoring currency (-1 to +1)
 * - +1.0: Absolute bullish conviction
 * - -1.0: Absolute bearish conviction
 * - 0.0: Complete market ambiguity
 */
export type QuantumScore = number; // -1.0 to +1.0

/**
 * Detector Name: Identifier for detector types
 */
export type DetectorName =
  | 'harmonic'
  | 'elliott'
  | 'fibonacci'
  | 'price_action'
  | 'smc'
  | 'sar'
  | 'sentiment'
  | 'news'
  | 'whales'
  | 'ml_ai'
  | 'rsi'
  | 'macd'
  | 'ma_cross'
  | 'bollinger'
  | 'volume'
  | 'support_resistance'
  | 'adx'
  | 'roc'
  | 'market_structure'
  | 'reversal';

/**
 * Constitutional Detector Output
 * All detectors MUST return this format
 */
export interface ConstitutionalDetectorOutput {
  /** Quantum Score: -1.0 to +1.0 */
  score: QuantumScore;
  /** Metadata: Detector-specific information */
  meta: Record<string, any>;
  /** Detector name */
  detector: DetectorName;
  /** Timestamp of analysis */
  timestamp: number;
  /** Confidence level (0-1) */
  confidence: number;
}

/**
 * Detector Component Result
 * Individual detector contribution to timeframe analysis
 */
export interface DetectorComponent {
  name: DetectorName;
  raw: any; // Original detector output
  signed: QuantumScore; // Converted to quantum score
  weighted: number; // Weighted contribution
  meta: Record<string, any>;
}

/**
 * Timeframe Result
 * Analysis for a single timeframe
 */
export interface TFResult {
  tf: string; // Timeframe identifier (5m, 15m, 1h, etc.)
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  final_score: QuantumScore;
  components: DetectorComponent[];
  weight: number; // Timeframe weight
  priority: 'TACTICAL' | 'STRATEGIC' | 'OPERATIONAL';
}

/**
 * District Verdict
 * Judicial interpretation of single timeframe testimony
 */
export interface DistrictVerdict {
  timeframe: string;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  convictionStrength: number; // Absolute value of score
  detectorTestimony: Array<{
    name: DetectorName;
    rawEvidence: any;
    weightedInfluence: QuantumScore;
    credibility: number;
  }>;
  judicialNotes: string[];
}

/**
 * Strategic Verdict
 * Final multi-timeframe combined decision
 */
export interface StrategicVerdict {
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  quantumScore: QuantumScore;
  conviction: number; // 0-1, absolute value of quantumScore
  action: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  timeframeResults: TFResult[];
  dissentingOpinions: Array<{
    detector: DetectorName;
    timeframe: string;
    opinion: string;
    score: QuantumScore;
  }>;
  consensusStrength: number; // 0-1, how aligned are the timeframes
}

/**
 * Detector Weights Configuration
 * Power distribution across detectors
 */
export interface DetectorWeights {
  technical_analysis: {
    harmonic: number;
    elliott: number;
    fibonacci: number;
    price_action: number;
    smc: number;
    sar: number;
  };
  fundamental_analysis: {
    sentiment: number;
    news: number;
    whales: number;
  };
}

/**
 * Timeframe Weights Configuration
 */
export interface TimeframeWeights {
  [timeframe: string]: number;
}

/**
 * Complete Scoring Snapshot
 * Full transparency report
 */
export interface ScoringSnapshot {
  timestamp: string;
  symbol: string;
  marketConditions: {
    volatility: number;
    trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
    volume: number;
  };
  judicialProceedings: {
    timeframeCourts: TFResult[];
    supremeVerdict: StrategicVerdict;
    dissentingOpinions: Array<{
      detector: DetectorName;
      timeframe: string;
      opinion: string;
    }>;
  };
  detectorPerformance: Array<{
    detector: DetectorName;
    currentScore: QuantumScore;
    historicalAccuracy: number;
    confidenceLevel: number;
  }>;
  systemHealth: {
    weightsVersion: string;
    lastConstitutionalAmendment: string;
    detectorUptime: Record<DetectorName, number>;
  };
}

/**
 * Weight Amendment Request
 */
export interface WeightAmendment {
  detectorWeights?: Partial<DetectorWeights>;
  timeframeWeights?: TimeframeWeights;
  reason?: string;
  authority: 'PRESIDENTIAL' | 'JUDICIAL' | 'LEGISLATIVE' | 'EMERGENCY';
}

/**
 * Market Context
 */
export interface MarketContext {
  symbol: string;
  currentPrice: number;
  volatility: number;
  trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  volume: number;
  volume24h: number;
}

/**
 * Constitutional Limits
 */
export interface ConstitutionalLimits {
  MIN_WEIGHT: number;
  MAX_WEIGHT: number;
  TOTAL_SUM: number;
  NEUTRAL_TERRITORY: number;
  STRONG_SIGNAL_OVERRIDE: number;
  MAJORITY_CONSENSUS: number;
}
