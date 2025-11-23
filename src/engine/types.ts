// Core types for the signal engine

export type OHLC = {
  t: number;  // timestamp
  o: number;  // open
  h: number;  // high
  l: number;  // low
  c: number;  // close
  v?: number; // volume (optional)
};

export type DetectorScore = {
  detector: 'SMC' | 'Elliott' | 'Harmonic' | 'Technical';
  score: number; // normalized 0..1
  meta?: any;
};

export type SignalAction = 'BUY' | 'SELL' | 'HOLD';

export type SignalSeverity = 'low' | 'medium' | 'high';

export type FinalSignal = {
  id: string;
  symbol: string;
  time: number;
  action: SignalAction;
  score: number; // normalized 0..1
  confidence: number; // normalized 0..1
  reasoning: string[];
  tfBreakdown: Record<string, any>;
  severity: SignalSeverity;
};

export type TimeframeAnalysis = {
  action: SignalAction;
  score: number;
  confidence: number;
  reasoning: string[];
  detectors: DetectorScore[];
  risk: {
    atr: number;
    vol: number;
  };
  severity: SignalSeverity;
};
