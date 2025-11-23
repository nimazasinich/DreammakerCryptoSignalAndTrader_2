import { Logger } from '../core/Logger.js';
import { MarketData, BacktestResult, BacktestTrade } from '../types/index.js';
import { BullBearAgent } from './BullBearAgent.js';

export interface BacktestConfig {
  symbol?: string;
  startDate: number;
  endDate: number;
  initialCapital: number;
  feeRate?: number;
  slippageRate?: number;
  maxPositionSize?: number;
}

export interface Trade {
  id: string;
  symbol: string;
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  direction: 'LONG' | 'SHORT';
  pnl: number;
  fees: number;
  confidence: number;
  reasoning: string[];
}

function toBacktestTrade(t: Trade): BacktestTrade {
  return {
    id: t.id,
    symbol: t.symbol,
    entryTime: new Date(t.entryTime),
    exitTime: new Date(t.exitTime),
    entryPrice: t.entryPrice,
    exitPrice: t.exitPrice,
    side: t.direction,
    confidence: t.confidence,
    regime: 'NEUTRAL',
    pnl: t.pnl
  };
}

export class BacktestEngine {
  private static instance: BacktestEngine;
  private logger = Logger.getInstance();
  private bullBearAgent = BullBearAgent.getInstance();

  private constructor() {}

  static getInstance(): BacktestEngine {
    if (!BacktestEngine.instance) {
      BacktestEngine.instance = new BacktestEngine();
    }
    return BacktestEngine.instance;
  }

  async runBacktest(
    marketData: MarketData[],
    config: BacktestConfig
  ): Promise<BacktestResult> {
    const trades: Trade[] = [];
    let currentCapital = config.initialCapital;
    let currentPosition: { symbol: string; quantity: number; entryPrice: number; entryTime: number } | null = null;

    // Set defaults for optional config parameters
    const feeRate = config.feeRate ?? 0.001;
    const slippageRate = config.slippageRate ?? 0.001;
    const maxPositionSize = config.maxPositionSize ?? 0.95;

    this.logger.info('Starting backtest', {
      dataPoints: marketData.length,
      startDate: new Date(config.startDate).toISOString(),
      endDate: new Date(config.endDate).toISOString(),
      initialCapital: config.initialCapital
    });

    for (let i = 50; i < marketData.length; i++) {
      const currentData = marketData.slice(0, i + 1);
      const currentBar = marketData[i];
      
      try {
        // Get AI prediction
        const prediction = await this.bullBearAgent.predict(currentData.slice(-100));
        
        // Execute trading logic
        if (!currentPosition && prediction.action !== 'HOLD') {
          // Enter position
          const positionSize = Math.min(
            currentCapital * maxPositionSize,
            currentCapital * 0.1 // Max 10% per trade
          );

          const quantity = positionSize / currentBar.close;
          const fees = positionSize * feeRate;
          const slippage = positionSize * slippageRate;

          currentPosition = {
            symbol: currentBar.symbol,
            quantity: prediction.action === 'LONG' ? quantity : -quantity,
            entryPrice: currentBar.close * (1 + (prediction.action === 'LONG' ? slippageRate : -slippageRate)),
            entryTime: typeof currentBar.timestamp === 'number' ? currentBar.timestamp : currentBar.timestamp.getTime()
          };

          currentCapital -= fees + slippage;

        } else if (currentPosition && (prediction.action === 'HOLD' ||
                   (currentPosition.quantity > 0 && prediction.action === 'SHORT') ||
                   (currentPosition.quantity < 0 && prediction.action === 'LONG'))) {
          // Exit position
          const exitPrice = currentBar.close * (1 + (currentPosition.quantity > 0 ? -slippageRate : slippageRate));
          const positionValue = Math.abs(currentPosition.quantity) * exitPrice;
          const fees = positionValue * feeRate;
          const slippage = positionValue * slippageRate;
          
          const pnl = currentPosition.quantity > 0 
            ? (exitPrice - currentPosition.entryPrice) * currentPosition.quantity
            : (currentPosition.entryPrice - exitPrice) * Math.abs(currentPosition.quantity);
          
          const trade: Trade = {
            id: `trade_${trades.length + 1}`,
            symbol: currentPosition.symbol,
            entryTime: currentPosition.entryTime,
            exitTime: typeof currentBar.timestamp === 'number' ? currentBar.timestamp : currentBar.timestamp.getTime(),
            entryPrice: currentPosition.entryPrice,
            exitPrice,
            quantity: currentPosition.quantity,
            direction: currentPosition.quantity > 0 ? 'LONG' : 'SHORT',
            pnl: pnl - fees - slippage,
            fees: fees + slippage,
            confidence: prediction.confidence,
            reasoning: prediction.reasoning
          };
          
          trades.push(trade);
          currentCapital += pnl - fees - slippage;
          currentPosition = null;
        }
      } catch (error) {
        this.logger.error('Error during backtest step', { index: i }, error as Error);
        continue;
      }
    }

    // Calculate performance metrics
    const result = this.calculatePerformanceMetrics(trades, config.initialCapital, currentCapital);
    
    this.logger.info('Backtest completed', {
      totalTrades: trades.length,
      finalCapital: currentCapital,
      winRate: result.winRate,
      sharpeRatio: result.sharpeRatio
    });

    return result;
  }

  private calculatePerformanceMetrics(
    trades: Trade[],
    initialCapital: number,
    _finalCapital: number
  ): BacktestResult {
    const backtestTrades = (trades || []).map(toBacktestTrade);

    if (trades.length === 0) {
      return {
        symbol: 'UNKNOWN',
        timeframe: '1h',
        startDate: new Date(),
        endDate: new Date(),
        totalTrades: 0,
        winRate: 0,
        profitFactor: 0,
        sharpeRatio: 0,
        sortinoRatio: 0,
        maxDrawdown: 0,
        directionalAccuracy: 0,
        var95: 0,
        trades: backtestTrades
      };
    }

    const returns = (trades || []).map(t => t.pnl / initialCapital);
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    
    // Calculate metrics
    const winRate = winningTrades.length / trades.length;
    const avgWin = (winningTrades?.length || 0) > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
    const avgLoss = (losingTrades?.length || 0) > 0 ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length) : 0;
    const profitFactor = avgLoss > 0 ? (avgWin * winningTrades.length) / (avgLoss * losingTrades.length) : 0;
    
    // Sharpe ratio calculation
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const returnStd = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
    const sharpeRatio = returnStd > 0 ? avgReturn / returnStd : 0;
    
    // Max drawdown calculation
    let peak = initialCapital;
    let maxDrawdown = 0;
    let currentCapital = initialCapital;
    
    for (const trade of trades) {
      currentCapital += trade.pnl;
      if (currentCapital > peak) {
        peak = currentCapital;
      }
      const drawdown = (peak - currentCapital) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // VaR calculation (95% confidence)
    const sortedReturns = returns.sort((a, b) => a - b);
    const var95Index = Math.floor(returns.length * 0.05);
    const var95 = sortedReturns[var95Index] || 0;

    return {
      symbol: trades[0]?.symbol || 'UNKNOWN',
      timeframe: '1h',
      startDate: new Date(trades[0].entryTime),
      endDate: new Date(trades[trades.length - 1].exitTime),
      totalTrades: trades.length,
      winRate,
      profitFactor,
      sharpeRatio,
      sortinoRatio: sharpeRatio,
      maxDrawdown,
      directionalAccuracy: winRate,
      var95,
      trades: backtestTrades
    };
  }
}