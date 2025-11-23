/**
 * Scoring Telemetry Tests
 *
 * Tests for performance tracking and telemetry functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ScoringTelemetry } from '../ScoringTelemetry';
import fs from 'fs';
import path from 'path';

describe('ScoringTelemetry', () => {
  let telemetry: ScoringTelemetry;
  const testTelemetryPath = path.join(process.cwd(), 'storage', 'mlOutputs', 'test_telemetry.json');

  beforeEach(() => {
    // Clean up any existing test telemetry file
    if (fs.existsSync(testTelemetryPath)) {
      fs.unlinkSync(testTelemetryPath);
    }

    telemetry = ScoringTelemetry.getInstance(testTelemetryPath);
    telemetry.reset(); // Start with clean slate
  });

  afterEach(() => {
    telemetry.shutdown();

    // Clean up test file
    if (fs.existsSync(testTelemetryPath)) {
      fs.unlinkSync(testTelemetryPath);
    }
  });

  describe('Recording Outcomes', () => {
    it('should record a winning signal', () => {
      telemetry.recordOutcome('rsi', 'core', true, 100, 0.8);

      const metrics = telemetry.getDetectorMetrics('rsi');

      expect(metrics).toBeDefined();
      expect(metrics!.wins).toBe(1);
      expect(metrics!.losses).toBe(0);
      expect(metrics!.totalSignals).toBe(1);
      expect(metrics!.winRate).toBe(1.0);
    });

    it('should record a losing signal', () => {
      telemetry.recordOutcome('macd', 'core', false, -50, 0.6);

      const metrics = telemetry.getDetectorMetrics('macd');

      expect(metrics).toBeDefined();
      expect(metrics!.wins).toBe(0);
      expect(metrics!.losses).toBe(1);
      expect(metrics!.totalSignals).toBe(1);
      expect(metrics!.winRate).toBe(0.0);
    });

    it('should calculate winRate correctly', () => {
      // Record 7 wins, 3 losses
      for (let i = 0; i < 7; i++) {
        telemetry.recordOutcome('smc', 'smc', true);
      }
      for (let i = 0; i < 3; i++) {
        telemetry.recordOutcome('smc', 'smc', false);
      }

      const metrics = telemetry.getDetectorMetrics('smc');

      expect(metrics!.totalSignals).toBe(10);
      expect(metrics!.wins).toBe(7);
      expect(metrics!.losses).toBe(3);
      expect(metrics!.winRate).toBeCloseTo(0.7, 5);
    });

    it('should track average PnL', () => {
      telemetry.recordOutcome('elliott', 'patterns', true, 100, 0.7);
      telemetry.recordOutcome('elliott', 'patterns', true, 200, 0.8);
      telemetry.recordOutcome('elliott', 'patterns', false, -50, 0.6);

      const metrics = telemetry.getDetectorMetrics('elliott');

      // Average PnL = (100 + 200 - 50) / 3 = 83.33
      expect(metrics!.avgPnL).toBeCloseTo(83.33, 1);
    });

    it('should track average confidence', () => {
      telemetry.recordOutcome('ml_ai', 'ml', true, 100, 0.8);
      telemetry.recordOutcome('ml_ai', 'ml', true, 150, 0.9);
      telemetry.recordOutcome('ml_ai', 'ml', false, -30, 0.7);

      const metrics = telemetry.getDetectorMetrics('ml_ai');

      // Average confidence = (0.8 + 0.9 + 0.7) / 3 = 0.8
      expect(metrics!.avgConfidence).toBeCloseTo(0.8, 5);
    });
  });

  describe('Category Metrics', () => {
    it('should aggregate metrics at category level', () => {
      // Record signals for multiple detectors in 'core' category
      telemetry.recordOutcome('rsi', 'core', true, 100, 0.8);
      telemetry.recordOutcome('macd', 'core', true, 150, 0.9);
      telemetry.recordOutcome('bollinger', 'core', false, -50, 0.6);

      const categoryMetrics = telemetry.getCategoryMetrics('core');

      expect(categoryMetrics).toBeDefined();
      expect(categoryMetrics!.totalSignals).toBe(3);
      expect(categoryMetrics!.wins).toBe(2);
      expect(categoryMetrics!.losses).toBe(1);
      expect(categoryMetrics!.winRate).toBeCloseTo(0.667, 2);
    });

    it('should track contributing detectors in category', () => {
      telemetry.recordOutcome('sentiment', 'sentiment', true);
      telemetry.recordOutcome('news', 'sentiment', false);
      telemetry.recordOutcome('whales', 'sentiment', true);

      const categoryMetrics = telemetry.getCategoryMetrics('sentiment');

      expect(categoryMetrics!.detectors).toContain('sentiment');
      expect(categoryMetrics!.detectors).toContain('news');
      expect(categoryMetrics!.detectors).toContain('whales');
      expect(categoryMetrics!.detectors.length).toBe(3);
    });
  });

  describe('Global Stats', () => {
    it('should track global statistics', () => {
      // Record signals across different categories
      telemetry.recordOutcome('rsi', 'core', true);
      telemetry.recordOutcome('smc', 'smc', true);
      telemetry.recordOutcome('elliott', 'patterns', false);
      telemetry.recordOutcome('sentiment', 'sentiment', true);
      telemetry.recordOutcome('ml_ai', 'ml', false);

      const data = telemetry.getAllData();

      expect(data.globalStats.totalSignals).toBe(5);
      expect(data.globalStats.totalWins).toBe(3);
      expect(data.globalStats.totalLosses).toBe(2);
      expect(data.globalStats.globalWinRate).toBeCloseTo(0.6, 5);
    });
  });

  describe('Summary Generation', () => {
    it('should generate lightweight summary', () => {
      // Record enough signals to meet minimum sample size
      for (let i = 0; i < 20; i++) {
        telemetry.recordOutcome('rsi', 'core', i < 15, undefined, 0.7); // 75% win rate
      }
      for (let i = 0; i < 15; i++) {
        telemetry.recordOutcome('smc', 'smc', i < 10, undefined, 0.8); // 67% win rate
      }

      const summary = telemetry.getSummary();

      expect(summary.totalSignals).toBe(35);
      expect(summary.winRate).toBeGreaterThan(0);
      expect(summary.winRate).toBeLessThanOrEqual(1);
      expect(summary.avgConfidence).toBeDefined();
      expect(summary.bestCategory).toBeDefined(); // Should identify best category
    });

    it('should identify best performing category', () => {
      // Core: 90% win rate
      for (let i = 0; i < 10; i++) {
        telemetry.recordOutcome('rsi', 'core', i < 9);
      }

      // SMC: 50% win rate
      for (let i = 0; i < 10; i++) {
        telemetry.recordOutcome('smc', 'smc', i < 5);
      }

      const summary = telemetry.getSummary();

      expect(summary.bestCategory).toBe('core');
    });
  });

  describe('Persistence', () => {
    it('should save telemetry to disk', () => {
      telemetry.recordOutcome('rsi', 'core', true);
      telemetry.forceSave();

      expect(fs.existsSync(testTelemetryPath)).toBe(true);

      const rawData = fs.readFileSync(testTelemetryPath, 'utf-8');
      const data = JSON.parse(rawData);

      expect(data.detectors.rsi).toBeDefined();
      expect(data.globalStats.totalSignals).toBe(1);
    });

    it('should load telemetry from disk', () => {
      // Record and save
      telemetry.recordOutcome('macd', 'core', true);
      telemetry.forceSave();
      telemetry.shutdown();

      // Create new instance (should load from disk)
      const telemetry2 = ScoringTelemetry.getInstance(testTelemetryPath);

      const metrics = telemetry2.getDetectorMetrics('macd');
      expect(metrics).toBeDefined();
      expect(metrics!.totalSignals).toBe(1);

      telemetry2.shutdown();
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent detector gracefully', () => {
      const metrics = telemetry.getDetectorMetrics('nonexistent');

      expect(metrics).toBeNull();
    });

    it('should handle category with no signals', () => {
      const categoryMetrics = telemetry.getCategoryMetrics('ml');

      expect(categoryMetrics).toBeDefined();
      expect(categoryMetrics!.totalSignals).toBe(0);
      expect(categoryMetrics!.winRate).toBe(0);
    });

    it('should reset telemetry correctly', () => {
      telemetry.recordOutcome('rsi', 'core', true);
      telemetry.recordOutcome('macd', 'core', false);

      telemetry.reset();

      const data = telemetry.getAllData();

      expect(data.globalStats.totalSignals).toBe(0);
      expect(Object.keys(data.detectors).length).toBe(0);
    });
  });
});
