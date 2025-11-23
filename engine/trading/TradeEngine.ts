/**
 * TradeEngine - Core trading execution engine (SPOT + FUTURES)
 *
 * Accepts trade signals from:
 * - Strategy Pipeline (Strategy 3)
 * - Live Scoring
 * - Manual API requests
 *
 * All trades are:
 * - Risk-guarded
 * - Market-aware (SPOT vs FUTURES)
 * - Mode-aware (OFF / DRY_RUN / TESTNET)
 * - Honest about success/failure (NO FAKE FILLS)
 */

import { Logger } from '../../core/Logger.js';
import { ExchangeClient, PlaceOrderParams, PlaceOrderResult } from '../../services/exchange/ExchangeClient.js';
import { RiskGuard } from './RiskGuard.js';
import { Database } from '../../data/Database.js';
import { getTradingMode, getTradingMarket } from '../../config/systemConfig.js';
import { TradeSignal, TradeExecutionResult, TradingMarket } from '../../types/index.js';

/**
 * TradeEngine - Executes trade signals with risk management
 */
export class TradeEngine {
  private static instance: TradeEngine;
  private logger = Logger.getInstance();
  private exchangeClient: ExchangeClient;
  private riskGuard: RiskGuard;
  private database: Database;

  // Default trade size in USDT
  private defaultTradeSize = 100;

  private constructor() {
    this.exchangeClient = ExchangeClient.getInstance();
    this.riskGuard = RiskGuard.getInstance();
    this.database = Database.getInstance();
  }

  static getInstance(): TradeEngine {
    if (!TradeEngine.instance) {
      TradeEngine.instance = new TradeEngine();
    }
    return TradeEngine.instance;
  }

