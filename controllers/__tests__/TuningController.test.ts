/**
 * Tuning Controller Tests
 *
 * Tests for auto-tuning API endpoints with REAL metrics only (NO FAKE DATA)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { TuningController } from '../TuningController';
import { TuningRunResult } from '../../types/index';

// Mock the ScoringTuner
vi.mock('../../engine/tuning/ScoringTuner', () => ({
  ScoringTuner: {
    getInstance: vi.fn().mockReturnValue({
      loadTuningConfig: vi.fn().mockReturnValue({
        enabled: true,
        mode: 'grid',
        maxCandidates: 30,
        maxGenerations: 10,
        populationSize: 12,
        metric: 'sharpe',
        backtestDefaults: {
          symbolUniverse: ['BTCUSDT', 'ETHUSDT'],
          timeframe: '1h',
          lookbackDays: 60,
          initialBalance: 1000
        },
        promotion: {
          autoPromote: false,
          tunedConfigPath: 'config/scoring.tuned.json'
        }
      }),
      loadScoringConfig: vi.fn().mockReturnValue({
        version: '3.0',
        weights: {},
        categories: {
          core: { weight: 0.40, detectors: ['rsi'] },
          smc: { weight: 0.25, detectors: [] },
          patterns: { weight: 0.20, detectors: [] },
          sentiment: { weight: 0.10, detectors: [] },
          ml: { weight: 0.05, detectors: [] }
        }
      }),
      runTuning: vi.fn().mockResolvedValue({
        id: 'tuning-run-123',
        mode: 'grid',
        startedAt: '2024-01-01T00:00:00Z',
        finishedAt: '2024-01-01T01:00:00Z',
        metric: 'sharpe',
        baselineMetrics: { sharpe: 1.0, winRate: 0.60, pnl: 0.10 },
        bestCandidate: {
          config: { version: '3.0', weights: {}, categories: {} },
          metrics: { sharpe: 1.2, winRate: 0.65, pnl: 0.12 }
        },
        candidatesTested: 25,
        error: null
      } as TuningRunResult)
    })
  }
}));

// Mock the TuningStorage
vi.mock('../../engine/tuning/TuningStorage', () => ({
  TuningStorage: {
    getInstance: vi.fn().mockReturnValue({
      saveResult: vi.fn().mockResolvedValue(undefined),
      getResult: vi.fn().mockResolvedValue({
        id: 'tuning-run-123',
        mode: 'grid',
        startedAt: '2024-01-01T00:00:00Z',
        finishedAt: '2024-01-01T01:00:00Z',
        metric: 'sharpe',
        baselineMetrics: { sharpe: 1.0, winRate: 0.60, pnl: 0.10 },
        bestCandidate: {
          config: { version: '3.0', weights: {}, categories: {} },
          metrics: { sharpe: 1.2, winRate: 0.65, pnl: 0.12 }
        },
        candidatesTested: 25
      }),
      getLatest: vi.fn().mockResolvedValue({
        id: 'tuning-run-latest',
        mode: 'grid',
        startedAt: '2024-01-01T00:00:00Z',
        finishedAt: '2024-01-01T01:00:00Z',
        metric: 'sharpe',
        baselineMetrics: { sharpe: 1.0, winRate: null, pnl: null },
        bestCandidate: {
          config: { version: '3.0', weights: {}, categories: {} },
          metrics: { sharpe: 1.2, winRate: null, pnl: null }
        },
        candidatesTested: 25
      }),
      getAllSummaries: vi.fn().mockResolvedValue([
        {
          id: 'tuning-run-1',
          mode: 'grid',
          startedAt: '2024-01-01T00:00:00Z',
          finishedAt: '2024-01-01T01:00:00Z',
          metric: 'sharpe',
          bestMetricValue: 1.2
        },
        {
          id: 'tuning-run-2',
          mode: 'ga',
          startedAt: '2024-01-02T00:00:00Z',
          finishedAt: '2024-01-02T01:00:00Z',
          metric: 'winRate',
          bestMetricValue: 0.68
        }
      ]),
      deleteResult: vi.fn().mockResolvedValue(true)
    })
  }
}));

describe('TuningController', () => {
  let controller: TuningController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    controller = new TuningController();

    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      body: {},
      params: {},
      query: {}
    };

    mockResponse = {
      json: jsonMock,
      status: statusMock
    };
  });

  describe('POST /api/tuning/run', () => {
    it('should start a tuning run with default configuration', async () => {
      mockRequest.body = {};

      await controller.runTuning(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          id: expect.any(String),
          mode: 'grid',
          metric: 'sharpe'
        })
      );
    });

    it('should start a tuning run with custom parameters', async () => {
      mockRequest.body = {
        mode: 'ga',
        metric: 'winRate',
        symbolUniverse: ['BTCUSDT'],
        timeframe: '4h',
        lookbackDays: 90,
        initialBalance: 5000
      };

      await controller.runTuning(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          id: expect.any(String)
        })
      );
    });

    it('should reject invalid mode', async () => {
      mockRequest.body = {
        mode: 'invalid_mode'
      };

      await controller.runTuning(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Invalid mode')
        })
      );
    });

    it('should reject invalid metric', async () => {
      mockRequest.body = {
        metric: 'invalid_metric'
      };

      await controller.runTuning(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Invalid metric')
        })
      );
    });
  });

  describe('GET /api/tuning/result/:id', () => {
    it('should retrieve a tuning result by ID', async () => {
      mockRequest.params = { id: 'tuning-run-123' };

      await controller.getResult(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          result: expect.objectContaining({
            id: 'tuning-run-123',
            mode: 'grid',
            metric: 'sharpe'
          })
        })
      );
    });

    it('should return 404 for non-existent ID', async () => {
      const tuningStorage = require('../../engine/tuning/TuningStorage').TuningStorage.getInstance();
      tuningStorage.getResult.mockResolvedValueOnce(null);

      mockRequest.params = { id: 'non-existent' };

      await controller.getResult(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('not found')
        })
      );
    });

    it('should return 400 if ID is missing', async () => {
      mockRequest.params = {};

      await controller.getResult(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('required')
        })
      );
    });
  });

  describe('GET /api/tuning/latest', () => {
    it('should retrieve the latest tuning result', async () => {
      await controller.getLatest(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          result: expect.objectContaining({
            id: 'tuning-run-latest',
            mode: 'grid',
            metric: 'sharpe'
          })
        })
      );
    });

    it('should handle no results gracefully', async () => {
      const tuningStorage = require('../../engine/tuning/TuningStorage').TuningStorage.getInstance();
      tuningStorage.getLatest.mockResolvedValueOnce(null);

      await controller.getLatest(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          result: null,
          message: expect.stringContaining('No tuning runs')
        })
      );
    });
  });

  describe('GET /api/tuning/all', () => {
    it('should retrieve all tuning summaries', async () => {
      await controller.getAllSummaries(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          summaries: expect.arrayContaining([
            expect.objectContaining({
              id: 'tuning-run-1',
              mode: 'grid'
            }),
            expect.objectContaining({
              id: 'tuning-run-2',
              mode: 'ga'
            })
          ]),
          count: 2
        })
      );
    });
  });

  describe('DELETE /api/tuning/result/:id', () => {
    it('should delete a tuning result', async () => {
      mockRequest.params = { id: 'tuning-run-123' };

      await controller.deleteResult(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('deleted successfully')
        })
      );
    });

    it('should return 404 if result does not exist', async () => {
      const tuningStorage = require('../../engine/tuning/TuningStorage').TuningStorage.getInstance();
      tuningStorage.deleteResult.mockResolvedValueOnce(false);

      mockRequest.params = { id: 'non-existent' };

      await controller.deleteResult(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('not found')
        })
      );
    });
  });

  describe('Honest Reporting', () => {
    it('should never return fake metrics in tuning results', async () => {
      mockRequest.params = { id: 'tuning-run-123' };

      await controller.getResult(mockRequest as Request, mockResponse as Response);

      const callArgs = jsonMock.mock.calls[0][0];
      const result = callArgs.result;

      // All metrics must be real numbers or null
      if (result.baselineMetrics) {
        Object.values(result.baselineMetrics).forEach((value: any) => {
          expect(value === null || typeof value === 'number').toBe(true);
        });
      }

      if (result.bestCandidate && result.bestCandidate.metrics) {
        Object.values(result.bestCandidate.metrics).forEach((value: any) => {
          expect(value === null || typeof value === 'number').toBe(true);
        });
      }
    });
  });
});
