/**
 * Futures Controller
 * Handles HTTP requests for futures trading operations
 */
import { Request, Response } from 'express';
import { Logger } from '../core/Logger.js';
import { FuturesService } from '../services/FuturesService.js';
import { FEATURE_FUTURES } from '../config/flags.js';
import { FuturesOrder } from '../types/futures.js';

export class FuturesController {
  private logger = Logger.getInstance();
  private futuresService = FuturesService.getInstance();

  private checkFeatureEnabled(req: Request, res: Response): boolean {
    if (!FEATURE_FUTURES) {
      res.status(404).json({
        error: 'Futures trading is disabled',
        message: 'Set FEATURE_FUTURES=true to enable futures trading'
      });
      return false;
    }
    return true;
  }

  async getPositions(req: Request, res: Response): Promise<void> {
    if (!this.checkFeatureEnabled(req, res)) return;

    try {
      const positions = await this.futuresService.getPositions();
      
      res.json({
        success: true,
        data: positions,
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

  async placeOrder(req: Request, res: Response): Promise<void> {
    if (!this.checkFeatureEnabled(req, res)) return;

    try {
      const { symbol, side, type, qty, price, leverage, stopLoss, takeProfit, reduceOnly, marginMode } = req.body;

      // Validation
      if (!symbol || !side || !type || !qty) {
        res.status(400).json({
          error: 'Missing required fields',
          message: 'Required fields: symbol, side, type, qty'
        });
        return;
      }

      if (type === 'limit' && !price) {
        res.status(400).json({
          error: 'Missing required field',
          message: 'Price is required for limit orders'
        });
        return;
      }

      if (qty <= 0) {
        res.status(400).json({
          error: 'Invalid quantity',
          message: 'Quantity must be greater than 0'
        });
        return;
      }

      const order: FuturesOrder = {
        symbol: symbol.toUpperCase(),
        side: side.toLowerCase(),
        type: type.toLowerCase(),
        qty: parseFloat(qty),
        price: price ? parseFloat(price) : undefined,
        leverage: leverage ? parseInt(leverage) : undefined,
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
        reduceOnly: reduceOnly === true || reduceOnly === 'true'
      };

      const result = await this.futuresService.placeOrder(order);

      res.json({
        success: true,
        data: result,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to place order', { body: req.body }, error as Error);
      res.status(500).json({
        error: 'Failed to place order',
        message: (error as Error).message
      });
    }
  }

  async cancelOrder(req: Request, res: Response): Promise<void> {
    if (!this.checkFeatureEnabled(req, res)) return;

    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: 'Missing order ID',
          message: 'Order ID is required'
        });
        return;
      }

      const result = await this.futuresService.cancelOrder(id);

      res.json({
        success: true,
        data: result,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to cancel order', { orderId: req.params.id }, error as Error);
      res.status(500).json({
        error: 'Failed to cancel order',
        message: (error as Error).message
      });
    }
  }

  async cancelAllOrders(req: Request, res: Response): Promise<void> {
    if (!this.checkFeatureEnabled(req, res)) return;

    try {
      const { symbol } = req.query;
      const result = await this.futuresService.cancelAllOrders(symbol as string | undefined);

      res.json({
        success: true,
        data: result,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to cancel all orders', { symbol: req.query.symbol }, error as Error);
      res.status(500).json({
        error: 'Failed to cancel all orders',
        message: (error as Error).message
      });
    }
  }

  async getOpenOrders(req: Request, res: Response): Promise<void> {
    if (!this.checkFeatureEnabled(req, res)) return;

    try {
      const { symbol } = req.query;
      const orders = await this.futuresService.getOpenOrders(symbol as string | undefined);

      res.json({
        success: true,
        data: orders,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to get open orders', { symbol: req.query.symbol }, error as Error);
      res.status(500).json({
        error: 'Failed to get open orders',
        message: (error as Error).message
      });
    }
  }

  async setLeverage(req: Request, res: Response): Promise<void> {
    if (!this.checkFeatureEnabled(req, res)) return;

    try {
      const { symbol, leverage, marginMode = 'isolated' } = req.body;

      if (!symbol || !leverage) {
        res.status(400).json({
          error: 'Missing required fields',
          message: 'Required fields: symbol, leverage'
        });
        return;
      }

      if (leverage < 1 || leverage > 100) {
        res.status(400).json({
          error: 'Invalid leverage',
          message: 'Leverage must be between 1 and 100'
        });
        return;
      }

      const result = await this.futuresService.setLeverage(symbol.toUpperCase(), parseInt(leverage), marginMode);

      res.json({
        success: true,
        data: result,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to set leverage', { body: req.body }, error as Error);
      res.status(500).json({
        error: 'Failed to set leverage',
        message: (error as Error).message
      });
    }
  }

  async getAccountBalance(req: Request, res: Response): Promise<void> {
    if (!this.checkFeatureEnabled(req, res)) return;

    try {
      const balance = await this.futuresService.getAccountBalance();

      res.json({
        success: true,
        data: balance,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to get account balance', {}, error as Error);
      res.status(500).json({
        error: 'Failed to get account balance',
        message: (error as Error).message
      });
    }
  }

  async getOrderbook(req: Request, res: Response): Promise<void> {
    if (!this.checkFeatureEnabled(req, res)) return;

    try {
      const { symbol } = req.params;
      const { depth = 20 } = req.query;

      if (!symbol) {
        res.status(400).json({
          error: 'Missing symbol',
          message: 'Symbol is required'
        });
        return;
      }

      const orderbook = await this.futuresService.getOrderbook(symbol.toUpperCase(), parseInt(depth as string));

      res.json({
        success: true,
        data: orderbook,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to get orderbook', { symbol: req.params.symbol }, error as Error);
      res.status(500).json({
        error: 'Failed to get orderbook',
        message: (error as Error).message
      });
    }
  }

  async getFundingRate(req: Request, res: Response): Promise<void> {
    if (!this.checkFeatureEnabled(req, res)) return;

    try {
      const { symbol } = req.params;

      if (!symbol) {
        res.status(400).json({
          error: 'Missing symbol',
          message: 'Symbol is required'
        });
        return;
      }

      const fundingRate = await this.futuresService.getFundingRate(symbol.toUpperCase());

      res.json({
        success: true,
        data: fundingRate,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to get funding rate', { symbol: req.params.symbol }, error as Error);
      res.status(500).json({
        error: 'Failed to get funding rate',
        message: (error as Error).message
      });
    }
  }

  async getFundingRateHistory(req: Request, res: Response): Promise<void> {
    if (!this.checkFeatureEnabled(req, res)) return;

    try {
      const { symbol } = req.params;
      const { startTime, endTime, limit = 100 } = req.query;

      if (!symbol) {
        res.status(400).json({
          error: 'Missing symbol',
          message: 'Symbol is required'
        });
        return;
      }

      const history = await this.futuresService.getFundingRateHistory(
        symbol.toUpperCase(),
        startTime ? parseInt(startTime as string) : undefined,
        endTime ? parseInt(endTime as string) : undefined,
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: history,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to get funding rate history', { symbol: req.params.symbol }, error as Error);
      res.status(500).json({
        error: 'Failed to get funding rate history',
        message: (error as Error).message
      });
    }
  }

  async closePosition(req: Request, res: Response): Promise<void> {
    if (!this.checkFeatureEnabled(req, res)) return;

    try {
      const { symbol } = req.params;

      if (!symbol) {
        res.status(400).json({
          error: 'Missing symbol',
          message: 'Symbol is required'
        });
        return;
      }

      const result = await this.futuresService.closePosition(symbol.toUpperCase());

      res.json({
        success: true,
        data: result,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to close position', { symbol: req.params.symbol }, error as Error);
      res.status(500).json({
        error: 'Failed to close position',
        message: (error as Error).message
      });
    }
  }
}
