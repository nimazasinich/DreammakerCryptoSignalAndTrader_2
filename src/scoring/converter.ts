/**
 * CONSTITUTIONAL CONVERTER
 * Migration paths for legacy detector outputs to Quantum Score format
 */

import { ConstitutionalDetectorOutput, DetectorName, QuantumScore } from './types.js';
import { HarmonicPattern } from '../types/index.js';
import { ElliottWaveAnalysis } from '../types/index.js';
import { SmartMoneyFeatures } from '../types/index.js';
import { SentimentData } from '../types/index.js';

/**
 * Constitutional Converter
 * Converts all detector outputs to constitutional format
 */
export class ConstitutionalConverter {
  /**
   * Convert probability systems (0..1) to signed quantum score (-1..+1)
   */
  static probabilityToSigned(
    prob: number, 
    isBullish: boolean
  ): QuantumScore {
    // Clamp probability to [0, 1]
    const clamped = Math.max(0, Math.min(1, prob));
    
    // Convert to signed range: 0..1 -> -1..+1
    const signed = (2 * clamped) - 1;
    
    // Apply direction
    return isBullish ? signed : -signed;
  }

  /**
   * Convert boolean systems to moderate conviction quantum score
   */
  static booleanToSigned(
    isBullish: boolean, 
    confidence: number = 0.7
  ): QuantumScore {
    const clampedConfidence = Math.max(0, Math.min(1, confidence));
    return isBullish ? clampedConfidence : -clampedConfidence;
  }

  /**
   * Convert confidence systems to scaled quantum score
   */
  static confidenceToSigned(
    confidence: number, 
    direction: 'bull' | 'bear' | 'neutral'
  ): QuantumScore {
    const clamped = Math.max(0, Math.min(1, confidence));
    
    if (direction === 'bull') return clamped;
    if (direction === 'bear') return -clamped;
    return 0;
  }

  /**
   * Convert -100..+100 scale to quantum score
   */
  static scale100ToSigned(value: number): QuantumScore {
    return Math.max(-1, Math.min(1, value / 100));
  }

  /**
   * Convert Harmonic Pattern to constitutional output
   */
  static convertHarmonic(
    pattern: HarmonicPattern | HarmonicPattern[]
  ): ConstitutionalDetectorOutput {
    const patterns = Array.isArray(pattern) ? pattern : [pattern];
    
    if (patterns.length === 0) {
      return {
        score: 0,
        meta: { patterns: 0 },
        detector: 'harmonic',
        timestamp: Date.now(),
        confidence: 0
      };
    }

    // Get the most reliable pattern
    const bestPattern = patterns.reduce((best, current) => 
      current.reliabilityScore > best.reliabilityScore ? current : best
    );

    // Determine direction based on pattern type and completion
    // Bullish patterns: completed at D point, bearish at reversal zones
    const isBullish = bestPattern.type === 'GARTLEY' || 
                     bestPattern.type === 'BAT' ||
                     bestPattern.completionProbability > 0.7;

    // Convert completion probability to quantum score
    const score = this.probabilityToSigned(
      bestPattern.completionProbability * bestPattern.reliabilityScore,
      isBullish
    );

    return {
      score,
      meta: {
        pattern: bestPattern.type,
        reliability: bestPattern.reliabilityScore,
        completionProb: bestPattern.completionProbability,
        prz: bestPattern.prz,
        patternsFound: patterns.length
      },
      detector: 'harmonic',
      timestamp: Date.now(),
      confidence: bestPattern.reliabilityScore
    };
  }

  /**
   * Convert Elliott Wave Analysis to constitutional output
   */
  static convertElliott(
    analysis: ElliottWaveAnalysis
  ): ConstitutionalDetectorOutput {
    // Determine direction from next expected direction
    let isBullish = false;
    let directionStrength = 0.5;

    if (analysis.nextExpectedDirection === 'UP') {
      isBullish = true;
      directionStrength = analysis.completionProbability;
    } else if (analysis.nextExpectedDirection === 'DOWN') {
      isBullish = false;
      directionStrength = analysis.completionProbability;
    } else {
      // SIDEWAYS - neutral
      return {
        score: 0,
        meta: {
          wave: analysis.currentWave.wave,
          type: analysis.currentWave.type,
          completionProb: analysis.completionProbability
        },
        detector: 'elliott',
        timestamp: Date.now(),
        confidence: analysis.completionProbability
      };
    }

    const score = this.probabilityToSigned(directionStrength, isBullish);

    return {
      score,
      meta: {
        wave: analysis.currentWave.wave,
        type: analysis.currentWave.type,
        degree: analysis.currentWave.degree,
        completionProb: analysis.completionProbability,
        waveStructure: analysis.waveStructure.length
      },
      detector: 'elliott',
      timestamp: Date.now(),
      confidence: analysis.completionProbability
    };
  }

