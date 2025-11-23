/**
 * Strategy Pipeline Controller Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { StrategyPipelineController } from '../StrategyPipelineController';

// Mock the strategies
vi.mock('../../strategies/strategy1', () => ({
  runStrategy1: vi.fn().mockResolvedValue([
    {
      symbol: 'BTC/USDT',
      priceUsd: 50000,
      decision: {
        action: 'BUY',
        score: 0.85,
        confidence: 0.8,
        finalStrategyScore: 0.85,
        categoryScores: [
          { name: 'core', rawScore: 0.9, weightedScore: 0.36, weight: 0.40, contributingDetectors: [] },
          { name: 'smc', rawScore: 0.8, weightedScore: 0.20, weight: 0.25, contributingDetectors: [] },
          { name: 'patterns', rawScore: 0.7, weightedScore: 0.14, weight: 0.20, contributingDetectors: [] },
          { name: 'sentiment', rawScore: 0.6, weightedScore: 0.06, weight: 0.10, contributingDetectors: [] },
          { name: 'ml', rawScore: 0.5, weightedScore: 0.025, weight: 0.05, contributingDetectors: [] }
        ],
        effectiveWeights: {
          categories: { core: 0.40, smc: 0.25, patterns: 0.20, sentiment: 0.10, ml: 0.05 },
          isAdaptive: false
        },
        components: {} as any
      }
    }
  ])
}));

vi.mock('../../strategies/strategy2', () => ({
  runStrategy2: vi.fn().mockResolvedValue([
    {
      symbol: 'BTC/USDT',
      etaMinutes: 30,
      decision: {
        action: 'BUY',
        score: 0.85,
        confidence: 0.8,
        finalStrategyScore: 0.85,
        categoryScores: [],
        effectiveWeights: { categories: { core: 0.40, smc: 0.25, patterns: 0.20, sentiment: 0.10, ml: 0.05 }, isAdaptive: false },
        components: {} as any
      }
    }
  ])
}));

vi.mock('../../strategies/strategy3', () => ({
  runStrategy3: vi.fn().mockResolvedValue([
    {
      symbol: 'BTC/USDT',
      action: 'BUY',
      finalStrategyScore: 0.85,
      categoryScores: [],
      entryLevels: { conservative: 0.236, base: 0.382, aggressive: 0.5 },
      risk: { slAtrMult: 2, rr: 2 },
      summary: 'Test summary'
    }
  ])
}));

describe('StrategyPipelineController', () => {
  let controller: StrategyPipelineController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    controller = new StrategyPipelineController();

    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      body: {}
    };

    mockResponse = {
      json: jsonMock,
      status: statusMock
    };
  });

  describe('runPipeline', () => {
    it('should successfully run the pipeline with default parameters', async () => {
      mockRequest.body = {
        timeframes: ['15m', '1h', '4h'],
        limit: 20,
        mode: 'offline'
      };

      await controller.runPipeline(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            strategy1: expect.objectContaining({
              symbols: expect.any(Array),
              meta: expect.any(Object)
            }),
            strategy2: expect.objectContaining({
              symbols: expect.any(Array),
              meta: expect.any(Object)
            }),
            strategy3: expect.objectContaining({
              symbols: expect.any(Array),
              meta: expect.any(Object)
            }),
            scoring: expect.objectContaining({
              adaptiveEnabled: expect.any(Boolean),
              effectiveWeights: expect.any(Object)
            }),
            timestamp: expect.any(Number)
          }),
          timestamp: expect.any(Number)
        })
      );
    });

    it('should handle errors gracefully', async () => {
      // Force an error by providing invalid data
      vi.mocked(await import('../../strategies/strategy1')).runStrategy1.mockRejectedValueOnce(
        new Error('Test error')
      );

      await controller.runPipeline(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to execute strategy pipeline',
          message: 'Test error'
        })
      );
    });
  });

  describe('getStatus', () => {
    it('should return pipeline status', async () => {
      await controller.getStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          status: 'ready',
          adaptiveScoring: expect.any(Boolean),
          availableTimeframes: expect.arrayContaining(['5m', '15m', '1h', '4h', '1d']),
          timestamp: expect.any(Number)
        })
      );
    });
  });
});
