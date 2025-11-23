// src/controllers/TradingController.ts
import { Request, Response } from 'express';
import { Logger } from '../core/Logger.js';
import { RealTradingService } from '../services/RealTradingService.js';
import { OrderManagementService } from '../services/OrderManagementService.js';
import { ConfigManager } from '../core/ConfigManager.js';
import { TradeEngine, TradeSignal } from '../engine/trading/TradeEngine.js';
import { ExchangeClient } from '../services/exchange/ExchangeClient.js';

export class TradingController {
  private logger = Logger.getInstance();
  private realTradingService: RealTradingService;
  private orderManagement: OrderManagementService;
  private config = ConfigManager.getInstance();
  private tradeEngine: TradeEngine;
  private exchangeClient: ExchangeClient;

  constructor() {
    this.realTradingService = new RealTradingService();
    this.orderManagement = OrderManagementService.getInstance();
    this.tradeEngine = TradeEngine.getInstance();
    this.exchangeClient = ExchangeClient.getInstance();
  }

  async analyzeMarket(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.params;
      const cleanSymbol = symbol.replace('USDT', '').toUpperCase();

      if (!this.config.isRealDataMode()) {
        res.status(400).json({
          error: 'Real data mode is not enabled',
          message: 'Enable realDataMode in config to use this endpoint'
        });
        return;
      }

      const analysis = await this.realTradingService.analyzeMarket(cleanSymbol);

      res.json({
        success: true,
        analysis,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to analyze market', { symbol: req.params.symbol }, error as Error);
      res.status(500).json({
        error: 'Failed to analyze market',
        message: (error as Error).message
      });
    }
  }

  async getPortfolio(req: Request, res: Response): Promise<void> {
    try {
      const portfolio = await this.realTradingService.getPortfolioAnalysis();

      res.json({
        success: true,
        portfolio,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to get portfolio', {}, error as Error);
      res.status(500).json({
        error: 'Failed to get portfolio',
        message: (error as Error).message
      });
    }
  }

  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const { symbol, side, quantity, price, orderType = 'LIMIT' } = req.body;

      if (!symbol || !side || !quantity) {
        res.status(400).json({
          error: 'Missing required fields: symbol, side, quantity'
        });
        return;
      }

      const order = await this.orderManagement.createOrder({
        symbol: symbol.toUpperCase(),
        side: side.toUpperCase(),
        quantity: parseFloat(quantity),
        price: price ? parseFloat(price) : undefined,
        type: orderType
      });

      res.json({
        success: true,
        order,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to create order', { body: req.body }, error as Error);
      res.status(500).json({
        error: 'Failed to create order',
        message: (error as Error).message
      });
    }
  }

  async getOrders(req: Request, res: Response): Promise<void> {
    try {
      const { status, symbol } = req.query;
      const orders = await this.orderManagement.getOrders({
        status: status as string,
        symbol: symbol as string
      });

      res.json({
        success: true,
        orders,
        count: orders.length,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to get orders', {}, error as Error);
      res.status(500).json({
        error: 'Failed to get orders',
        message: (error as Error).message
      });
    }
  }

  async getPositions(req: Request, res: Response): Promise<void> {
    try {
      const positions = await this.orderManagement.getPositions();

      res.json({
        success: true,
        positions,
        count: positions.length,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to get positions', {}, error as Error);
      res.status(500).json({
        error: 'Failed to get positions',
        message: (error as Error).message
      });
    }
  }

  async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.orderManagement.cancelOrder(id);

      res.json({
        success: true,
        message: 'Order cancelled',
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to cancel order', { id: req.params.id }, error as Error);
      res.status(500).json({
        error: 'Failed to cancel order',
        message: (error as Error).message
      });
    }
  }

  // ===== TESTNET TRADING ENGINE ENDPOINTS =====

  /**
   * Execute a manual trade on testnet (SPOT or FUTURES)
   * POST /api/trade/execute
   *
   * Body:
   * {
   *   symbol: string (e.g., "BTCUSDT"),
   *   action: "BUY" | "SELL",
   *   quantityUSDT?: number (optional, defaults to 100),
   *   market?: "SPOT" | "FUTURES" | "BOTH" (optional, defaults to system config)
   * }
   */
  async executeTrade(req: Request, res: Response): Promise<void> {
    try {
      const { symbol, action, quantityUSDT, market } = req.body;

      // Validate required fields
      if (!symbol || !action) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: symbol, action'
        });
        return;
      }

      // Validate action
      if (!['BUY', 'SELL'].includes(action)) {
        res.status(400).json({
          success: false,
          error: 'Invalid action. Must be BUY or SELL'
        });
        return;
      }

      // Validate market (optional)
      if (market && !['SPOT', 'FUTURES', 'BOTH'].includes(market)) {
        res.status(400).json({
          success: false,
          error: 'Invalid market. Must be SPOT, FUTURES, or BOTH'
        });
        return;
      }

      // Build trade signal
      const signal: TradeSignal = {
        source: 'manual',
        symbol: symbol,
        action: action,
        confidence: null,
        score: null,
        timestamp: Date.now(),
        market: market // Optional - will default to system config if not provided
      };

      // Execute trade
      const result = await this.tradeEngine.executeSignal(signal, quantityUSDT);

      res.json({
        success: result.executed,
        data: result,
        timestamp: Date.now()
      });

    } catch (error) {
      this.logger.error('Failed to execute trade', { body: req.body }, error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to execute trade',
        message: (error as Error).message
      });
    }
  }

  /**
   * Get open positions from testnet
   * GET /api/trade/open-positions?market=spot|futures
   *
   * Query params:
   * - market: "spot" | "futures" (optional, defaults to futures)
   *
   * NOTE: SPOT positions are not applicable (spot has balances, not positions)
   * This endpoint only returns FUTURES positions
   */
  async getOpenPositions(req: Request, res: Response): Promise<void> {
    try {
      const { market } = req.query;

      // For now, only FUTURES positions are supported
      // SPOT doesn't have positions (it has balances)
      if (market === 'spot') {
        res.json({
          success: true,
          data: [],
          count: 0,
          message: 'SPOT positions not applicable - SPOT trading uses balances instead of positions',
          timestamp: Date.now()
        });
        return;
      }

      const positions = await this.exchangeClient.getOpenPositions();

      res.json({
        success: true,
        data: positions,
        count: positions.length,
        market: 'FUTURES',
        timestamp: Date.now()
      });

    } catch (error) {
      this.logger.error('Failed to get open positions', {}, error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to get open positions',
        message: (error as Error).message
      });
    }
  }
}

