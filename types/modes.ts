export type DataMode = 'offline' | 'online';
export type TradingMode = 'virtual' | 'real';

export interface ModeState {
  dataMode: DataMode;
  tradingMode: TradingMode;
}

export const DEFAULT_MODE: ModeState = {
  dataMode: 'online',  // Changed to 'online' to use real API data by default
  tradingMode: 'virtual',
};

export function parseDataMode(v: string | null | undefined): DataMode {
  return v === 'online' ? 'online' : 'offline';
}

export function parseTradingMode(v: string | null | undefined): TradingMode {
  return v === 'real' ? 'real' : 'virtual';
}
