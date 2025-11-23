import { Bar, LayerScore } from '../types/signals';
import { ElliottWaveAnalyzer } from '../services/ElliottWaveAnalyzer';
import { Logger } from '../core/Logger';

/**
 * Elliott Wave Detector - Real Elliott Wave analysis
 *
 * Elliott Wave Theory:
 * - Impulse waves (1-2-3-4-5): Trend movement
 *   - Wave 1: Initial push
 *   - Wave 2: Correction (38.2%-61.8% retracement)
 *   - Wave 3: Strongest wave (typically 1.618x Wave 1)
 *   - Wave 4: Consolidation (doesn't overlap Wave 1)
 *   - Wave 5: Final push (often equal to Wave 1)
 *
 * - Corrective waves (A-B-C): Counter-trend movement
 *   - Wave A: Initial correction
 *   - Wave B: Bounce
 *   - Wave C: Final correction (often 1.618x Wave A)
 *
 * Fibonacci Ratios for Validation:
 * - Wave 2: 38.2%, 50%, 61.8% of Wave 1
 * - Wave 3: 1.618x, 2.618x Wave 1
 * - Wave 4: 23.6%, 38.2% of Wave 3
 * - Wave C: 1.0x, 1.618x Wave A
 *
 * Score Interpretation:
 * - 0.0-0.3: Strong Bearish Wave (corrective or downward impulse)
 * - 0.3-0.45: Weak Bearish Wave
 * - 0.45-0.55: No Clear Wave / Choppy
 * - 0.55-0.7: Weak Bullish Wave (early impulse)
 * - 0.7-0.85: Strong Bullish Wave (Wave 3 or 5)
 * - 0.85-1.0: Very Strong Bullish Wave (Wave 3 confirmed)
 */
