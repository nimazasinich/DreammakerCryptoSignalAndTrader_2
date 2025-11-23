/**
 * STRATEGY ENGINE
 * Implements combiner, MTF decision, confluence, reversal rules, and entry planning
 */

import {
  Direction,
  Action,
  Component,
  TFResult,
  ConfluenceInfo,
  EntryPlan,
  ContextSnapshot,
  ScoringSnapshot
} from '../types/index.js';
import { OHLCVData, TechnicalFeatures, generateFeatures } from './features.js';
import { DETECTORS, DetectorKey } from './detectors.js';
import fs from 'fs';
import path from 'path';

// ========== CONFIG LOADERS ==========

let scoringConfig: any = null;
let strategyConfig: any = null;
let lastScoringLoad = 0;
let lastStrategyLoad = 0;

function loadScoringConfig(): any {
  const now = Date.now();
  if (scoringConfig && (now - lastScoringLoad < 30000)) {
    return scoringConfig; // Cache for 30s
  }

  try {
    const configPath = path.join(process.cwd(), 'config', 'scoring.config.json');
    const data = fs.readFileSync(configPath, 'utf-8');
    scoringConfig = JSON.parse(data);
    lastScoringLoad = now;
    return scoringConfig;
  } catch (error) {
    console.warn('Failed to load scoring.config.json, using defaults', error);
    return { weights: {} };
  }
}

function loadStrategyConfig(): any {
  const now = Date.now();
  if (strategyConfig && (now - lastStrategyLoad < 30000)) {
    return strategyConfig;
  }

  try {
    const configPath = path.join(process.cwd(), 'config', 'strategy.config.json');
    const data = fs.readFileSync(configPath, 'utf-8');
    strategyConfig = JSON.parse(data);
    lastStrategyLoad = now;
    return strategyConfig;
  } catch (error) {
    console.warn('Failed to load strategy.config.json, using defaults', error);
    return {
      tfs: ['15m', '1h', '4h'],
      neutralEpsilon: 0.05,
      anyThreshold: 0.65,
      majorityThreshold: 0.60,
      confluence: { enabled: false }
    };
  }
}

// ========== PER-TF COMBINER ==========

export function combinePerTF(
  candles: OHLCVData[],
  features: TechnicalFeatures,
  tf: string,
  contextData?: { sentiment?: any; news?: any[]; whales?: any }
): TFResult {
  const config = loadScoringConfig();
  const stratConfig = loadStrategyConfig();
  const weights = config.weights || {};
  const neutralEpsilon = stratConfig.neutralEpsilon || 0.05;

  const components: Component[] = [];
  let signedSum = 0;
  let weightSum = 0;

  // Run all detectors
  for (const detectorName of Object.keys(DETECTORS) as DetectorKey[]) {
    const weight = weights[detectorName] || 0;
    if (weight === 0) continue;

    const detector = DETECTORS[detectorName];
    let output;

    try {
      if (detectorName === 'sentiment') {
        output = (detector as any)(contextData?.sentiment);
      } else if (detectorName === 'news') {
        output = (detector as any)(contextData?.news);
      } else if (detectorName === 'whales') {
        output = (detector as any)(contextData?.whales);
      } else if (detectorName === 'ml_ai' || detectorName === 'reversal' ||
                 detectorName === 'bollinger' || detectorName === 'support_resistance' ||
                 detectorName === 'market_structure') {
        output = (detector as any)(candles, features);
      } else {
        output = (detector as any)(features);
      }
    } catch (error) {
      console.warn(`Detector ${detectorName} failed:`, error);
      output = { score: 0, meta: { error: 'detector_failed' } };
    }

    const clamped = Math.max(-1, Math.min(1, output.score));
    const signed = clamped * weight;

    components.push({
      name: detectorName,
      raw: output.score,
      weight,
      signed
    });

    signedSum += signed;
    weightSum += Math.abs(weight);
  }

  // Normalize by sum of absolute weights
  const normalized = weightSum > 0 ? signedSum / weightSum : 0;

  // Map to [0, 1] for final_score
  const final_score = (normalized + 1) / 2;

  // Determine direction
  let direction: Direction = 'NEUTRAL';
  if (normalized > neutralEpsilon) {
    direction = 'BULLISH';
  } else if (normalized < -neutralEpsilon) {
    direction = 'BEARISH';
  }

  return {
    tf,
    direction,
    final_score,
    components
  };
}

