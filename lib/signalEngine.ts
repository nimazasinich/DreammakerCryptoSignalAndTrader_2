// Stub for backward compatibility with ScannerView
// This is a temporary bridge until ScannerView is migrated to the new engine

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface Signal {
  action: 'BUY' | 'SELL' | 'HOLD';
  strength: number;
  confidence: number;
  reasons: string[];
}

/**
 * Stub function for compatibility
 * TODO: Migrate ScannerView to use the new engine/SignalEngine
 */
export function computeSignal(candles: Candle[]): Signal {
  // Basic stub implementation
  return {
    action: 'HOLD',
    strength: 0.5,
    confidence: 0.5,
    reasons: ['Signal engine stub - real implementation pending']
  };
}
