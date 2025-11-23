/**
 * SystemStatusController Tests
 *
 * Tests for the System Status API endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { SystemStatusController } from '../SystemStatusController.js';

// Mock dependencies
vi.mock('../../config/systemConfig.js', () => ({
  getSystemConfig: vi.fn(() => ({
    features: {
      liveScoring: true,
      backtest: true,
      autoTuning: false,
      autoTrade: false,
      manualTrade: true
    },
    modes: {
      environment: 'DEV',
      trading: 'DRY_RUN'
    }
  })),
  isFeatureEnabled: vi.fn((feature: string) => {
    const features: Record<string, boolean> = {
      liveScoring: true,
      backtest: true,
      autoTuning: false,
      autoTrade: false,
      manualTrade: true
    };
    return features[feature] || false;
  }),
  getTradingMode: vi.fn(() => 'DRY_RUN')
}));

vi.mock('../../ws/ScoreStreamGateway.js', () => ({
  ScoreStreamGateway: {
    getInstance: vi.fn(() => ({
      getStatus: vi.fn(() => ({
        isStreaming: true,
        clients: 2,
        symbols: ['BTCUSDT', 'ETHUSDT'],
        timeframe: '1h',
        broadcastIntervalMs: 30000,
        latestScoresCount: 2
      })),
      getAllLatestScores: vi.fn(() => [
        {
          symbol: 'BTCUSDT',
          finalScore: 0.75,
          action: 'BUY',
          timestamp: Date.now()
        },
        {
          symbol: 'ETHUSDT',
          finalScore: 0.65,
          action: 'HOLD',
          timestamp: Date.now()
        }
      ])
    }))
  }
}));

vi.mock('../../engine/tuning/TuningStorage.js', () => ({
  TuningStorage: {
    getInstance: vi.fn(() => ({
      getLatest: vi.fn(async () => ({
        id: 'test-run-1',
        mode: 'grid',
        startedAt: '2025-01-01T00:00:00.000Z',
        finishedAt: '2025-01-01T01:00:00.000Z',
        metric: 'sharpe',
        baselineMetrics: {
          sharpe: 0.5,
          winRate: 0.55,
          pnl: 1000
        },
        bestCandidate: {
          config: {} as any,
          metrics: {
            sharpe: 0.75,
            winRate: 0.6,
            pnl: 1500
          }
        },
        candidatesTested: 50,
        error: null
      }))
    }))
  }
}));

vi.mock('../../services/exchange/ExchangeClient.js', () => ({
  ExchangeClient: {
    getInstance: vi.fn(() => ({
      getAccountInfo: vi.fn(async () => ({
        availableBalance: 10000,
        accountEquity: 12000,
        unrealisedPNL: 2000,
        marginBalance: 10000
      }))
    }))
  }
}));

describe('SystemStatusController', () => {
  let controller: SystemStatusController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    controller = new SystemStatusController();
    mockReq = {};
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    mockRes = {
      json: jsonMock,
      status: statusMock as any
    };
  });

  describe('getStatus', () => {
    it('should return system status with all subsystems', async () => {
      await controller.getStatus(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: 'DEV',
          features: expect.objectContaining({
            liveScoring: true,
            backtest: true,
            autoTuning: false,
            autoTrade: false,
            manualTrade: true
          }),
          trading: expect.objectContaining({
            mode: 'DRY_RUN',
            health: expect.any(String)
          }),
          liveScoring: expect.objectContaining({
            enabled: true,
            streaming: true,
            lastScoreTimestamp: expect.any(Number)
          }),
          tuning: expect.objectContaining({
            hasRun: true,
            lastMetric: expect.objectContaining({
              metric: 'sharpe',
              value: 0.75
            })
          })
        })
      );
    });

    it('should handle DRY_RUN mode correctly', async () => {
      await controller.getStatus(mockReq as Request, mockRes as Response);

      const response = jsonMock.mock.calls[0][0];
      expect(response.trading.mode).toBe('DRY_RUN');
      expect(response.trading.health).toBe('ok'); // DRY_RUN is always ok (simulated)
    });

    it('should reflect feature flags correctly', async () => {
      await controller.getStatus(mockReq as Request, mockRes as Response);

      const response = jsonMock.mock.calls[0][0];
      expect(response.features.liveScoring).toBe(true);
      expect(response.features.autoTuning).toBe(false);
      expect(response.features.autoTrade).toBe(false);
    });

    it('should handle live scoring status', async () => {
      await controller.getStatus(mockReq as Request, mockRes as Response);

      const response = jsonMock.mock.calls[0][0];
      expect(response.liveScoring.enabled).toBe(true);
      expect(response.liveScoring.streaming).toBe(true);
      expect(response.liveScoring.lastScoreTimestamp).toBeDefined();
    });

    it('should handle tuning results', async () => {
      await controller.getStatus(mockReq as Request, mockRes as Response);

      const response = jsonMock.mock.calls[0][0];
      expect(response.tuning.hasRun).toBe(true);
      expect(response.tuning.lastMetric.metric).toBe('sharpe');
      expect(response.tuning.lastMetric.value).toBe(0.75);
    });

    it('should handle errors gracefully', async () => {
      // Mock an error in one of the dependencies
      const { TuningStorage } = await import('../../engine/tuning/TuningStorage.js');
      const mockGetLatest = vi.fn(async () => {
        throw new Error('Test error');
      });
      (TuningStorage.getInstance as any).mockReturnValue({
        getLatest: mockGetLatest
      });

      await controller.getStatus(mockReq as Request, mockRes as Response);

      // Should still return a response, but tuning data should be null/default
      const response = jsonMock.mock.calls[0][0];
      expect(response.tuning.hasRun).toBe(false);
    });
  });
});