// ========== MTF DECISION ==========

export function makeMTFDecision(results: TFResult[]): { direction: Direction; action: Action; rationale: string } {
  const stratConfig = loadStrategyConfig();
  const { anyThreshold, majorityThreshold } = stratConfig;

  // Count directional votes
  let bullCount = 0;
  let bearCount = 0;

  for (const r of results) {
    if (r.direction === 'BULLISH') bullCount++;
    else if (r.direction === 'BEARISH') bearCount++;
  }

  const majorityDir = bullCount > bearCount ? 'BULLISH' : bearCount > bullCount ? 'BEARISH' : 'NEUTRAL';

  // Check if any TF has score >= anyThreshold
  const anyHighScore = results.some(r => r.final_score >= anyThreshold);
  const anyLowScore = results.some(r => r.final_score <= (1 - anyThreshold));

  // Check if majority TFs have score >= majorityThreshold
  const bullMajority = results.filter(r => r.direction === 'BULLISH' && r.final_score >= majorityThreshold).length;
  const bearMajority = results.filter(r => r.direction === 'BEARISH' && r.final_score <= (1 - majorityThreshold)).length;
  const majorityMet = (bullMajority > results.length / 2) || (bearMajority > results.length / 2);

  let action: Action = 'HOLD';
  let rationale = '';

  if (majorityDir === 'BULLISH' && (anyHighScore || majorityMet)) {
    action = 'BUY';
    rationale = `Bullish: ${bullCount}/${results.length} TFs bullish, ${anyHighScore ? 'any TF >= threshold' : 'majority met'}`;
  } else if (majorityDir === 'BEARISH' && (anyLowScore || majorityMet)) {
    action = 'SELL';
    rationale = `Bearish: ${bearCount}/${results.length} TFs bearish, ${anyLowScore ? 'any TF >= threshold' : 'majority met'}`;
  } else {
    action = 'HOLD';
    rationale = `Neutral: ${bullCount} bull, ${bearCount} bear, thresholds not met`;
  }

  return { direction: majorityDir, action, rationale };
}

// ========== CONFLUENCE ==========

export function calculateConfluence(
  results: TFResult[],
  mtfDirection: Direction
): ConfluenceInfo {
  const stratConfig = loadStrategyConfig();
  const confConfig = stratConfig.confluence || {};

  if (!confConfig.enabled) {
    return {
      enabled: false,
      score: 0,
      agreement: 0,
      ai: 0,
      tech: 0,
      context: 0,
      passed: false
    };
  }

  const aiWeight = confConfig.aiWeight || 0.5;
  const techWeight = confConfig.techWeight || 0.35;
  const contextWeight = confConfig.contextWeight || 0.15;
  const threshold = confConfig.threshold || 0.60;

  // Agreement: fraction of TFs matching MTF direction
  const agreementCount = results.filter(r => r.direction === mtfDirection).length;
  const agreement = (results?.length || 0) > 0 ? agreementCount / results.length : 0;

  // AI01: average normalized AI contribution
  let aiSum = 0, aiCount = 0;
  // Tech01: average normalized technicals
  let techSum = 0, techCount = 0;
  // Context01: average context detectors
  let contextSum = 0, contextCount = 0;

  const aiDetectors = ['ml_ai'];
  const techDetectors = ['rsi', 'macd', 'ma_cross', 'bollinger', 'volume', 'support_resistance', 'adx', 'roc', 'market_structure'];
  const contextDetectors = ['sentiment', 'news', 'whales'];

  for (const r of results) {
    for (const comp of r.components) {
      const score01 = (comp.signed + 1) / 2; // Map [-1,+1] to [0,1]

      if (aiDetectors.includes(comp.name)) {
        aiSum += score01;
        aiCount++;
      } else if (techDetectors.includes(comp.name)) {
        techSum += score01;
        techCount++;
      } else if (contextDetectors.includes(comp.name)) {
        contextSum += score01;
        contextCount++;
      }
    }
  }

  const ai01 = aiCount > 0 ? aiSum / aiCount : 0.5;
  const tech01 = techCount > 0 ? techSum / techCount : 0.5;
  const context01 = contextCount > 0 ? contextSum / contextCount : 0.5;

  // Confluence = Agreement × (aiW*AI01 + techW*Tech01 + contextW*Context01)
  const score = agreement * (aiWeight * ai01 + techWeight * tech01 + contextWeight * context01);
  const passed = score >= threshold;

  return {
    enabled: true,
    score,
    agreement,
    ai: ai01,
    tech: tech01,
    context: context01,
    passed
  };
}

