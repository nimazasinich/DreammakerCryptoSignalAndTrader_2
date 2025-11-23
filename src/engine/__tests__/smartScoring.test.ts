/**
 * Smart Scoring Engine Tests
 *
 * Tests for HTS category-level scoring and adaptive weighting functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { aggregateScores, DEFAULT_WEIGHTS } from '../scoreAggregator';
import { CoreSignal, LayerScore, PatternScores, SentimentScores, MLScore } from '../../types/signals';

describe('HTS Smart Scoring Engine', () => {
  // Mock components
  let mockCore: CoreSignal;
  let mockSMC: LayerScore;
  let mockPatterns: PatternScores;
  let mockSentiment: SentimentScores;
  let mockML: MLScore;

  beforeEach(() => {
    mockCore = {
      action: 'BUY',
      strength: 0.8,
      confidence: 0.75,
      score: 0.75,
      reasons: ['RSI oversold', 'MACD bullish']
    };

    mockSMC = {
      score: 0.7,
      reasons: ['Order block detected', 'FVG present']
    };

    mockPatterns = {
      elliott: { score: 0.6, reasons: ['Wave 3 detected'] },
      harmonic: { score: 0.65, reasons: ['Gartley pattern'] },
      classical: { score: 0.55, reasons: ['Head and shoulders'] },
      combined: { score: 0.6, reasons: ['Multiple patterns'] }
    };

    mockSentiment = {
      sentiment: { score: 0.5, reasons: ['Neutral Fear&Greed'] },
      news: { score: 0.6, reasons: ['Positive news'] },
      whales: { score: 0.4, reasons: ['Low whale activity'] },
      combined: { score: 0.5, reasons: ['Mixed sentiment'] }
    };

    mockML = {
      score: 0.65,
      reasons: ['ML prediction: bullish']
    };
  });

  describe('Category-Level Scoring', () => {
    it('should calculate category scores correctly', () => {
      const result = aggregateScores(mockCore, mockSMC, mockPatterns, mockSentiment, mockML);

      // Should have category scores
      expect(result.categoryScores).toBeDefined();
      expect(result.categoryScores?.length).toBe(5);

      // Check all categories are present
      const categoryNames = result.categoryScores?.map(c => c.name) || [];
      expect(categoryNames).toContain('core');
      expect(categoryNames).toContain('smc');
      expect(categoryNames).toContain('patterns');
      expect(categoryNames).toContain('sentiment');
      expect(categoryNames).toContain('ml');
    });

    it('should apply correct weights to each category', () => {
      const result = aggregateScores(mockCore, mockSMC, mockPatterns, mockSentiment, mockML);

      const coreCategory = result.categoryScores?.find(c => c.name === 'core');
      const smcCategory = result.categoryScores?.find(c => c.name === 'smc');
      const patternsCategory = result.categoryScores?.find(c => c.name === 'patterns');
      const sentimentCategory = result.categoryScores?.find(c => c.name === 'sentiment');
      const mlCategory = result.categoryScores?.find(c => c.name === 'ml');

      // Check weights match HTS structure (40/25/20/10/5)
      expect(coreCategory?.weight).toBeCloseTo(0.40, 2);
      expect(smcCategory?.weight).toBeCloseTo(0.25, 2);
      expect(patternsCategory?.weight).toBeCloseTo(0.20, 2);
      expect(sentimentCategory?.weight).toBeCloseTo(0.10, 2);
      expect(mlCategory?.weight).toBeCloseTo(0.05, 2);
    });

    it('should calculate weighted scores correctly', () => {
      const result = aggregateScores(mockCore, mockSMC, mockPatterns, mockSentiment, mockML);

      const coreCategory = result.categoryScores?.find(c => c.name === 'core');

      // weightedScore should = rawScore * weight
      const expectedWeighted = coreCategory!.rawScore * coreCategory!.weight;
      expect(coreCategory?.weightedScore).toBeCloseTo(expectedWeighted, 5);
    });

    it('should compute finalStrategyScore from category aggregation', () => {
      const result = aggregateScores(mockCore, mockSMC, mockPatterns, mockSentiment, mockML);

      // finalStrategyScore should be sum of all weighted scores
      const sumWeighted = result.categoryScores?.reduce((sum, cat) => sum + cat.weightedScore, 0) || 0;

      expect(result.finalStrategyScore).toBeDefined();
      expect(result.finalStrategyScore).toBeCloseTo(sumWeighted, 5);
    });

    it('should keep finalStrategyScore in [0, 1] range', () => {
      const result = aggregateScores(mockCore, mockSMC, mockPatterns, mockSentiment, mockML);

      expect(result.finalStrategyScore).toBeGreaterThanOrEqual(0);
      expect(result.finalStrategyScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Backward Compatibility', () => {
    it('should still calculate legacy finalScore', () => {
      const result = aggregateScores(mockCore, mockSMC, mockPatterns, mockSentiment, mockML);

      // Legacy finalScore should still exist
      expect(result.finalScore).toBeDefined();

      // Should match manual calculation
      const expectedLegacy =
        DEFAULT_WEIGHTS.core * mockCore.score +
        DEFAULT_WEIGHTS.smc * mockSMC.score +
        DEFAULT_WEIGHTS.patterns * mockPatterns.combined.score +
        DEFAULT_WEIGHTS.sentiment * mockSentiment.combined.score +
        DEFAULT_WEIGHTS.ml * mockML.score;

      expect(result.finalScore).toBeCloseTo(expectedLegacy, 5);
    });

    it('should maintain existing components structure', () => {
      const result = aggregateScores(mockCore, mockSMC, mockPatterns, mockSentiment, mockML);

      expect(result.components).toBeDefined();
      expect(result.components.core).toEqual(mockCore);
      expect(result.components.smc).toEqual(mockSMC);
      expect(result.components.patterns).toEqual(mockPatterns);
      expect(result.components.sentiment).toEqual(mockSentiment);
      expect(result.components.ml).toEqual(mockML);
      expect(result.components.aux).toBeDefined();
    });
  });

  describe('Action Determination', () => {
    it('should determine BUY action correctly', () => {
      // Set all scores high to trigger BUY
      mockCore.action = 'BUY';
      mockCore.score = 0.9;
      mockSMC.score = 0.9;
      mockPatterns.combined.score = 0.9;
      mockSentiment.combined.score = 0.9;
      mockML.score = 0.9;

      const result = aggregateScores(mockCore, mockSMC, mockPatterns, mockSentiment, mockML);

      expect(result.action).toBe('BUY');
    });

    it('should determine SELL action correctly', () => {
      // Set all scores low to trigger SELL
      mockCore.action = 'SELL';
      mockCore.score = 0.2;
      mockSMC.score = 0.2;
      mockPatterns.combined.score = 0.2;
      mockSentiment.combined.score = 0.2;
      mockML.score = 0.2;

      // Use custom thresholds where sell threshold is appropriate
      const result = aggregateScores(
        mockCore,
        mockSMC,
        mockPatterns,
        mockSentiment,
        mockML,
        DEFAULT_WEIGHTS,
        { buy: 0.70, sell: 0.30 } // sell threshold is 0.30 (not 0.70)
      );

      // With score of 0.2, which is < 0.30, and core.action = 'SELL', should be SELL
      expect(result.action).toBe('SELL');
    });

    it('should determine HOLD action for neutral scores', () => {
      // Set all scores neutral
      mockCore.action = 'HOLD';
      mockCore.score = 0.5;
      mockSMC.score = 0.5;
      mockPatterns.combined.score = 0.5;
      mockSentiment.combined.score = 0.5;
      mockML.score = 0.5;

      const result = aggregateScores(mockCore, mockSMC, mockPatterns, mockSentiment, mockML);

      expect(result.action).toBe('HOLD');
    });
  });

  describe('Effective Weights', () => {
    it('should expose effectiveWeights', () => {
      const result = aggregateScores(mockCore, mockSMC, mockPatterns, mockSentiment, mockML);

      expect(result.effectiveWeights).toBeDefined();
      expect(result.effectiveWeights?.categories).toBeDefined();
      expect(result.effectiveWeights?.isAdaptive).toBeDefined();
    });

    it('should mark as non-adaptive when adaptive is disabled', () => {
      const result = aggregateScores(mockCore, mockSMC, mockPatterns, mockSentiment, mockML);

      // Adaptive should be disabled by default (config has enabled: false)
      expect(result.effectiveWeights?.isAdaptive).toBe(false);
    });
  });

  describe('Confidence Calculation', () => {
    it('should calculate confidence based on component agreement', () => {
      const result = aggregateScores(mockCore, mockSMC, mockPatterns, mockSentiment, mockML);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should have higher confidence when all scores agree', () => {
      // All scores high
      mockCore.score = 0.8;
      mockSMC.score = 0.8;
      mockPatterns.combined.score = 0.8;
      mockSentiment.combined.score = 0.8;
      mockML.score = 0.8;

      const highAgreement = aggregateScores(mockCore, mockSMC, mockPatterns, mockSentiment, mockML);

      // All scores divergent
      mockCore.score = 0.9;
      mockSMC.score = 0.1;
      mockPatterns.combined.score = 0.5;
      mockSentiment.combined.score = 0.7;
      mockML.score = 0.3;

      const lowAgreement = aggregateScores(mockCore, mockSMC, mockPatterns, mockSentiment, mockML);

      // High agreement should have higher confidence
      expect(highAgreement.confidence).toBeGreaterThan(lowAgreement.confidence);
    });
  });

  describe('Category Weights Sum', () => {
    it('should have category weights sum to approximately 1.0', () => {
      const result = aggregateScores(mockCore, mockSMC, mockPatterns, mockSentiment, mockML);

      const weightSum = result.categoryScores?.reduce((sum, cat) => sum + cat.weight, 0) || 0;

      expect(weightSum).toBeCloseTo(1.0, 2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero scores gracefully', () => {
      mockCore.score = 0;
      mockSMC.score = 0;
      mockPatterns.combined.score = 0;
      mockSentiment.combined.score = 0;
      mockML.score = 0;

      const result = aggregateScores(mockCore, mockSMC, mockPatterns, mockSentiment, mockML);

      expect(result.finalStrategyScore).toBe(0);
      expect(result.action).toBe('HOLD');
    });

    it('should handle max scores gracefully', () => {
      mockCore.score = 1;
      mockCore.action = 'BUY';
      mockSMC.score = 1;
      mockPatterns.combined.score = 1;
      mockSentiment.combined.score = 1;
      mockML.score = 1;

      const result = aggregateScores(mockCore, mockSMC, mockPatterns, mockSentiment, mockML);

      expect(result.finalStrategyScore).toBeCloseTo(1, 5);
      expect(result.action).toBe('BUY');
    });
  });
});
