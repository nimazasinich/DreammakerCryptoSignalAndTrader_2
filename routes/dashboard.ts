/**
 * Dashboard Routes - مسیرهای API برای داشبورد
 */

import { Router, Request, Response } from 'express';
import { DashboardDataService } from '../services/DashboardDataService.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { Logger } from '../core/Logger.js';

const router = Router();
const logger = Logger.getInstance();
const dashboardService = DashboardDataService.getInstance();

/**
 * GET /api/dashboard/initial
 * بارگذاری داده‌های اولیه داشبورد
 */
router.get('/initial', asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { 
      symbols, 
      includeSignals, 
      includeMarketOverview,
      cache 
    } = req.query;

    const symbolsArray = symbols 
      ? (symbols as string).split(',').map(s => s.trim())
      : undefined;

    const data = await dashboardService.loadInitialData({
      symbols: symbolsArray,
      includeSignals: includeSignals !== 'false',
      includeMarketOverview: includeMarketOverview !== 'false',
      cacheTimeout: cache ? parseInt(cache as string) : undefined,
    });

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      data,
      meta: {
        duration,
        cached: duration < 100, // اگر خیلی سریع بود، احتمالاً از cache بود
        timestamp: Date.now(),
      },
    });

    logger.info('Dashboard initial data served', {
      duration,
      symbolsCount: data.prices.length,
      signalsCount: data.recentSignals.length,
    });

  } catch (error) {
    logger.error('Failed to load dashboard initial data, returning fallback', {}, error as Error);
    
    // Always return data, even if it's fallback data
    // This ensures the first page always loads
    try {
      const symbolsArray = req.query.symbols 
        ? (req.query.symbols as string).split(',').map(s => s.trim())
        : undefined;
      
      const fallbackData = await dashboardService.loadInitialData({
        symbols: symbolsArray,
        includeSignals: false,
        includeMarketOverview: false,
      });

      res.json({
        success: true,
        data: fallbackData,
        meta: {
          duration: Date.now() - startTime,
          cached: false,
          timestamp: Date.now(),
          fallback: true,
        },
      });
    } catch (fallbackError) {
      // Last resort - return minimal valid response
      logger.error('Even fallback data failed, returning minimal response', {}, fallbackError as Error);
      res.json({
        success: true,
        data: {
          prices: [],
          marketOverview: {
            totalMarketCap: 0,
            totalVolume: 0,
            btcDominance: 0,
            activeCoins: 0,
          },
          topMovers: { gainers: [], losers: [] },
          recentSignals: [],
          systemStatus: {
            dataSource: 'huggingface',
            lastUpdate: Date.now(),
            health: 'degraded',
          },
        },
        meta: {
          duration: Date.now() - startTime,
          cached: false,
          timestamp: Date.now(),
          fallback: true,
          error: 'Some data sources unavailable',
        },
      });
    }
  }
}));

/**
 * GET /api/dashboard/prices
 * دریافت قیمت‌های فعلی
 */
router.get('/prices', asyncHandler(async (req: Request, res: Response) => {
  const { symbols } = req.query;

  if (!symbols) {
    throw new AppError(
      'Symbols parameter is required',
      400,
      'MISSING_PARAMETER'
    );
  }

  const symbolsArray = (symbols as string).split(',').map(s => s.trim());

  const data = await dashboardService.loadInitialData({
    symbols: symbolsArray,
    includeSignals: false,
    includeMarketOverview: false,
  });

  res.json({
    success: true,
    data: data.prices,
    timestamp: Date.now(),
  });
}));

/**
 * POST /api/dashboard/cache/clear
 * پاکسازی cache داشبورد
 */
router.post('/cache/clear', asyncHandler(async (req: Request, res: Response) => {
  dashboardService.clearCache();

  res.json({
    success: true,
    message: 'Dashboard cache cleared successfully',
    timestamp: Date.now(),
  });

  logger.info('Dashboard cache cleared');
}));

/**
 * GET /api/dashboard/health
 * بررسی سلامت سرویس داشبورد
 */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'dashboard',
    timestamp: Date.now(),
  });
}));

export { router as dashboardRouter };
export default router;