// ========== REVERSAL & COUNTER-TREND RULES ==========

export function checkReversalRules(
  results: TFResult[],
  confluence: ConfluenceInfo,
  mtfDirection: Direction
): { allowed: boolean; reason?: string } {
  const stratConfig = loadStrategyConfig();
  const counterTrendConfig = stratConfig.futures?.counterTrend || {};

  if (!counterTrendConfig.enabled) {
    return { allowed: true };
  }

  // Check if reversal is counter-trend
  // For simplicity, assume reversal detector presence indicates potential reversal
  const reversalDetected = results.some(r =>
    r.components.some(c => c.name === 'reversal' && Math.abs(c.signed) > 0.3)
  );

  if (!reversalDetected) {
    return { allowed: true };
  }

  // Check adjacency (2 adjacent TFs must agree)
  if (counterTrendConfig.requireAdjTFConfirm) {
    for (let i = 0; i < results.length - 1; i++) {
      const r1 = results[i];
      const r2 = results[i + 1];
      if (r1.direction === r2.direction && r1.direction !== 'NEUTRAL') {
        // Adjacent TFs agree
        return { allowed: true };
      }
    }
    // No adjacent agreement
    return { allowed: false, reason: 'reversal_no_adjacent_confirmation' };
  }

  // Check counter-trend confluence requirement
  const minConfluence = counterTrendConfig.minConfluence || 0.70;
  if (confluence.score < minConfluence) {
    return { allowed: false, reason: `reversal_confluence_below_${minConfluence}` };
  }

  return { allowed: true };
}

// ========== ENTRY PLAN ==========

export function buildEntryPlan(
  candles: OHLCVData[],
  features: TechnicalFeatures,
  action: Action,
  confluence: ConfluenceInfo
): EntryPlan | undefined {
  if (action === 'HOLD') {
    return undefined;
  }

  const stratConfig = loadStrategyConfig();
  const entryConfig = stratConfig.futures?.entry || {};
  const leverageConfig = stratConfig.futures?.leverage || {};
  const volatilityGate = stratConfig.futures?.volatilityGate || {};
  const contextGates = stratConfig.futures?.contextGates || {};

  const mode = entryConfig.mode || 'ATR';
  const fixedSLPct = entryConfig.fixedSLPct || 0.02;
  const atrK = entryConfig.atrK || 1.2;
  const rr = entryConfig.rr || 2.0;
  const ladder = entryConfig.ladder || [0.4, 0.35, 0.25];
  const trailing = entryConfig.trailing || { enabled: true, startAtTP1: true, atrK: 1.0 };

  const close = candles[candles.length - 1].close;
  const atr = features.atr[features.atr.length - 1] || close * 0.01;

  let sl = 0;
  let tpDistance = 0;

  if (mode === 'FIXED') {
    sl = action === 'BUY' ? close * (1 - fixedSLPct) : close * (1 + fixedSLPct);
    tpDistance = Math.abs(close - sl) * rr;
  } else if (mode === 'ATR') {
    sl = action === 'BUY' ? close - atr * atrK : close + atr * atrK;
    tpDistance = Math.abs(close - sl) * rr;
  } else {
    // STRUCT mode: use swing S/R
    const support = features.supportResistance.support[features.supportResistance.support.length - 1];
    const resistance = features.supportResistance.resistance[features.supportResistance.resistance.length - 1];
    sl = action === 'BUY' ? support * 0.995 : resistance * 1.005;
    tpDistance = Math.abs(close - sl) * rr;
  }

  const tp1 = action === 'BUY' ? close + tpDistance * 0.5 : close - tpDistance * 0.5;
  const tp2 = action === 'BUY' ? close + tpDistance * 0.75 : close - tpDistance * 0.75;
  const tp3 = action === 'BUY' ? close + tpDistance : close - tpDistance;

  // Dynamic leverage
  const minLev = leverageConfig.min || 2;
  const maxLev = leverageConfig.max || 10;
  const liqBuffer = leverageConfig.liqBufferPct || 0.35;

  // Simplified leverage calculation
  // leverage = (accountRisk% / slDistance%) clamped to [min, max]
  const slDistance = Math.abs((close - sl) / close);
  let leverage = Math.min(maxLev, Math.max(minLev, 0.02 / slDistance));

  // Apply liquidation buffer (reduce leverage)
  leverage = leverage * (1 - liqBuffer);
  leverage = Math.max(minLev, Math.min(maxLev, Math.floor(leverage)));

  // Volatility gate: check ATR Z-score
  const atrSlice = features.atr.slice(-20).filter(v => !isNaN(v));
  if ((atrSlice?.length || 0) > 0) {
    const atrMean = atrSlice.reduce((a, b) => a + b, 0) / atrSlice.length;
    const atrStd = Math.sqrt(atrSlice.reduce((sum, val) => sum + Math.pow(val - atrMean, 2), 0) / atrSlice.length);
    const atrZ = atrStd > 0 ? (atr - atrMean) / atrStd : 0;

    if (Math.abs(atrZ) > (volatilityGate.atrZMax || 3.0)) {
      // Volatility breach: reduce leverage
      leverage = Math.max(minLev, leverage * 0.7);
    }
  }

  // Context gating: shock reduce
  if (contextGates.shockReduce?.enabled && confluence.score < contextGates.shockReduce.threshold) {
    leverage = Math.max(minLev, leverage * (contextGates.shockReduce.leverageFactor || 0.7));
  }

  return {
    mode,
    sl,
    tp: [tp1, tp2, tp3],
    ladder,
    trailing,
    leverage: Math.round(leverage)
  };
}

