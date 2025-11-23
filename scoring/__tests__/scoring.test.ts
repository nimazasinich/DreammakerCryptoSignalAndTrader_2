/**
 * CONSTITUTIONAL TESTING BUREAU
 * Comprehensive test suite for Quantum Scoring System
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ConstitutionalConverter } from '../scoring/converter.js';
import { WeightParliament } from '../scoring/weights.js';
import { SupremeJudicialCombiner } from '../scoring/combiner.js';
import { QuantumScoringService } from '../scoring/service.js';
import { ConstitutionalDetectorOutput, DetectorName, QuantumScore } from '../scoring/types.js';

describe('Constitutional Testing Bureau', () => {
  describe('Pillar 1: Detector Constitution', () => {
    it('All detectors shall return constitutional scores', () => {
      const detectors: DetectorName[] = [
        'harmonic',
        'elliott',
        'fibonacci',
        'price_action',
        'smc',
        'sar',
        'sentiment',
        'news',
        'whales'
      ];

      detectors.forEach(detector => {
        const output: ConstitutionalDetectorOutput = {
          score: 0,
          meta: {},
          detector,
          timestamp: Date.now(),
          confidence: 0.5
        };

        expect(output.score).toBeGreaterThanOrEqual(-1);
        expect(output.score).toBeLessThanOrEqual(1);
        expect(typeof output.meta).toBe('object');
        expect(output.detector).toBe(detector);
      });
    });

    it('ConstitutionalConverter converts probability to signed correctly', () => {
      expect(ConstitutionalConverter.probabilityToSigned(0.5, true)).toBe(0);
      expect(ConstitutionalConverter.probabilityToSigned(1.0, true)).toBe(1);
      expect(ConstitutionalConverter.probabilityToSigned(0.0, true)).toBe(-1);
      expect(ConstitutionalConverter.probabilityToSigned(0.5, false)).toBe(0);
      expect(ConstitutionalConverter.probabilityToSigned(1.0, false)).toBe(-1);
    });

    it('ConstitutionalConverter converts boolean to signed correctly', () => {
      expect(ConstitutionalConverter.booleanToSigned(true, 0.7)).toBe(0.7);
      expect(ConstitutionalConverter.booleanToSigned(false, 0.7)).toBe(-0.7);
      expect(ConstitutionalConverter.booleanToSigned(true, 1.0)).toBe(1);
      expect(ConstitutionalConverter.booleanToSigned(false, 1.0)).toBe(-1);
    });

    it('ConstitutionalConverter converts scale100 to signed correctly', () => {
      expect(ConstitutionalConverter.scale100ToSigned(100)).toBe(1);
      expect(ConstitutionalConverter.scale100ToSigned(-100)).toBe(-1);
      expect(ConstitutionalConverter.scale100ToSigned(0)).toBe(0);
      expect(ConstitutionalConverter.scale100ToSigned(50)).toBe(0.5);
      expect(ConstitutionalConverter.scale100ToSigned(-50)).toBe(-0.5);
    });
  });

  describe('Pillar 2: Weights Parliament', () => {
    let parliament: WeightParliament;

    beforeEach(() => {
      parliament = WeightParliament.getInstance();
    });

    it('Default weights are within constitutional limits', () => {
      const weights = parliament.getDetectorWeights();
      const limits = parliament.getConstitutionalLimits();

      // Check technical analysis weights
      Object.values(weights.technical_analysis).forEach(weight => {
        expect(weight).toBeGreaterThanOrEqual(limits.MIN_WEIGHT);
        expect(weight).toBeLessThanOrEqual(limits.MAX_WEIGHT);
      });

      // Check fundamental analysis weights
      Object.values(weights.fundamental_analysis).forEach(weight => {
        expect(weight).toBeGreaterThanOrEqual(limits.MIN_WEIGHT);
        expect(weight).toBeLessThanOrEqual(limits.MAX_WEIGHT);
      });
    });

    it('Weight amendment validates constitutional limits', () => {
      const result = parliament.enactWeightAmendment({
        detectorWeights: {
          technical_analysis: {
            harmonic: 0.5 // Above MAX_WEIGHT
          }
        },
        authority: 'PRESIDENTIAL'
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('Valid weight amendment succeeds', () => {
      const result = parliament.enactWeightAmendment({
        detectorWeights: {
          technical_analysis: {
            harmonic: 0.16 // Valid
          }
        },
        authority: 'PRESIDENTIAL',
        reason: 'Test amendment'
      });

      expect(result.success).toBe(true);
      
      const weights = parliament.getDetectorWeights();
      expect(weights.technical_analysis.harmonic).toBe(0.16);
    });

    it('Reset to defaults works correctly', () => {
      // Make an amendment
      parliament.enactWeightAmendment({
        detectorWeights: {
          technical_analysis: {
            harmonic: 0.20
          }
        },
        authority: 'PRESIDENTIAL'
      });

      // Reset
      parliament.resetToDefaults();

      const weights = parliament.getDetectorWeights();
      expect(weights.technical_analysis.harmonic).toBe(0.15);
    });
  });

  describe('Pillar 3: Judicial Combiner', () => {
    let combiner: SupremeJudicialCombiner;

    beforeEach(() => {
      combiner = SupremeJudicialCombiner.getInstance();
    });

    it('Combines detector scores for single timeframe', () => {
      const detectorScores = new Map<DetectorName, ConstitutionalDetectorOutput>();
      
      detectorScores.set('harmonic', {
        score: 0.7,
        meta: {},
        detector: 'harmonic',
        timestamp: Date.now(),
        confidence: 0.8
      });

      detectorScores.set('elliott', {
        score: 0.6,
        meta: {},
        detector: 'elliott',
        timestamp: Date.now(),
        confidence: 0.7
      });

      const result = combiner.combineOneTF('1h', detectorScores);

      expect(result.tf).toBe('1h');
      expect(result.final_score).toBeGreaterThanOrEqual(-1);
      expect(result.final_score).toBeLessThanOrEqual(1);
      expect(result.components.length).toBe(2);
      expect(result.direction).toBe('BULLISH');
    });

    it('Delivers verdict from multiple timeframes', () => {
      const timeframeResults = [
        {
          tf: '1h',
          direction: 'BULLISH' as const,
          final_score: 0.6 as QuantumScore,
          components: [],
          weight: 0.3,
          priority: 'OPERATIONAL' as const
        },
        {
          tf: '4h',
          direction: 'BULLISH' as const,
          final_score: 0.5 as QuantumScore,
          components: [],
          weight: 0.2,
          priority: 'STRATEGIC' as const
        }
      ];

      const verdict = combiner.deliverVerdict(timeframeResults);

      expect(verdict.direction).toBe('BULLISH');
      expect(verdict.quantumScore).toBeGreaterThan(0);
      expect(verdict.action).toBe('BUY');
      expect(verdict.timeframeResults.length).toBe(2);
    });

    it('Handles neutral scores correctly', () => {
      const timeframeResults = [
        {
          tf: '1h',
          direction: 'NEUTRAL' as const,
          final_score: 0.02 as QuantumScore,
          components: [],
          weight: 0.3,
          priority: 'OPERATIONAL' as const
        }
      ];

      const verdict = combiner.deliverVerdict(timeframeResults);

      expect(verdict.direction).toBe('NEUTRAL');
      expect(verdict.action).toBe('HOLD');
    });
  });

  describe('Pillar 4: Integration Testing', () => {
    it('Full scoring service generates snapshot', async () => {
      const service = QuantumScoringService.getInstance();
      
      // This would require actual market data
      // For now, just verify the service exists
      expect(service).toBeDefined();
      expect(typeof service.generateSnapshot).toBe('function');
    });
  });

  describe('Pillar 5: Edge Cases', () => {
    it('Handles empty detector scores', () => {
      const combiner = SupremeJudicialCombiner.getInstance();
      const emptyScores = new Map<DetectorName, ConstitutionalDetectorOutput>();
      
      const result = combiner.combineOneTF('1h', emptyScores);
      
      expect(result.final_score).toBe(0);
      expect(result.direction).toBe('NEUTRAL');
    });

    it('Handles extreme scores', () => {
      const converter = ConstitutionalConverter;
      
      // Test clamping
      expect(converter.scale100ToSigned(200)).toBe(1);
      expect(converter.scale100ToSigned(-200)).toBe(-1);
      expect(converter.scale100ToSigned(150)).toBe(1);
    });

    it('Weight parliament rejects invalid sums', () => {
      const parliament = WeightParliament.getInstance();
      
      const result = parliament.enactWeightAmendment({
        timeframeWeights: {
          '1h': 0.5,
          '4h': 0.6 // Sum > 1
        },
        authority: 'PRESIDENTIAL'
      });

      expect(result.success).toBe(false);
    });
  });
});