  /**
   * Convert SMC Features to constitutional output
   */
  static convertSMC(
    features: SmartMoneyFeatures
  ): ConstitutionalDetectorOutput {
    let score: QuantumScore = 0;
    let confidence = 0.5;

    // Break of Structure has highest weight
    if (features.breakOfStructure.detected) {
      const bosStrength = Math.min(1, features.breakOfStructure.strength);
      score = features.breakOfStructure.type === 'BULLISH_BOS' 
        ? bosStrength 
        : -bosStrength;
      confidence = 0.8;
    }

    // Order blocks contribute to confidence
    const bullishBlocks = features?.orderBlocks?.filter(b => b.type === 'BULLISH').length;
    const bearishBlocks = features?.orderBlocks?.filter(b => b.type === 'BEARISH').length;
    
    if (bullishBlocks > bearishBlocks) {
      score = Math.max(score, score * 0.3 + 0.3); // Boost bullish
    } else if (bearishBlocks > bullishBlocks) {
      score = Math.min(score, score * 0.3 - 0.3); // Boost bearish
    }

    // Liquidity zones
    const accumulationZones = features?.liquidityZones?.filter(z => z.type === 'ACCUMULATION').length;
    const distributionZones = features?.liquidityZones?.filter(z => z.type === 'DISTRIBUTION').length;
    
    if (accumulationZones > distributionZones) {
      score = Math.max(score, score * 0.2 + 0.2);
    } else if (distributionZones > accumulationZones) {
      score = Math.min(score, score * 0.2 - 0.2);
    }

    // Clamp to valid range
    score = Math.max(-1, Math.min(1, score));

    return {
      score,
      meta: {
        bosDetected: features.breakOfStructure.detected,
        bosType: features.breakOfStructure.type,
        orderBlocks: features.orderBlocks.length,
        liquidityZones: features.liquidityZones.length,
        fairValueGaps: features.fairValueGaps.length
      },
      detector: 'smc',
      timestamp: Date.now(),
      confidence
    };
  }

  /**
   * Convert Sentiment Data to constitutional output
   */
  static convertSentiment(
    sentiment: SentimentData
  ): ConstitutionalDetectorOutput {
    // Convert -100..+100 scale to quantum score
    const score = this.scale100ToSigned(sentiment.overallScore);

    // Confidence based on velocity and momentum
    const confidence = Math.min(1, 
      (Math.abs(sentiment.overallScore) / 100) * 0.7 + 
      (Math.abs(sentiment.momentum) / 100) * 0.3
    );

    return {
      score,
      meta: {
        overallScore: sentiment.overallScore,
        velocity: sentiment.velocity,
        momentum: sentiment.momentum,
        sources: sentiment.sources,
        newsImpact: sentiment.newsImpact.length
      },
      detector: 'sentiment',
      timestamp: sentiment.timestamp,
      confidence
    };
  }

  /**
   * Convert Whale Activity to constitutional output
   */
  static convertWhales(
    whaleActivity: any // WhaleActivity type
  ): ConstitutionalDetectorOutput {
    // Net flow determines direction
    const netFlow = whaleActivity.exchangeFlows?.netFlow || 0;
    
    // Normalize to quantum score (assume netFlow is in reasonable range)
    const normalizedFlow = Math.max(-1, Math.min(1, netFlow / 1000000)); // Adjust divisor based on actual range
    
    const largeTransactions = whaleActivity.largeTransactions?.length || 0;
    const confidence = Math.min(1, largeTransactions / 10); // 10 transactions = max confidence

    return {
      score: normalizedFlow,
      meta: {
        netFlow,
        largeTransactions,
        exchangeFlows: whaleActivity.exchangeFlows,
        onChainMetrics: whaleActivity.onChainMetrics
      },
      detector: 'whales',
      timestamp: whaleActivity.timestamp || Date.now(),
      confidence
    };
  }

  /**
   * Convert Price Action (boolean/trend) to constitutional output
   */
  static convertPriceAction(
    isBullish: boolean,
    confidence: number = 0.7
  ): ConstitutionalDetectorOutput {
    return {
      score: this.booleanToSigned(isBullish, confidence),
      meta: {
        trend: isBullish ? 'BULLISH' : 'BEARISH'
      },
      detector: 'price_action',
      timestamp: Date.now(),
      confidence
    };
  }

  /**
   * Convert Fibonacci Retracement to constitutional output
   */
  static convertFibonacci(
    level: number, // Fibonacci level (0.236, 0.382, 0.5, 0.618, 0.786)
    isBullish: boolean,
    confidence: number = 0.6
  ): ConstitutionalDetectorOutput {
    // Stronger signal near key levels
    const levelStrength = Math.abs(level - 0.618) < 0.1 ? 0.9 : 
                          Math.abs(level - 0.5) < 0.1 ? 0.8 : 0.6;
    
    const score = this.probabilityToSigned(
      levelStrength * confidence,
      isBullish
    );

    return {
      score,
      meta: {
        fibonacciLevel: level,
        levelStrength
      },
      detector: 'fibonacci',
      timestamp: Date.now(),
      confidence
    };
  }

  /**
   * Convert SAR (Stop and Reverse) to constitutional output
   */
  static convertSAR(
    isBullish: boolean,
    confidence: number = 0.75
  ): ConstitutionalDetectorOutput {
    return {
      score: this.booleanToSigned(isBullish, confidence),
      meta: {
        signal: isBullish ? 'BULLISH' : 'BEARISH'
      },
      detector: 'sar',
      timestamp: Date.now(),
      confidence
    };
  }

  /**
   * Convert News Sentiment to constitutional output
   */
  static convertNews(
    newsImpact: Array<{ impact: number }>,
    baseSentiment: number = 0
  ): ConstitutionalDetectorOutput {
    if (newsImpact.length === 0) {
      return {
        score: 0,
        meta: { newsCount: 0 },
        detector: 'news',
        timestamp: Date.now(),
        confidence: 0
      };
    }

    // Aggregate news impact
    const avgImpact = newsImpact.reduce((sum, item) => sum + item.impact, 0) / newsImpact.length;
    const score = this.scale100ToSigned(avgImpact + baseSentiment);

    return {
      score,
      meta: {
        newsCount: newsImpact.length,
        avgImpact
      },
      detector: 'news',
      timestamp: Date.now(),
      confidence: Math.min(1, newsImpact.length / 5) // Max confidence at 5+ news items
    };
  }
}