export function detectElliott(ohlcv: Bar[]): LayerScore {
  if (ohlcv.length < 100) {
    return { score: 0.0, reasons: ['Insufficient data for Elliott Wave (need 100+ bars)'] };
  }

  const logger = Logger.getInstance();
  const analyzer = ElliottWaveAnalyzer.getInstance();

  try {
    logger.debug('Analyzing Elliott Waves', { bars: ohlcv.length });

    // Convert Bar[] to MarketData[] by adding symbol property
    const marketData = ohlcv.map(bar => ({ ...bar, symbol: 'UNKNOWN' }));

    // Detect waves using the dedicated analyzer service
    const waveData = analyzer.analyzeElliottWaves(marketData);

    if (!waveData || !waveData.currentWave || !waveData.currentWave.wave) {
      logger.warn('No clear Elliott Wave structure detected');
      return {
        score: 0.5,
        reasons: ['No clear wave structure', 'Market may be choppy', 'Wait for clearer pattern']
      };
    }

    let score = 0.5; // neutral baseline
    const reasons: string[] = [];

    // ========== IMPULSE WAVES (1-5) ==========

    if (waveData.currentWave.type === 'IMPULSE') {
      const currentWave = waveData.currentWave.wave;

      if (currentWave === '1') {
        // Wave 1: Initial trend formation
        score = 0.65;
        reasons.push('Wave 1 detected (early trend)');

        // Determine direction from nextExpectedDirection
        if (waveData.nextExpectedDirection === 'UP') {
          reasons.push('Bullish impulse starting');
        } else if (waveData.nextExpectedDirection === 'DOWN') {
          score = 1 - score; // Invert for bearish
          reasons.push('Bearish impulse starting');
        }
      }

      else if (currentWave === '2') {
        // Wave 2: Retracement (correction of Wave 1)
        score = 0.45;
        reasons.push('Wave 2 correction (pullback)');

        // Use completionProbability as proxy for Fibonacci validation
        if ((waveData.completionProbability || 0) > 0.5) {
          reasons.push('Fib retracement valid (38.2%-61.8%)');
          score += 0.05; // Slight boost for valid retracement
        }

        if (waveData.nextExpectedDirection === 'UP') {
          reasons.push('Expect Wave 3 bullish continuation');
        } else if (waveData.nextExpectedDirection === 'DOWN') {
          score = 1 - score;
          reasons.push('Expect Wave 3 bearish continuation');
        }
      }

      else if (currentWave === '3') {
        // Wave 3: STRONGEST WAVE - Most profitable
        score = 0.85;
        reasons.push('Wave 3 in progress (STRONGEST)');

        if ((waveData.completionProbability || 0) > 0.7) {
          score = 0.9; // Maximum confidence
          reasons.push('Wave 3 Fib confirmed (1.618x-2.618x Wave 1)');
        }

        if (waveData.nextExpectedDirection === 'UP') {
          reasons.push('Strong bullish momentum');
        } else if (waveData.nextExpectedDirection === 'DOWN') {
          score = 1 - score;
          reasons.push('Strong bearish momentum');
        }
      }

      else if (currentWave === '4') {
        // Wave 4: Consolidation before final wave
        score = 0.55;
        reasons.push('Wave 4 consolidation');

        // Use completionProbability for rules validation
        if ((waveData.completionProbability || 0) > 0.5) {
          reasons.push('Wave 4 rules valid (no overlap)');
          score += 0.05;
        }

        if (waveData.nextExpectedDirection === 'UP') {
          reasons.push('Preparing for Wave 5 rally');
        } else if (waveData.nextExpectedDirection === 'DOWN') {
          score = 1 - score;
          reasons.push('Preparing for Wave 5 decline');
        }
      }

      else if (currentWave === '5') {
        // Wave 5: Final push (often weakest impulse wave)
        score = 0.70;
        reasons.push('Wave 5 detected (final impulse)');

        // Wave 5 often equals Wave 1 in length
        if ((waveData.completionProbability || 0) > 0.7) {
          reasons.push('Wave 5 extension confirmed');
        } else {
          reasons.push('Wave 5 may be ending soon');
        }

        if (waveData.nextExpectedDirection === 'UP') {
          reasons.push('Bullish finale (watch for reversal)');
        } else if (waveData.nextExpectedDirection === 'DOWN') {
          score = 1 - score;
          reasons.push('Bearish finale (watch for reversal)');
        }
      }
    }

    // ========== CORRECTIVE WAVES (A-B-C) ==========

    else if (waveData.currentWave.type === 'CORRECTIVE') {
      const currentWave = waveData.currentWave.wave;

      if (currentWave === 'A') {
        // Wave A: Initial correction against main trend
        score = 0.40;
        reasons.push('Wave A correction starting');

        if (waveData.nextExpectedDirection === 'UP') {
          // Correcting downward trend, bullish reversal ahead
          score = 0.55;
          reasons.push('Bullish reversal potential (ABC up)');
        } else if (waveData.nextExpectedDirection === 'DOWN') {
          // Correcting upward trend, bearish move
          score = 0.35;
          reasons.push('Bearish correction underway (ABC down)');
        }
      }

      else if (currentWave === 'B') {
        // Wave B: Counter-correction (fake breakout)
        score = 0.50;
        reasons.push('Wave B bounce (often a trap)');

        if (waveData.nextExpectedDirection === 'UP') {
          reasons.push('Expect Wave C down after bounce');
        } else if (waveData.nextExpectedDirection === 'DOWN') {
          reasons.push('Expect Wave C up after dip');
        }
      }

      else if (currentWave === 'C') {
        // Wave C: Final corrective move (often strongest)
        score = 0.30;
        reasons.push('Wave C completing (final correction)');

        if ((waveData.completionProbability || 0) > 0.7) {
          score = 0.25; // Strong correction confirmed
          reasons.push('Wave C Fib confirmed (1.0x-1.618x Wave A)');
        }

        if (waveData.nextExpectedDirection === 'UP') {
          // After bearish ABC, new bullish impulse starts
          score = 0.70;
          reasons.push('Bullish reversal imminent (ABC complete)');
        } else if (waveData.nextExpectedDirection === 'DOWN') {
          // After bullish ABC, new bearish impulse starts
          score = 0.25;
          reasons.push('Bearish move ending (prepare for reversal)');
        }
      }
    }

    // ========== WAVE STRENGTH ADJUSTMENT ==========

    // Use completionProbability as wave strength indicator
    const waveStrength = waveData.completionProbability || 0.5;
    if (waveStrength > 0.7) {
      if (score > 0.5) {
        score = Math.min(1.0, score + 0.05); // Boost bullish
      } else {
        score = Math.max(0.0, score - 0.05); // Boost bearish
      }
    }

    // High completion probability adds confidence
    if ((waveData.completionProbability || 0) > 0.7) {
      reasons.push('Wave pattern validated');
    }

    // Clamp to valid range
    score = Math.max(0, Math.min(1, score));

    logger.info('Elliott Wave analysis completed', {
      score: score.toFixed(3),
      pattern: waveData.currentWave.type,
      wave: waveData.currentWave.wave,
      direction: waveData.nextExpectedDirection,
      completion: waveData.completionProbability
    });

    return {
      score,
      reasons: reasons.slice(0, 3) // Top 3 most important wave signals
    };

  } catch (error) {
    logger.error('Elliott Wave analysis failed', error as Error);

    // Fallback to simple swing detection
    logger.warn('Falling back to simple wave detection');

    const last50 = ohlcv.slice(-50);
    const swings = [];

    // Simple swing detection
    for (let i = 2; i < last50.length - 2; i++) {
      const high = last50[i].high;
      const isSwingHigh = high > last50[i - 1].high && high > last50[i - 2].high &&
                          high > last50[i + 1].high && high > last50[i + 2].high;

      const low = last50[i].low;
      const isSwingLow = low < last50[i - 1].low && low < last50[i - 2].low &&
                         low < last50[i + 1].low && low < last50[i + 2].low;

      if (isSwingHigh) swings.push({ type: 'high', index: i, value: high });
      if (isSwingLow) swings.push({ type: 'low', index: i, value: low });
    }

    if (swings.length < 5) {
      return {
        score: 0.5,
        reasons: ['Wave analyzer unavailable', 'Insufficient swings', 'Neutral baseline']
      };
    }

    // Simplified scoring based on swing count
    const hasWaveStructure = (swings?.length || 0) >= 5;
    const simplifiedScore = hasWaveStructure ? 0.6 : 0.4;

    return {
      score: simplifiedScore,
      reasons: [
        'Wave analyzer unavailable',
        'Using simple swing detection',
        `${swings.length} swings detected`
      ]
    };
  }
}
