// Adaptive scoring engine for multi-timeframe signal generation
import { OHLC, DetectorScore, TimeframeAnalysis, FinalSignal, SignalAction } from './types';
import { analyzeSMC, analyzeElliott, analyzeHarmonic } from './Analyzers';
import { rsi, macd, atr, needBars } from './Indicators';
import { RegimeDetector } from '../services/RegimeDetector.js';
import { FibonacciDetector } from '../services/FibonacciDetector.js';
import { ParabolicSARDetector } from '../services/ParabolicSARDetector.js';
import { OHLCVData } from '../services/MultiProviderMarketDataService.js';
import fs from 'fs';
import path from 'path';

// Scoring configuration (hot-reloadable)
interface ScoringConfig {
  version: string;
  weights: {
    harmonic: number;
    elliott: number;
    fibonacci: number;
    price_action: number;
    smc: number;
    sar: number;
    sentiment: number;
    news: number;
    whales: number;
  };
  thresholds: {
    buyScore: number;
    sellScore: number;
    minConfidence: number;
  };
  regimeDetection: {
    enabled: boolean;
  };
  hotReload: boolean;
  reloadIntervalMs: number;
}

let scoringConfig: ScoringConfig | null = null;
let configLoadTime = 0;

// Load scoring configuration
function loadScoringConfig(): ScoringConfig {
  try {
    const configPath = path.join(process.cwd(), 'config', 'scoring.config.json');
    const rawData = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(rawData) as ScoringConfig;
    configLoadTime = Date.now();
    return config;
  } catch (error) {
    console.warn('Failed to load scoring config, using defaults', error);
    // Return default config
    return {
      version: '2.0',
      weights: {
        harmonic: 0.15,
        elliott: 0.15,
        fibonacci: 0.10,
        price_action: 0.15,
        smc: 0.20,
        sar: 0.10,
        sentiment: 0.10,
        news: 0.03,
        whales: 0.02
      },
      thresholds: {
        buyScore: 0.70,
        sellScore: 0.30,
        minConfidence: 0.70
      },
      regimeDetection: {
        enabled: true
      },
      hotReload: true,
      reloadIntervalMs: 30000
    };
  }
}

// Get current config (with hot reload support)
function getConfig(): ScoringConfig {
  if (!scoringConfig || (scoringConfig.hotReload && Date.now() - configLoadTime > scoringConfig.reloadIntervalMs)) {
    scoringConfig = loadScoringConfig();
  }
  return scoringConfig;
}

/**
 * Normalize weights to sum to 1.0
 * This ensures scoring is always in [0, 1] range regardless of config changes
 */
function normalizeWeights(weights: Record<string, number>): Record<string, number> {
  const sum = Object.values(weights).reduce((acc, w) => acc + w, 0);

  if (sum === 0) {
    console.warn('Weight sum is zero, returning equal weights');
    const keys = Object.keys(weights);
    const equalWeight = 1.0 / keys.length;
    return Object.fromEntries((keys || []).map(k => [k, equalWeight]));
  }

  // Normalize by dividing each weight by the sum
  const normalized = Object.fromEntries(
    Object.entries(weights).map(([key, value]) => [key, value / sum])
  );

  // Verify normalization (sum should be 1.0)
  const normalizedSum = Object.values(normalized).reduce((acc, w) => acc + w, 0);
  if (Math.abs(normalizedSum - 1.0) > 0.001) {
    console.warn(`Weight normalization check failed: sum=${normalizedSum.toFixed(4)}`);
  }

  return normalized;
}

// Initialize singletons
const regimeDetector = RegimeDetector.getInstance();
const fibonacciDetector = FibonacciDetector.getInstance();
const sarDetector = ParabolicSARDetector.getInstance();

/**
 * Score a single timeframe with deterministic logic and hybrid weighting
 */
