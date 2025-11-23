/**
 * Health Check Endpoint
 *
 * Provides a simple health check endpoint for monitoring and load balancers.
 * Returns a 200 OK status with basic system information.
 *
 * @module health
 */

import type { Request, Response } from 'express';
import {
  getHealth as getEngineHealth,
  getInfo as getEngineInfo,
  getProviders as getEngineProviders,
  isHFClientError
} from '../services/hfClient.js';

/**
 * Health check endpoint handler.
 * Returns a JSON response indicating the service is operational.
 *
 * @param _ - Express request object (unused)
 * @param res - Express response object
 */
export const health = async (_: Request, res: Response): Promise<void> => {
  try {
    const [engineHealth, engineInfo, providers] = await Promise.all([
      getEngineHealth().catch(() => null),
      getEngineInfo().catch(() => null),
      getEngineProviders().catch(() => [])
    ]);

    // Include HF WebSocket status from global state
    const hfWsStatus = typeof global !== 'undefined' && global.__HF_WS_STATUS__ 
      ? global.__HF_WS_STATUS__ 
      : { state: 'unknown' };

    res.status(200).json({
      ok: true,
      source: 'hf_engine',
      ts: Date.now(),
      service: 'dreammaker-crypto-signal-trader',
      engine: engineInfo,
      health: engineHealth,
      providers,
      hf: hfWsStatus,
      redisConfigured: !!process.env.REDIS_URL
    });
  } catch (error) {
    if (isHFClientError(error)) {
      res.status(error.status).json(error.payload);
      return;
    }

    res.status(503).json({
      ok: false,
      source: 'hf_engine',
      endpoint: '/health',
      message: error instanceof Error
        ? error.message
        : 'Failed to reach HuggingFace data engine',
      status: 503
    });
  }
};
