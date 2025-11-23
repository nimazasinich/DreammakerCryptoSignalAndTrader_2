import {
  FinalDecision,
  CoreSignal,
  LayerScore,
  PatternScores,
  SentimentScores,
  MLScore,
  CategoryScore,
  EffectiveWeights
} from '../types/signals';
import { SmartWeightAdjuster, AdaptiveConfig } from './SmartWeightAdjuster';
import { ScoringTelemetry } from './ScoringTelemetry';
import fs from 'fs';
import path from 'path';

type Weights = {
  core: number;   // 0.40
  smc: number;    // 0.25
  patterns: number; // 0.20
  sentiment: number; // 0.10
  ml: number;     // 0.05
};

export const DEFAULT_WEIGHTS: Weights = { core: 0.40, smc: 0.25, patterns: 0.20, sentiment: 0.10, ml: 0.05 };

// Config loader for adaptive settings
function loadAdaptiveConfig(): AdaptiveConfig | null {
  try {
    const configPath = path.join(process.cwd(), 'config', 'scoring.config.json');
    const rawData = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(rawData);

    if (config.adaptive) {
      return config.adaptive as AdaptiveConfig;
    }
  } catch (error) {
    // Config not available or invalid, return null
  }
  return null;
}

let smartAdjuster: SmartWeightAdjuster | null = null;
let telemetry: ScoringTelemetry | null = null;

// Initialize smart adjuster if adaptive is enabled
function getSmartAdjuster(): SmartWeightAdjuster | null {
  if (smartAdjuster) {
    return smartAdjuster;
  }

  const adaptiveConfig = loadAdaptiveConfig();
  if (adaptiveConfig && adaptiveConfig.enabled) {
    smartAdjuster = SmartWeightAdjuster.getInstance(adaptiveConfig);
    telemetry = ScoringTelemetry.getInstance(adaptiveConfig.telemetryPath);
    return smartAdjuster;
  }

  return null;
}

/**
 * HTS Smart Scoring Engine - Category-level aggregation with optional adaptive weighting
 *
 * This function:
 * 1. Maps component scores to categories (Core/SMC/Patterns/Sentiment/ML)
 * 2. Calculates category-level scores
 * 3. Applies adaptive weights (if enabled) or static weights (default)
 * 4. Computes finalStrategyScore from category aggregation
 * 5. Maintains backward compatibility with existing finalScore
 */
export function aggregateScores(
  core: CoreSignal,
  smc: LayerScore,
  patterns: PatternScores,
  sentiment: SentimentScores,
  ml: MLScore,
  weights: Weights = DEFAULT_WEIGHTS,
  thresholds = { buy: 0.70, sell: 0.70 }
): FinalDecision {
  // =========================
  // Legacy Score Calculation (Backward Compatibility)
  // =========================
  const legacyFinalScore =
      weights.core     * core.score
    + weights.smc      * smc.score
    + weights.patterns * patterns.combined.score
    + weights.sentiment* sentiment.combined.score
    + weights.ml       * ml.score;

  // =========================
  // HTS Category-Level Scoring
  // =========================

  // Get effective weights (adaptive or static)
  const adjuster = getSmartAdjuster();
  const staticWeights: EffectiveWeights = {
    categories: weights,
    isAdaptive: false,
    lastUpdated: Date.now()
  };

  const effectiveWeights: EffectiveWeights = adjuster
    ? adjuster.getWeights(staticWeights as any) as EffectiveWeights
    : staticWeights;

  // Build category scores
  const categoryScores: CategoryScore[] = [
    {
      name: 'core',
      rawScore: core.score,
      weightedScore: core.score * effectiveWeights.categories.core,
      weight: effectiveWeights.categories.core,
      contributingDetectors: ['rsi', 'macd', 'ma_cross', 'bollinger', 'volume', 'adx', 'roc'],
      description: 'Core technical indicators'
    },
    {
      name: 'smc',
      rawScore: smc.score,
      weightedScore: smc.score * effectiveWeights.categories.smc,
      weight: effectiveWeights.categories.smc,
      contributingDetectors: ['market_structure', 'order_blocks', 'fvg', 'bos', 'liquidity'],
      description: 'Smart Money Concepts'
    },
    {
      name: 'patterns',
      rawScore: patterns.combined.score,
      weightedScore: patterns.combined.score * effectiveWeights.categories.patterns,
      weight: effectiveWeights.categories.patterns,
      contributingDetectors: ['harmonics', 'elliott', 'classical_patterns'],
      description: 'Pattern recognition'
    },
    {
      name: 'sentiment',
      rawScore: sentiment.combined.score,
      weightedScore: sentiment.combined.score * effectiveWeights.categories.sentiment,
      weight: effectiveWeights.categories.sentiment,
      contributingDetectors: ['sentiment', 'news', 'whales'],
      description: 'Market sentiment'
    },
    {
      name: 'ml',
      rawScore: ml.score,
      weightedScore: ml.score * effectiveWeights.categories.ml,
      weight: effectiveWeights.categories.ml,
      contributingDetectors: ['ml_ai'],
      description: 'Machine learning predictions'
    }
  ];

  // Calculate finalStrategyScore from category aggregation
  const finalStrategyScore = categoryScores.reduce((sum, cat) => sum + cat.weightedScore, 0);

  // Ensure finalStrategyScore is in [0, 1] range
  const clampedStrategyScore = Math.max(0, Math.min(1, finalStrategyScore));

  // =========================
  // Action Determination
  // =========================
  let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';

  // Use finalStrategyScore for action if available, fallback to legacy
  const scoreForAction = clampedStrategyScore || legacyFinalScore;

  // BUY: score >= buyThreshold (e.g., 0.70)
  if (core.action === 'BUY'  && scoreForAction >= thresholds.buy)  action = 'BUY';

  // SELL: score <= sellThreshold (e.g., 0.30) - inverted logic for SELL
  if (core.action === 'SELL' && scoreForAction <= thresholds.sell) action = 'SELL';

  // =========================
  // Confidence Calculation
  // =========================
  // Calculate confidence based on component agreement
  const componentScores = [core.score, smc.score, patterns.combined.score, sentiment.combined.score, ml.score];
  const avgScore = componentScores.reduce((sum, s) => sum + s, 0) / componentScores.length;
  const variance = componentScores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / componentScores.length;
  const stdDev = Math.sqrt(variance);
  const confidence = Math.max(0, Math.min(1, 1 - (stdDev * 2))); // Lower std dev = higher confidence

  // =========================
  // Telemetry Summary
  // =========================
  const telemetrySummary = telemetry ? telemetry.getSummary() : undefined;

  // =========================
  // Build Final Decision
  // =========================
  return {
    action,
    score: scoreForAction,
    confidence,
    finalScore: legacyFinalScore, // Deprecated: kept for backward compatibility

    // HTS Smart Scoring Extensions
    finalStrategyScore: clampedStrategyScore,
    categoryScores,
    effectiveWeights,
    telemetrySummary,

    components: {
      core,
      smc,
      patterns,
      sentiment,
      ml,
      aux: {
        fibonacci: {score: 0, reasons: []},
        sar: {score: 0, reasons: []},
        rpercent: {score: 0, reasons: []}
      }
    }
  };
}
