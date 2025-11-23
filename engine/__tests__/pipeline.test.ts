import { describe, it, expect } from '@jest/globals';
import { runStrategyPipeline } from '../pipeline';
import { aggregateScores, DEFAULT_WEIGHTS } from '../scoreAggregator';
import { Bar, CoreSignal } from '../../types/signals';

describe('HTS Strategy Pipeline Tests', () => {
  const mockBars: Bar[] = Array.from({ length: 100 }, (_, i) => ({
    timestamp: Date.now() - (100 - i) * 3600000,
    open: 100 + Math.sin(i / 10) * 5,
    high: 105 + Math.sin(i / 10) * 5,
    low: 95 + Math.sin(i / 10) * 5,
    close: 102 + Math.sin(i / 10) * 5,
    volume: 1000000 + Math.random() * 500000
  }));

  describe('Score Aggregator', () => {
    it('should aggregate scores with default weights', () => {
      const core: CoreSignal = {
        action: 'BUY',
        strength: 0.8,
        confidence: 0.75,
        score: 0.75,
        reasons: ['bullish EMA trend']
      };

      const smc = { score: 0.6, reasons: ['structure bias up'] };
      const patterns = {
        elliott: { score: 0.5, reasons: ['5-wave pattern'] },
        harmonic: { score: 0.4, reasons: ['XABCD structure'] },
        classical: { score: 0.3, reasons: ['consolidation'] },
        combined: { score: 0.45, reasons: ['pattern signals'] }
      };
      const sentiment = {
        sentiment: { score: 0.5, reasons: ['neutral'] },
        news: { score: 0.5, reasons: ['neutral'] },
        whales: { score: 0.5, reasons: ['neutral'] },
        combined: { score: 0.5, reasons: ['neutral overall'] }
      };
      const ml = { score: 0.6, reasons: ['moderate confidence'] };

      const result = aggregateScores(core, smc, patterns, sentiment, ml);

      expect(result.finalScore).toBeGreaterThanOrEqual(0);
      expect(result.finalScore).toBeLessThanOrEqual(1);
      expect(result.action).toBe('BUY');
      expect(result.components.core).toEqual(core);
      expect(result.components.smc).toEqual(smc);
    });

    it('should respect custom thresholds', () => {
      const core: CoreSignal = {
        action: 'BUY',
        strength: 0.6,
        confidence: 0.65,
        score: 0.65,
        reasons: ['moderate bullish']
      };

      const smc = { score: 0.5, reasons: ['neutral'] };
      const patterns = {
        elliott: { score: 0.5, reasons: [] },
        harmonic: { score: 0.5, reasons: [] },
        classical: { score: 0.5, reasons: [] },
        combined: { score: 0.5, reasons: [] }
      };
      const sentiment = {
        sentiment: { score: 0.5, reasons: [] },
        news: { score: 0.5, reasons: [] },
        whales: { score: 0.5, reasons: [] },
        combined: { score: 0.5, reasons: [] }
      };
      const ml = { score: 0.5, reasons: [] };

      // Lower threshold should allow BUY
      const lowThreshold = aggregateScores(core, smc, patterns, sentiment, ml, DEFAULT_WEIGHTS, {
        buy: 0.5,
        sell: 0.5
      });
      expect(lowThreshold.action).toBe('BUY');

      // Higher threshold should result in HOLD
      const highThreshold = aggregateScores(core, smc, patterns, sentiment, ml, DEFAULT_WEIGHTS, {
        buy: 0.9,
        sell: 0.9
      });
      expect(highThreshold.action).toBe('HOLD');
    });

    it('should handle SELL signals correctly', () => {
      const core: CoreSignal = {
        action: 'SELL',
        strength: 0.8,
        confidence: 0.8,
        score: 0.8,
        reasons: ['bearish trend']
      };

      const smc = { score: 0.7, reasons: ['bearish structure'] };
      const patterns = {
        elliott: { score: 0.6, reasons: [] },
        harmonic: { score: 0.6, reasons: [] },
        classical: { score: 0.6, reasons: [] },
        combined: { score: 0.6, reasons: [] }
      };
      const sentiment = {
        sentiment: { score: 0.5, reasons: [] },
        news: { score: 0.5, reasons: [] },
        whales: { score: 0.5, reasons: [] },
        combined: { score: 0.5, reasons: [] }
      };
      const ml = { score: 0.6, reasons: [] };

      const result = aggregateScores(core, smc, patterns, sentiment, ml);
      expect(result.action).toBe('SELL');
    });
  });

  describe('Pipeline Integration', () => {
    it('should run full pipeline and return decision', async () => {
      const decision = await runStrategyPipeline(mockBars, 'BTC-USDT');

      expect(decision).toBeDefined();
      expect(decision.finalScore).toBeGreaterThanOrEqual(0);
      expect(decision.finalScore).toBeLessThanOrEqual(1);
      expect(['BUY', 'SELL', 'HOLD']).toContain(decision.action);
      expect(decision.components.core).toBeDefined();
      expect(decision.components.smc).toBeDefined();
      expect(decision.components.patterns).toBeDefined();
      expect(decision.components.sentiment).toBeDefined();
      expect(decision.components.ml).toBeDefined();
    });

    it('should handle insufficient data gracefully', async () => {
      const shortBars: Bar[] = mockBars.slice(0, 10);
      const decision = await runStrategyPipeline(shortBars, 'BTC-USDT');

      expect(decision).toBeDefined();
      expect(decision.action).toBe('HOLD');
      expect(decision.components.core.reasons).toContain('insufficient data');
    });

    it('should include all detector reasons', async () => {
      const decision = await runStrategyPipeline(mockBars, 'BTC-USDT');

      expect(decision.components.core.reasons.length).toBeGreaterThan(0);
      expect(decision.components.smc.reasons.length).toBeGreaterThan(0);
      expect(decision.components.patterns.combined.reasons.length).toBeGreaterThan(0);
      expect(decision.components.sentiment.combined.reasons.length).toBeGreaterThan(0);
      expect(decision.components.ml.reasons.length).toBeGreaterThan(0);
    });

    it('should respect mode awareness (offline)', async () => {
      // In offline mode, sentiment/news/whales should return neutral/placeholder
      const decision = await runStrategyPipeline(mockBars, 'BTC-USDT');

      // Sentiment layers should be neutral in offline mode
      expect(decision.components.sentiment.sentiment.score).toBe(0.5);
      expect(decision.components.sentiment.news.score).toBe(0.5);
      expect(decision.components.sentiment.whales.score).toBe(0.5);
    });
  });

  describe('Weight Configuration', () => {
    it('should use default HTS weights (core:0.4, smc:0.25, patterns:0.2, sentiment:0.1, ml:0.05)', () => {
      expect(DEFAULT_WEIGHTS.core).toBe(0.40);
      expect(DEFAULT_WEIGHTS.smc).toBe(0.25);
      expect(DEFAULT_WEIGHTS.patterns).toBe(0.20);
      expect(DEFAULT_WEIGHTS.sentiment).toBe(0.10);
      expect(DEFAULT_WEIGHTS.ml).toBe(0.05);

      // Weights should sum to 1.0
      const sum = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    });
  });
});