export function scoreOneTF(ohlc: OHLC[]): TimeframeAnalysis {
  const config = getConfig();
  const TH_BUY = config.thresholds.buyScore;
  const TH_SELL = config.thresholds.sellScore;

  // Require minimum 50 bars for reliable signals
  if (!needBars(50, ohlc)) {
    return {
      action: 'HOLD',
      score: 0.5,
      confidence: 0.4,
      reasoning: ['Insufficient data (<50 bars)'],
      detectors: [],
      risk: { atr: 0, vol: 0 },
      severity: 'low'
    };
  }

  const closes = (ohlc || []).map(b => b.c);

  // Calculate technical indicators
  const rsiValues = rsi(closes, 14);
  const macdValues = macd(closes, 12, 26, 9);
  const atrValues = atr(ohlc, 14);

  const currentRSI = rsiValues[rsiValues.length - 1];
  const currentMACD = macdValues.macd[macdValues.macd.length - 1];
  const currentSignal = macdValues.signal[macdValues.signal.length - 1];
  const currentATR = atrValues[atrValues.length - 1];

  // Calculate volatility
  const recentCloses = closes.slice(-20);
  const returns = [];
  for (let i = 1; i < recentCloses.length; i++) {
    returns.push((recentCloses[i] - recentCloses[i - 1]) / recentCloses[i - 1]);
  }
  const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length);

  // Run pattern detectors
  const smcScore = analyzeSMC(ohlc);
  const elliottScore = analyzeElliott(ohlc);
  const harmonicScore = analyzeHarmonic(ohlc);

  // Run new detectors (convert OHLC to OHLCVData format)
  const ohlcvData: OHLCVData[] = (ohlc || []).map((candle, idx) => ({
    timestamp: candle.t || Date.now() - (ohlc.length - idx) * 60000,
    open: candle.o,
    high: candle.h,
    low: candle.l,
    close: candle.c,
    volume: candle.v || 0,
    symbol: 'UNKNOWN',
    interval: '1h'
  }));

  let fibonacciScore = 0.5;
  let sarScore = 0.5;
  let fibReasoning: string[] = [];
  let sarReasoning: string[] = [];

  try {
    const fibResult = fibonacciDetector.detect(ohlcvData);
    if (fibResult.isValid) {
      fibonacciScore = fibResult.score;
      fibReasoning = fibResult.reasoning;
    }
  } catch (error) {
    // Silently handle fibonacci detection errors
  }

  try {
    const sarResult = sarDetector.detect(ohlcvData);
    if (sarResult.isValid) {
      sarScore = sarResult.score;
      sarReasoning = sarResult.reasoning;
    }
  } catch (error) {
    // Silently handle SAR detection errors
  }

  const detectors = [smcScore, elliottScore, harmonicScore];

  // Technical indicators normalized contribution (price_action weight)
  let priceActionScore = 0.5;

  // RSI contribution (normalize 0-100 to 0-1)
  const rsiNormalized = currentRSI / 100;
  priceActionScore += (rsiNormalized - 0.5) * 0.3; // ±0.15 max

  // MACD contribution (histogram crossover)
  const macdHist = currentMACD - currentSignal;
  const prevMACD = macdValues.macd[macdValues.macd.length - 2] || currentMACD;
  const prevSignal = macdValues.signal[macdValues.signal.length - 2] || currentSignal;
  const prevMACDHist = prevMACD - prevSignal;

  if (macdHist > 0 && prevMACDHist <= 0) {
    priceActionScore += 0.15; // Bullish crossover
  } else if (macdHist < 0 && prevMACDHist >= 0) {
    priceActionScore -= 0.15; // Bearish crossover
  } else if (macdHist > 0) {
    priceActionScore += 0.05; // Bullish momentum
  } else if (macdHist < 0) {
    priceActionScore -= 0.05; // Bearish momentum
  }

  // Normalize price action score
  priceActionScore = Math.max(0, Math.min(1, priceActionScore));

  // Calculate hybrid weighted score using config weights
  // IMPORTANT: Normalize weights at runtime to ensure they sum to 1.0
  const rawWeights = config.weights;
  const weights = normalizeWeights(rawWeights);

  let finalScore =
    weights.harmonic * harmonicScore.score +
    weights.elliott * elliottScore.score +
    weights.fibonacci * fibonacciScore +
    weights.price_action * priceActionScore +
    weights.smc * smcScore.score +
    weights.sar * sarScore +
    weights.sentiment * 0.5 + // Placeholder for sentiment
    weights.news * 0.5 + // Placeholder for news
    weights.whales * 0.5; // Placeholder for whales

  // Clip final score to [0, 1] range (defensive)
  finalScore = Math.max(0, Math.min(1, finalScore));

  // Determine action
  const action: SignalAction = finalScore > TH_BUY ? 'BUY' : finalScore < TH_SELL ? 'SELL' : 'HOLD';

  // Calculate confidence based on score distance from neutral
  let confidence = 0.5 + 0.5 * Math.abs(finalScore - 0.5);
  confidence = Math.min(confidence, config.thresholds.minConfidence);

  // Determine severity
  const isCritical = action !== 'HOLD' && confidence > 0.8 && (finalScore > 0.85 || finalScore < 0.15);
  const severity = isCritical ? 'high' : (confidence > 0.7 ? 'medium' : 'low');

  // Build reasoning
  const reasoning: string[] = [];
  reasoning.push(`RSI=${currentRSI.toFixed(1)}`);
  reasoning.push(`MACD=${macdHist > 0 ? 'bullish' : 'bearish'}`);
  if (smcScore.meta?.bos) {
    reasoning.push(`SMC: ${smcScore.meta.bosType}`);
  }
  if (elliottScore.meta?.direction && elliottScore.meta.direction !== 'SIDEWAYS') {
    reasoning.push(`Elliott: ${elliottScore.meta.direction}`);
  }
  if (harmonicScore.meta?.patternType) {
    reasoning.push(`Harmonic: ${harmonicScore.meta.patternType}`);
  }
  if ((fibReasoning?.length || 0) > 0) {
    reasoning.push(`Fib: ${fibReasoning[0]}`);
  }
  if ((sarReasoning?.length || 0) > 0) {
    reasoning.push(`SAR: ${sarReasoning[0]}`);
  }

  // Add regime if enabled
  if (config.regimeDetection.enabled) {
    try {
      const regime = regimeDetector.detect(ohlcvData);
      reasoning.push(`Regime: ${regime.regime.toUpperCase()}`);
    } catch (error) {
      // Silently handle regime detection errors
    }
  }

  return {
    action,
    score: finalScore,
    confidence,
    reasoning: reasoning.slice(0, 8), // Limit to 8 items
    detectors,
    risk: {
      atr: currentATR,
      vol: volatility
    },
    severity
  };
}