// ========== CONTEXT SNAPSHOT ==========

export function buildContextSnapshot(contextData?: { sentiment?: any; news?: any[]; whales?: any }): ContextSnapshot {
  // Convert context data to [0, 1] range

  const sentiment01 = contextData?.sentiment
    ? (contextData.sentiment.score + 1) / 2
    : 0.5;

  const news01 = contextData?.news && (contextData.news?.length || 0) > 0
    ? (contextData.news[0].score + 1) / 2
    : 0.5;

  const whales01 = contextData?.whales
    ? (contextData.whales.score + 1) / 2
    : undefined;

  return {
    sentiment01,
    news01,
    whales01,
    raw: contextData
  };
}

// ========== CONTEXT GATING ==========

export function applyContextGating(
  action: Action,
  context: ContextSnapshot
): Action {
  const stratConfig = loadStrategyConfig();
  const contextGates = stratConfig.futures?.contextGates || {};

  // Bad-News Hold
  if (contextGates.badNewsHold?.enabled) {
    const newsMin = contextGates.badNewsHold.newsMin || -0.35;
    const sentimentMin = contextGates.badNewsHold.sentimentMin || -0.25;

    // Convert back to [-1, +1] for comparison
    const newsScore = context.news01 * 2 - 1;
    const sentimentScore = context.sentiment01 * 2 - 1;

    if (newsScore < newsMin && sentimentScore < sentimentMin) {
      return 'HOLD'; // Force HOLD due to bad news & sentiment
    }
  }

  return action;
}

// ========== SIMULATION WITH OVERRIDES ==========

export interface StrategyOverrides {
  // Thresholds
  neutralEpsilon?: number;
  anyThreshold?: number;
  majorityThreshold?: number;
  // Confluence
  confluenceEnabled?: boolean;
  confluenceAiWeight?: number;
  confluenceTechWeight?: number;
  confluenceContextWeight?: number;
  confluenceThreshold?: number;
  // Entry
  entryMode?: 'FIXED' | 'ATR' | 'STRUCT';
  fixedSLPct?: number;
  atrK?: number;
  rr?: number;
  ladder?: number[];
  trailingEnabled?: boolean;
  trailingStartAtTP1?: boolean;
  trailingAtrK?: number;
  // Leverage
  minLeverage?: number;
  maxLeverage?: number;
  // Detector weights (partial override)
  weights?: Record<string, number>;
}

