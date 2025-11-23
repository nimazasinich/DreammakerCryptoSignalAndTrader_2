import { describe, it, expect, beforeEach } from '@jest/globals';
import { runStrategy3 } from '../strategy3';
import { saveStrategyOutput, loadStrategyOutput } from '../../storage/mlOutputs';

describe('Strategy Chain Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('Strategy Output Persistence', () => {
    it('should save and load Strategy 1 output', async () => {
      const mockTop10 = [
        { symbol: 'BTC-USDT', priceUsd: 50000, decision: { finalScore: 0.85, action: 'BUY' as const } },
        { symbol: 'ETH-USDT', priceUsd: 3000, decision: { finalScore: 0.75, action: 'BUY' as const } }
      ];

      await saveStrategyOutput(1, mockTop10);
      const loaded = await loadStrategyOutput(1);

      expect(loaded).toEqual(mockTop10);
    });

    it('should save and load Strategy 2 output', async () => {
      const mockS2Output = [
        { symbol: 'BTC-USDT', decision: { finalScore: 0.8, action: 'BUY' as const }, etaMinutes: 30 },
        { symbol: 'ETH-USDT', decision: { finalScore: 0.7, action: 'BUY' as const }, etaMinutes: 45 }
      ];

      await saveStrategyOutput(2, mockS2Output);
      const loaded = await loadStrategyOutput(2);

      expect(loaded).toEqual(mockS2Output);
    });

    it('should save and load Strategy 3 output', async () => {
      const mockS3Output = [
        {
          symbol: 'BTC-USDT',
          action: 'BUY' as const,
          entryLevels: { conservative: 0.236, base: 0.382, aggressive: 0.5 },
          risk: { slAtrMult: 2, rr: 2 },
          summary: 'Entry plan aligned with ICT/Fib/Elliott/SAR; finalScore=0.85'
        }
      ];

      await saveStrategyOutput(3, mockS3Output);
      const loaded = await loadStrategyOutput(3);

      expect(loaded).toEqual(mockS3Output);
    });

    it('should return null for non-existent strategy output', async () => {
      const loaded = await loadStrategyOutput(1);
      expect(loaded).toBeNull();
    });
  });

  describe('Strategy 3 Logic', () => {
    it('should select top 3 symbols by finalScore', async () => {
      const mockS2Results = [
        { symbol: 'BTC-USDT', decision: { finalScore: 0.85, action: 'BUY' as const } },
        { symbol: 'ETH-USDT', decision: { finalScore: 0.75, action: 'BUY' as const } },
        { symbol: 'ADA-USDT', decision: { finalScore: 0.70, action: 'BUY' as const } },
        { symbol: 'SOL-USDT', decision: { finalScore: 0.65, action: 'HOLD' as const } },
        { symbol: 'DOT-USDT', decision: { finalScore: 0.60, action: 'HOLD' as const } }
      ];

      const result = await runStrategy3({ topFromS2: mockS2Results });

      expect(result.length).toBe(3);
      expect(result[0].symbol).toBe('BTC-USDT');
      expect(result[1].symbol).toBe('ETH-USDT');
      expect(result[2].symbol).toBe('ADA-USDT');
    });

    it('should include entry levels and risk parameters', async () => {
      const mockS2Results = [
        { symbol: 'BTC-USDT', decision: { finalScore: 0.85, action: 'BUY' as const } }
      ];

      const result = await runStrategy3({ topFromS2: mockS2Results });

      expect(result[0].entryLevels).toBeDefined();
      expect(result[0].entryLevels.conservative).toBe(0.236);
      expect(result[0].entryLevels.base).toBe(0.382);
      expect(result[0].entryLevels.aggressive).toBe(0.5);

      expect(result[0].risk).toBeDefined();
      expect(result[0].risk.slAtrMult).toBe(2);
      expect(result[0].risk.rr).toBe(2);
    });

    it('should include summary with finalScore', async () => {
      const mockS2Results = [
        { symbol: 'BTC-USDT', decision: { finalScore: 0.85, action: 'BUY' as const } }
      ];

      const result = await runStrategy3({ topFromS2: mockS2Results });

      expect(result[0].summary).toContain('finalScore=0.85');
      expect(result[0].summary).toContain('ICT');
      expect(result[0].summary).toContain('Fib');
      expect(result[0].summary).toContain('Elliott');
    });

    it('should persist output to storage', async () => {
      const mockS2Results = [
        { symbol: 'BTC-USDT', decision: { finalScore: 0.85, action: 'BUY' as const } },
        { symbol: 'ETH-USDT', decision: { finalScore: 0.75, action: 'BUY' as const } },
        { symbol: 'ADA-USDT', decision: { finalScore: 0.70, action: 'BUY' as const } }
      ];

      await runStrategy3({ topFromS2: mockS2Results });
      const loaded = await loadStrategyOutput(3);

      expect(loaded).toBeDefined();
      expect(Array.isArray(loaded)).toBe(true);
      if (Array.isArray(loaded)) {
        expect(loaded.length).toBe(3);
      }
    });
  });

  describe('Strategy Chain Integration', () => {
    it('should chain from S1 -> S2 -> S3 outputs', async () => {
      // Mock S1 output
      const s1Output = [
        { symbol: 'BTC-USDT', priceUsd: 50000, decision: { finalScore: 0.85, action: 'BUY' as const } },
        { symbol: 'ETH-USDT', priceUsd: 3000, decision: { finalScore: 0.75, action: 'BUY' as const } }
      ];
      await saveStrategyOutput(1, s1Output);

      // Mock S2 output (derived from S1)
      const s2Output = [
        { symbol: 'BTC-USDT', decision: { finalScore: 0.80, action: 'BUY' as const }, etaMinutes: 30 },
        { symbol: 'ETH-USDT', decision: { finalScore: 0.70, action: 'BUY' as const }, etaMinutes: 45 }
      ];
      await saveStrategyOutput(2, s2Output);

      // Run S3 (takes S2 output)
      const s3Output = await runStrategy3({ topFromS2: s2Output });

      // Verify chain
      const loadedS1 = await loadStrategyOutput(1);
      const loadedS2 = await loadStrategyOutput(2);
      const loadedS3 = await loadStrategyOutput(3);

      expect(loadedS1).toEqual(s1Output);
      expect(loadedS2).toEqual(s2Output);
      expect(loadedS3).toEqual(s3Output);

      // S3 should have 2 entries (or fewer if top3 logic limits it)
      expect(Array.isArray(s3Output)).toBe(true);
      expect(s3Output.length).toBeLessThanOrEqual(3);
    });
  });
});
