/**
 * Futures Trading Types
 * Provider-agnostic types for futures trading operations
 */

export type FuturesSide = 'long' | 'short' | 'buy' | 'sell';
export type FuturesOrderType = 'limit' | 'market';
export type MarginMode = 'cross' | 'isolated';
export type OrderStatus = 'pending' | 'active' | 'filled' | 'cancelled' | 'rejected';

export interface FuturesPosition {
  id?: string | number;
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  markPrice: number;
  leverage: number;
  unrealizedPnl: number;
  liquidationPrice: number;
  marginMode: MarginMode;
  marginUsed?: number;
  marginAvailable?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface FuturesOrder {
  id?: string | number;
  orderId?: string; // Exchange order ID
  symbol: string;
  side: FuturesSide;
  type: FuturesOrderType;
  qty: number;
  price?: number;
  leverage?: number;
  stopLoss?: number;
  takeProfit?: number;
  reduceOnly?: boolean;
  status?: OrderStatus;
  filledQty?: number;
  avgFillPrice?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface LeverageSettings {
  id?: string | number;
  symbol: string;
  leverage: number;
  marginMode: MarginMode;
  createdAt?: number;
  updatedAt?: number;
}

export interface FundingRate {
  id?: string | number;
  symbol: string;
  fundingRate: number;
  fundingTime: number;
  markPrice: number;
  indexPrice: number;
  createdAt?: number;
}

export interface FuturesAccountBalance {
  availableBalance: number;
  accountEquity: number;
  unrealisedPNL: number;
  marginBalance: number;
  positionMargin?: number;
  orderMargin?: number;
}

export interface FuturesOrderbook {
  bids: Array<[string, string]>;
  asks: Array<[string, string]>;
  timestamp: number;
}