export async function buildSnapshotWithOverrides(params: {
  symbol: string;
  candlesMap: Map<string, OHLCVData[]>;
  contextData?: { sentiment?: any; news?: any[]; whales?: any };
  overrides?: StrategyOverrides;
}): Promise<ScoringSnapshot & { simulation?: { applied: boolean; overrides?: StrategyOverrides } }> {
  const { symbol, candlesMap, contextData, overrides } = params;

  // Temporarily merge overrides into configs
  const origScoringConfig = scoringConfig;
  const origStrategyConfig = strategyConfig;

  try {
    // Apply overrides
    if (overrides) {
      // Clone configs
      const tempScoringConfig = JSON.parse(JSON.stringify(loadScoringConfig()));
      const tempStrategyConfig = JSON.parse(JSON.stringify(loadStrategyConfig()));

      // Apply weight overrides
      if (overrides.weights) {
        tempScoringConfig.weights = { ...tempScoringConfig.weights, ...overrides.weights };
      }

      // Apply threshold overrides
      if (overrides.neutralEpsilon !== undefined) tempStrategyConfig.neutralEpsilon = overrides.neutralEpsilon;
      if (overrides.anyThreshold !== undefined) tempStrategyConfig.anyThreshold = overrides.anyThreshold;
      if (overrides.majorityThreshold !== undefined) tempStrategyConfig.majorityThreshold = overrides.majorityThreshold;

      // Apply confluence overrides
      if (overrides.confluenceEnabled !== undefined) {
        tempStrategyConfig.confluence = tempStrategyConfig.confluence || {};
        tempStrategyConfig.confluence.enabled = overrides.confluenceEnabled;
      }
      if (overrides.confluenceAiWeight !== undefined) tempStrategyConfig.confluence.aiWeight = overrides.confluenceAiWeight;
      if (overrides.confluenceTechWeight !== undefined) tempStrategyConfig.confluence.techWeight = overrides.confluenceTechWeight;
      if (overrides.confluenceContextWeight !== undefined) tempStrategyConfig.confluence.contextWeight = overrides.confluenceContextWeight;
      if (overrides.confluenceThreshold !== undefined) tempStrategyConfig.confluence.threshold = overrides.confluenceThreshold;

      // Apply entry overrides
      if (!tempStrategyConfig.futures) tempStrategyConfig.futures = {};
      if (!tempStrategyConfig.futures.entry) tempStrategyConfig.futures.entry = {};

      if (overrides.entryMode !== undefined) tempStrategyConfig.futures.entry.mode = overrides.entryMode;
      if (overrides.fixedSLPct !== undefined) tempStrategyConfig.futures.entry.fixedSLPct = overrides.fixedSLPct;
      if (overrides.atrK !== undefined) tempStrategyConfig.futures.entry.atrK = overrides.atrK;
      if (overrides.rr !== undefined) tempStrategyConfig.futures.entry.rr = overrides.rr;
      if (overrides.ladder !== undefined) tempStrategyConfig.futures.entry.ladder = overrides.ladder;

      if (overrides.trailingEnabled !== undefined || overrides.trailingStartAtTP1 !== undefined || overrides.trailingAtrK !== undefined) {
        if (!tempStrategyConfig.futures.entry.trailing) tempStrategyConfig.futures.entry.trailing = {};
        if (overrides.trailingEnabled !== undefined) tempStrategyConfig.futures.entry.trailing.enabled = overrides.trailingEnabled;
        if (overrides.trailingStartAtTP1 !== undefined) tempStrategyConfig.futures.entry.trailing.startAtTP1 = overrides.trailingStartAtTP1;
        if (overrides.trailingAtrK !== undefined) tempStrategyConfig.futures.entry.trailing.atrK = overrides.trailingAtrK;
      }

      // Apply leverage overrides
      if (overrides.minLeverage !== undefined || overrides.maxLeverage !== undefined) {
        if (!tempStrategyConfig.futures.leverage) tempStrategyConfig.futures.leverage = {};
        if (overrides.minLeverage !== undefined) tempStrategyConfig.futures.leverage.min = overrides.minLeverage;
        if (overrides.maxLeverage !== undefined) tempStrategyConfig.futures.leverage.max = overrides.maxLeverage;
      }

      // Replace in-memory configs temporarily
      scoringConfig = tempScoringConfig;
      strategyConfig = tempStrategyConfig;
    }

    // Run standard engine
    const snapshot = await runStrategyEngine(symbol, candlesMap, contextData);

    // Add simulation metadata
    return {
      ...snapshot,
      simulation: {
        applied: !!overrides,
        overrides: overrides || undefined
      }
    };
  } finally {
    // Restore original configs
    scoringConfig = origScoringConfig;
    strategyConfig = origStrategyConfig;
  }
}