  /**
   * Execute a trade signal
   *
   * @param signal Trade signal to execute (with optional market override)
   * @param quantityUSDT Optional trade size in USDT (defaults to 100)
   * @returns TradeExecutionResult with execution status and market type
   */
  async executeSignal(signal: TradeSignal, quantityUSDT?: number): Promise<TradeExecutionResult> {
    const tradeSize = quantityUSDT || this.defaultTradeSize;
    const tradingMode = getTradingMode();
    const tradingMarket = signal.market || getTradingMarket();

    this.logger.info('Executing trade signal', {
      source: signal.source,
      symbol: signal.symbol,
      action: signal.action,
      quantityUSDT: tradeSize,
      tradingMode,
      tradingMarket
    });

    // 0. Check trading mode (system-level control)
    if (tradingMode === 'OFF') {
      this.logger.warn('Trading is disabled in system config', {
        symbol: signal.symbol
      });
      return {
        executed: false,
        reason: 'trading-disabled',
        market: tradingMarket
      };
    }

    // 1. Check if action is HOLD
    if (signal.action === 'HOLD') {
      this.logger.info('Signal action is HOLD, skipping execution', {
        symbol: signal.symbol
      });
      return {
        executed: false,
        reason: 'Signal action is HOLD',
        market: tradingMarket
      };
    }

    // 2. Run risk guard check (market-aware)
    const riskCheck = await this.riskGuard.checkTradeRisk({
      symbol: signal.symbol,
      side: signal.action,
      quantityUSDT: tradeSize,
      market: tradingMarket
    });

    if (!riskCheck.allowed) {
      this.logger.warn('Trade blocked by risk guard', {
        symbol: signal.symbol,
        market: tradingMarket,
        reason: riskCheck.reason
      });
      return {
        executed: false,
        reason: `blocked-by-risk-guard: ${riskCheck.reason}`,
        market: tradingMarket
      };
    }

    // 3. Get current price to calculate quantity
    let currentPrice: number;
    try {
      const marketData = await this.database.getMarketData(signal.symbol, '1h', 1);
      if (!marketData || marketData.length === 0) {
        return {
          executed: false,
          reason: 'Market data unavailable for symbol',
          market: tradingMarket
        };
      }
      currentPrice = marketData[0].close;
    } catch (error: any) {
      this.logger.error('Failed to get market data', { symbol: signal.symbol }, error);
      return {
        executed: false,
        reason: 'Failed to get market data',
        market: tradingMarket
      };
    }

    // 4. Calculate quantity in base currency
    const quantity = tradeSize / currentPrice;

    // 5. Get leverage from risk guard config (FUTURES only)
    const riskConfig = this.riskGuard.getConfig();
    const leverage = tradingMarket === 'FUTURES'
      ? (riskConfig.futures?.leverage || riskConfig.leverage || 3)
      : undefined; // No leverage for SPOT

    // 6. Place order (real or simulated based on trading mode and market)
    const orderParams: PlaceOrderParams = {
      symbol: signal.symbol,
      side: signal.action,
      quantity: quantity,
      type: 'MARKET',
      leverage: leverage,
      reduceOnly: false,
      market: tradingMarket
    };

    let orderResult: PlaceOrderResult;

    if (tradingMode === 'DRY_RUN') {
      // Simulate order without calling exchange
      // Use different orderId prefix for SPOT vs FUTURES
      const marketPrefix = tradingMarket === 'SPOT' ? 'DRY_SPOT' :
                          tradingMarket === 'FUTURES' ? 'DRY_FUTURES' :
                          'DRY_BOTH';

      this.logger.info('DRY_RUN mode: Simulating order execution', {
        params: orderParams,
        market: tradingMarket
      });

      orderResult = {
        orderId: `${marketPrefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        symbol: signal.symbol,
        side: signal.action,
        quantity: quantity,
        status: 'FILLED',
        price: currentPrice,
        timestamp: Date.now()
      };

      this.logger.info('DRY_RUN order simulated', {
        orderId: orderResult.orderId,
        symbol: signal.symbol,
        side: signal.action,
        quantity: quantity,
        price: currentPrice,
        market: tradingMarket
      });
    } else {
      // TESTNET mode - place real order via exchange
      try {
        orderResult = await this.exchangeClient.placeOrder(orderParams);
      } catch (error: any) {
        this.logger.error('Failed to place order', {
          params: orderParams,
          market: tradingMarket
        }, error);
        return {
          executed: false,
          reason: `Order placement failed: ${error.message}`,
          market: tradingMarket
        };
      }

      // 7. Check if order was successful
      if (orderResult.status === 'REJECTED') {
        this.logger.warn('Order rejected by exchange', {
          symbol: signal.symbol,
          market: tradingMarket,
          error: orderResult.error
        });
        return {
          executed: false,
          reason: `Order rejected: ${orderResult.error}`,
          order: orderResult,
          market: tradingMarket
        };
      }
    }

    // 8. Save order to database
    try {
      await this.database.insert('orders', {
        orderId: orderResult.orderId,
        symbol: orderResult.symbol,
        side: orderResult.side,
        quantity: orderResult.quantity,
        status: orderResult.status,
        price: orderResult.price || currentPrice,
        timestamp: orderResult.timestamp,
        source: signal.source,
        confidence: signal.confidence,
        score: signal.score,
        market: tradingMarket,
        tradingMode: tradingMode
      });
    } catch (error: any) {
      this.logger.error('Failed to save order to database', {}, error);
      // Continue - order was placed successfully even if save failed
    }

    // 9. Return success
    this.logger.info('Trade executed successfully', {
      orderId: orderResult.orderId,
      symbol: signal.symbol,
      side: signal.action,
      quantity: quantity,
      status: orderResult.status,
      market: tradingMarket,
      tradingMode: tradingMode
    });

    return {
      executed: true,
      order: orderResult,
      market: tradingMarket
    };
  }

  /**
   * Set default trade size in USDT
   */
  setDefaultTradeSize(sizeUSDT: number): void {
    this.defaultTradeSize = sizeUSDT;
    this.logger.info('Default trade size updated', { sizeUSDT });
  }

  /**
   * Get default trade size in USDT
   */
  getDefaultTradeSize(): number {
    return this.defaultTradeSize;
  }
}
