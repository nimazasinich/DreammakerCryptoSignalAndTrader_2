// src/interfaces/ITradingService.ts

export interface Order {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price?: number;
  type: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  timestamp: number;
}

export interface Position {
  id: string;
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  timestamp: number;
}

export interface MarketAnalysis {
  symbol: string;
  currentPrice: number;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  support: number;
  resistance: number;
  rsi: number;
  recommendation: string;
  timestamp: number;
}

export interface ITradingService {
  /**
   * Analyze market conditions
   */
  analyzeMarket(symbol: string): Promise<MarketAnalysis>;

  /**
   * Create a new order
   */
  createOrder(order: Omit<Order, 'id' | 'status' | 'timestamp'>): Promise<Order>;

  /**
   * Cancel an order
   */
  cancelOrder(orderId: string): Promise<void>;

  /**
   * Get all orders
   */
  getOrders(filters?: { status?: string; symbol?: string }): Promise<Order[]>;

  /**
   * Get all positions
   */
  getPositions(): Promise<Position[]>;

  /**
   * Get portfolio analysis
   */
  getPortfolioAnalysis(): Promise<{
    totalPositions: number;
    totalValue: number;
    totalPnL: number;
    positions: Position[];
  }>;
}