// ========== COOLDOWN TRACKING (IN-MEMORY) ==========

interface CooldownState {
  symbol: string;
  consecutiveSLs: number;
  cooldownUntil: number; // timestamp
  lastSLTime: number;
}

const cooldownStates = new Map<string, CooldownState>();

export function recordStopLoss(symbol: string) {
  const state = cooldownStates.get(symbol) || {
    symbol,
    consecutiveSLs: 0,
    cooldownUntil: 0,
    lastSLTime: 0
  };

  state.consecutiveSLs++;
  state.lastSLTime = Date.now();

  const stratConfig = loadStrategyConfig();
  const cooldownConfig = stratConfig.futures?.cooldown || {};

  if (cooldownConfig.enabled && state.consecutiveSLs >= (cooldownConfig.afterConsecutiveSL || 2)) {
    // Calculate cooldown period (bars * average bar duration)
    // Assuming 15m bars, cooldown of 20 bars = 300 minutes = 5 hours
    const barsToWait = cooldownConfig.bars || 20;
    const avgBarDurationMs = 15 * 60 * 1000; // 15 minutes in ms
    state.cooldownUntil = Date.now() + (barsToWait * avgBarDurationMs);
  }

  cooldownStates.set(symbol, state);
}

export function recordProfitOrBreakeven(symbol: string) {
  // Reset consecutive SLs on profit/breakeven
  const state = cooldownStates.get(symbol);
  if (state) {
    state.consecutiveSLs = 0;
    cooldownStates.set(symbol, state);
  }
}

function checkCooldown(symbol: string): { active: boolean; reason?: string } {
  const state = cooldownStates.get(symbol);
  if (!state) {
    return { active: false };
  }

  const now = Date.now();
  if (state.cooldownUntil > now) {
    const minutesLeft = Math.ceil((state.cooldownUntil - now) / (60 * 1000));
    return {
      active: true,
      reason: `cooldown_active_${state.consecutiveSLs}SLs_${minutesLeft}min_remaining`
    };
  }

  return { active: false };
}

// ========== MAIN STRATEGY ENGINE ==========

export async function runStrategyEngine(
  symbol: string,
  candlesMap: Map<string, OHLCVData[]>,
  contextData?: { sentiment?: any; news?: any[]; whales?: any }
): Promise<ScoringSnapshot> {
  const stratConfig = loadStrategyConfig();
  const tfs = stratConfig.tfs || ['15m', '1h', '4h'];

  const results: TFResult[] = [];

  for (const tf of tfs) {
    const candles = candlesMap.get(tf);
    if (!candles || candles.length < 50) {
      console.warn(`Insufficient data for ${tf}, skipping`);
      continue;
    }

    const features = generateFeatures(candles);
    const tfResult = combinePerTF(candles, features, tf, contextData);
    results.push(tfResult);
  }

  if (results.length === 0) {
    console.error('No valid timeframe results');
  }

  // MTF decision
  const { direction, action: initialAction, rationale } = makeMTFDecision(results);

  // Calculate confluence
  const confluence = calculateConfluence(results, direction);

  // Check reversal rules
  const reversalCheck = checkReversalRules(results, confluence, direction);
  let action = initialAction;
  let additionalRationale = '';

  if (!reversalCheck.allowed) {
    action = 'HOLD';
    additionalRationale += reversalCheck.reason ? ` [${reversalCheck.reason}]` : '';
  }

  // Check cooldown
  const cooldownCheck = checkCooldown(symbol);
  if (cooldownCheck.active && action !== 'HOLD') {
    action = 'HOLD';
    additionalRationale += cooldownCheck.reason ? ` [${cooldownCheck.reason}]` : '';
  }

  // Apply context gating
  const context = buildContextSnapshot(contextData);
  action = applyContextGating(action, context);

  // Build entry plan
  const candles = candlesMap.get(tfs[0])!;
  const features = generateFeatures(candles);
  const entryPlan = buildEntryPlan(candles, features, action, confluence);

  // Calculate final_score (average of TF scores weighted equally for simplicity)
  const final_score = results.reduce((sum, r) => sum + r.final_score, 0) / results.length;

  return {
    symbol,
    results,
    direction,
    final_score,
    action,
    rationale: rationale + additionalRationale,
    confluence,
    entryPlan,
    context,
    timestamp: Date.now()
  };
}