/**
 * Confluence analysis across multiple timeframes
 */
export function confluence(tfMap: Record<string, TimeframeAnalysis>): {
  action: SignalAction;
  score: number;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
} {
  const config = getConfig();
  const TH_BUY = config.thresholds.buyScore;
  const TH_SELL = config.thresholds.sellScore;

  const entries = Object.entries(tfMap);

  if (entries.length === 0) {
    return { action: 'HOLD', score: 0.5, confidence: 0.4, severity: 'low' };
  }

  // Calculate weighted average score (longer timeframes get higher weight)
  const tfWeights: Record<string, number> = {
    '1m': 0.05,
    '5m': 0.1,
    '15m': 0.15,
    '30m': 0.2,
    '1h': 0.25,
    '4h': 0.35,
    '1d': 0.45
  };

  let weightedScore = 0;
  let totalWeight = 0;

  entries.forEach(([tf, analysis]) => {
    const weight = tfWeights[tf] ?? 0.2; // Default weight if TF not in map
    weightedScore += analysis.score * weight;
    totalWeight += weight;
  });

  const avgScore = totalWeight > 0 ? weightedScore / totalWeight : 0.5;

  // Determine action
  const action: SignalAction = avgScore > TH_BUY ? 'BUY' : avgScore < TH_SELL ? 'SELL' : 'HOLD';

  // Calculate confidence (higher when TFs agree)
  const baseConfidence = 0.5 + 0.5 * Math.abs(avgScore - 0.5);

  // Check for timeframe agreement
  const actions = (entries || []).map(([, v]) => v.action);
  const buyCount = actions.filter(a => a === 'BUY').length;
  const sellCount = actions.filter(a => a === 'SELL').length;
  const holdCount = actions.filter(a => a === 'HOLD').length;

  const agreementBonus = Math.max(buyCount, sellCount, holdCount) / actions.length * 0.2;
  const confidence = Math.min(1, baseConfidence + agreementBonus);

  // Determine severity (high if any TF shows high severity)
  const hasHighSeverity = entries.some(([, v]) => v.severity === 'high');
  const hasMediumSeverity = entries.some(([, v]) => v.severity === 'medium');
  const severity = hasHighSeverity ? 'high' : (hasMediumSeverity || confidence > 0.7 ? 'medium' : 'low');

  return { action, score: avgScore, confidence, severity };
}

/**
 * Build final signal from timeframe analysis
 */
export function buildFinal(symbol: string, tfMap: Record<string, TimeframeAnalysis>): FinalSignal {
  const agg = confluence(tfMap);

  // Collect reasoning from all timeframes
  const allReasoning: string[] = [];
  Object.entries(tfMap).forEach(([tf, analysis]) => {
    analysis.reasoning.forEach(reason => {
      allReasoning.push(`${tf}: ${reason}`);
    });
  });

  return {
    id: `${symbol}-${Date.now()}`,
    symbol,
    time: Date.now(),
    action: agg.action,
    score: agg.score,
    confidence: agg.confidence,
    severity: agg.severity,
    reasoning: allReasoning.slice(0, 10), // Limit to 10 most important
    tfBreakdown: tfMap
  };
}
