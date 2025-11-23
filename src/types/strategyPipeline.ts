/**
 * Strategy Pipeline Types
 *
 * Type definitions for the HTS Strategy Pipeline API
 * that runs Strategy 1 → 2 → 3 end-to-end
 */

import { FinalDecision, CategoryScore, EffectiveWeights, TelemetrySummary } from './signals';

/**
 * Common symbol view with scoring details
 */
export type StrategySymbolView = {
  symbol: string;
  finalStrategyScore: number;
  confidence: number;
  action: 'BUY' | 'SELL' | 'HOLD';
  categoryScores: CategoryScore[];

  // Category breakdown (simplified for display)
  core: number;
  smc: number;
  patterns: number;
  sentiment: number;
  ml: number;
};

/**
 * Strategy 1 result - Wide universe scanning
 */
export type Strategy1Result = {
  symbol: string;
  rank: number;
  finalStrategyScore: number;
  confidence: number;
  action: 'BUY' | 'SELL' | 'HOLD';
  categoryScores: CategoryScore[];

  // Category breakdown
  core: number;
  smc: number;
  patterns: number;
  sentiment: number;
  ml: number;

  priceUsd?: number;
};

/**
 * Strategy 2 result - Refined set with ETA
 */
export type Strategy2Result = {
  symbol: string;
  rank: number;
  finalStrategyScore: number;
  confidence: number;
  action: 'BUY' | 'SELL' | 'HOLD';
  categoryScores: CategoryScore[];

  // Category breakdown
  core: number;
  smc: number;
  patterns: number;
  sentiment: number;
  ml: number;

  // Strategy 2 specific
  etaMinutes: number; // Estimated time to action
};

/**
 * Strategy 3 result - Final top picks with entry plan
 */
export type Strategy3Result = {
  symbol: string;
  rank: number;
  finalStrategyScore: number;
  confidence: number;
  bias: 'LONG' | 'SHORT' | 'HOLD';
  categoryScores: CategoryScore[];

  // Category breakdown
  core: number;
  smc: number;
  patterns: number;
  sentiment: number;
  ml: number;

  // Entry levels (Fibonacci-based)
  entryLevels: {
    conservative: number; // 0.236
    base: number;         // 0.382
    aggressive: number;   // 0.5
  };

  // Risk management
  risk: {
    slAtrMult: number;    // Stop-loss ATR multiplier
    rr: number;           // Risk-reward ratio
  };

  // Summary text
  summary: string;

  // Telemetry (if available)
  telemetry?: TelemetrySummary;
};

/**
 * Stage metadata
 */
export type StageMetadata = {
  totalProcessed: number;
  filteredCount: number;
  avgScore: number;
  processingTimeMs: number;
};

/**
 * Scoring overview
 */
export type ScoringOverview = {
  adaptiveEnabled: boolean;
  effectiveWeights: EffectiveWeights;
  telemetrySummary?: TelemetrySummary;

  // Best performing category
  bestCategory?: {
    name: string;
    winRate: number;
    totalSignals: number;
  };
};

/**
 * Auto-trade execution result
 */
export type AutoTradeResult = {
  attempted: boolean;
  executed?: boolean;
  reason?: string | null;
  order?: any | null;
};

/**
 * Complete pipeline result
 */
export type StrategyPipelineResult = {
  strategy1: {
    symbols: Strategy1Result[];
    meta: StageMetadata;
  };

  strategy2: {
    symbols: Strategy2Result[];
    meta: StageMetadata;
  };

  strategy3: {
    symbols: Strategy3Result[];
    meta: StageMetadata;
  };

  scoring: ScoringOverview;

  autoTrade?: AutoTradeResult | null;

  timestamp: number;
};

/**
 * Pipeline run parameters
 */
export type StrategyPipelineParams = {
  symbols?: string[];          // Specific symbols, or use top N by market cap
  timeframes?: string[];       // e.g., ['15m', '1h', '4h']
  limit?: number;              // Max symbols to process (default: 50)
  mode?: 'offline' | 'online'; // Data source mode
};

/**
 * API Response wrapper
 */
export type StrategyPipelineResponse = {
  success: boolean;
  data?: StrategyPipelineResult;
  error?: string;
  message?: string;
  timestamp: number;
};
