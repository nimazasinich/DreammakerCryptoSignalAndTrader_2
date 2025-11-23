// Engine-specific analyzers that wrap existing services and return normalized scores
import { OHLC, DetectorScore } from './types';
import { SMCAnalyzer } from '../services/SMCAnalyzer.js';
import { ElliottWaveAnalyzer } from '../services/ElliottWaveAnalyzer.js';
import { HarmonicPatternDetector } from '../services/HarmonicPatternDetector.js';
import { MarketData } from '../types/index.js';

/**
 * Convert OHLC to MarketData format for existing services
 */
function ohlcToMarketData(ohlc: OHLC[]): MarketData[] {
  return (ohlc || []).map(bar => ({
    symbol: 'UNKNOWN', // Default symbol for analyzer context
    timestamp: bar.t,
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v ?? 0
  }));
}

/**
 * Analyze Smart Money Concepts and return normalized score
 */
export function analyzeSMC(ohlc: OHLC[]): DetectorScore {
  if (ohlc.length < 20) {
    return { detector: 'SMC', score: 0.5, meta: { reason: 'insufficient_data' } };
  }

  try {
    const smcAnalyzer = SMCAnalyzer.getInstance();
    const marketData = ohlcToMarketData(ohlc);
    const smcFeatures = smcAnalyzer.analyzeFullSMC(marketData);

    // Normalize score based on SMC features
    let score = 0.5; // neutral baseline

    // Break of Structure adds significant weight
    if (smcFeatures.breakOfStructure.detected) {
      if (smcFeatures.breakOfStructure.type === 'BULLISH_BOS') {
        score += 0.2 * smcFeatures.breakOfStructure.strength;
      } else {
        score -= 0.2 * smcFeatures.breakOfStructure.strength;
      }
    }

    // Order blocks influence
    const bullishBlocks = smcFeatures?.orderBlocks?.filter(b => b.type === 'BULLISH').length;
    const bearishBlocks = smcFeatures?.orderBlocks?.filter(b => b.type === 'BEARISH').length;
    if (bullishBlocks + bearishBlocks > 0) {
      score += 0.15 * ((bullishBlocks - bearishBlocks) / (bullishBlocks + bearishBlocks));
    }

    // Fair Value Gaps (unfilled gaps can be bullish or bearish based on direction)
    const unfilledGaps = smcFeatures?.fairValueGaps?.filter(g => !g.filled);
    if ((unfilledGaps?.length || 0) > 0) {
      const avgFillProb = unfilledGaps.reduce((sum, g) => sum + g.fillProbability, 0) / unfilledGaps.length;
      score += (avgFillProb - 0.5) * 0.1; // Subtle adjustment
    }

    // Liquidity zones
    const accumulationZones = smcFeatures?.liquidityZones?.filter(z => z.type === 'ACCUMULATION').length;
    const distributionZones = smcFeatures?.liquidityZones?.filter(z => z.type === 'DISTRIBUTION').length;
    if (accumulationZones + distributionZones > 0) {
      score += 0.1 * ((accumulationZones - distributionZones) / (accumulationZones + distributionZones));
    }

    // Clamp score to [0, 1]
    score = Math.max(0, Math.min(1, score));

    return {
      detector: 'SMC',
      score,
      meta: {
        bos: smcFeatures.breakOfStructure.detected,
        bosType: smcFeatures.breakOfStructure.type,
        orderBlocks: { bullish: bullishBlocks, bearish: bearishBlocks },
        fvgCount: unfilledGaps.length,
        liquidityZones: { accumulation: accumulationZones, distribution: distributionZones }
      }
    };
  } catch (error: any) {
    // Fallback on error
    return { detector: 'SMC', score: 0.5, meta: { error: error.message } };
  }
}

/**
 * Analyze Elliott Wave patterns and return normalized score
 */
export function analyzeElliott(ohlc: OHLC[]): DetectorScore {
  if (ohlc.length < 20) {
    return { detector: 'Elliott', score: 0.5, meta: { reason: 'insufficient_data' } };
  }

  try {
    const elliottAnalyzer = ElliottWaveAnalyzer.getInstance();
    const marketData = ohlcToMarketData(ohlc);
    const elliottFeatures = elliottAnalyzer.analyzeElliottWaves(marketData);

    let score = 0.5; // neutral baseline

    // Wave type and direction
    if (elliottFeatures.currentWave.type === 'IMPULSE') {
      // Impulse waves are stronger signals
      score += 0.1;
    }

    // Expected direction
    if (elliottFeatures.nextExpectedDirection === 'UP') {
      score += 0.2 * elliottFeatures.completionProbability;
    } else if (elliottFeatures.nextExpectedDirection === 'DOWN') {
      score -= 0.2 * elliottFeatures.completionProbability;
    }

    // Completion probability (higher means more reliable)
    score += (elliottFeatures.completionProbability - 0.5) * 0.2;

    // Clamp score to [0, 1]
    score = Math.max(0, Math.min(1, score));

    return {
      detector: 'Elliott',
      score,
      meta: {
        waveType: elliottFeatures.currentWave.type,
        wave: elliottFeatures.currentWave.wave,
        direction: elliottFeatures.nextExpectedDirection,
        completionProb: elliottFeatures.completionProbability
      }
    };
  } catch (error: any) {
    // Fallback on error
    return { detector: 'Elliott', score: 0.5, meta: { error: error.message } };
  }
}

/**
 * Analyze Harmonic patterns and return normalized score
 */
export function analyzeHarmonic(ohlc: OHLC[]): DetectorScore {
  if (ohlc.length < 20) {
    return { detector: 'Harmonic', score: 0.5, meta: { reason: 'insufficient_data' } };
  }

  try {
    const harmonicDetector = HarmonicPatternDetector.getInstance();
    const marketData = ohlcToMarketData(ohlc);
    const patterns = harmonicDetector.detectHarmonicPatterns(marketData);

    if (patterns.length === 0) {
      return { detector: 'Harmonic', score: 0.5, meta: { patterns: [] } };
    }

    // Use the most reliable pattern
    const bestPattern = patterns.reduce((best, current) =>
      current.reliabilityScore > best.reliabilityScore ? current : best
    );

    // Normalize score based on pattern reliability and completion
    let score = 0.5 + (bestPattern.reliabilityScore - 0.5) * 0.3;
    score += (bestPattern.completionProbability - 0.5) * 0.2;

    // PRZ confluence adds weight
    score += (bestPattern.prz.confluence - 0.5) * 0.2;

    // Clamp score to [0, 1]
    score = Math.max(0, Math.min(1, score));

    return {
      detector: 'Harmonic',
      score,
      meta: {
        patternType: bestPattern.type,
        reliability: bestPattern.reliabilityScore,
        completion: bestPattern.completionProbability,
        przConfluence: bestPattern.prz.confluence,
        patternCount: patterns.length
      }
    };
  } catch (error: any) {
    // Fallback on error
    return { detector: 'Harmonic', score: 0.5, meta: { error: error.message } };
  }
}
