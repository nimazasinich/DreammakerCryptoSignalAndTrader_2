// Core Types for BOLT AI Cryptocurrency Neural Agent System

export interface MarketData {
  symbol: string;
  timestamp: Date | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timeframe?: string;
  interval?: string;
  trades?: number;
  change24h?: number;
  changePercent24h?: number;
  price?: number;
  lastUpdated?: Date;
}

export enum ConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  ERROR = 'error'
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface FormState {
  isSubmitting: boolean;
  isValid: boolean;
  errors: ValidationError[];
}

export interface AISignal {
  id: string;
  symbol: string;
  timestamp: number;
  signalType: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-100
  probability: {
    bull: number;
    bear: number;
    neutral: number;
  };
  reasoning: string[];
  technicalScore: number;
  sentimentScore: number;
  whaleScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  targetPrice?: number;
  stopLoss?: number;
  expectedProfitLoss: number;
}

export interface TechnicalIndicators {
  sma?: number[];
  sma20?: number;
  ema?: number[];
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  bb?: {
    upper: number;
    lower: number;
  };
  bollingerBands?: {
    upper: number;
    middle: number;
    lower: number;
  };
  atr?: number;
  obv?: number;
}

export interface SmartMoneyFeatures {
  liquidityZones: Array<{
    price: number;
    volume: number;
    strength: number;
    type: 'ACCUMULATION' | 'DISTRIBUTION';
  }>;
  orderBlocks: Array<{
    high: number;
    low: number;
    timestamp: number;
    type: 'BULLISH' | 'BEARISH';
  }>;
  fairValueGaps: Array<{
    upper: number;
    lower: number;
    timestamp: number;
    filled: boolean;
    fillProbability: number;
  }>;
  breakOfStructure: {
    detected: boolean;
    type: 'BULLISH_BOS' | 'BEARISH_BOS';
    strength: number;
    displacement: number;
  };
  strength?: number; // Overall strength of smart money features
}

export interface ElliottWaveAnalysis {
  currentWave: {
    type: 'IMPULSE' | 'CORRECTIVE';
    wave: string; // '1', '2', '3', '4', '5', 'A', 'B', 'C'
    degree: 'MINUTE' | 'MINOR' | 'INTERMEDIATE' | 'PRIMARY';
  };
  completionProbability: number;
  confidence?: number; // Confidence in the wave analysis
  nextExpectedDirection: 'UP' | 'DOWN' | 'SIDEWAYS';
  waveStructure: Array<{
    wave: string;
    start: number;
    end: number;
    price: number;
    timestamp: number;
  }>;
}

export interface HarmonicPattern {
  type: 'GARTLEY' | 'BAT' | 'BUTTERFLY' | 'CRAB' | 'ABCD';
  points: {
    X: { price: number; timestamp: number };
    A: { price: number; timestamp: number };
    B: { price: number; timestamp: number };
    C: { price: number; timestamp: number };
    D?: { price: number; timestamp: number };
  };
  fibonacciLevels: Array<{
    level: number;
    price: number;
    type: 'RETRACEMENT' | 'EXTENSION';
  }>;
  prz: { // Potential Reversal Zone
    upper: number;
    lower: number;
    confluence: number;
  };
  completionProbability: number;
  confidence?: number; // Confidence in the pattern
  reliabilityScore: number;
}

export interface SentimentData {
  symbol: string;
  timestamp: number;
  overallScore: number; // -100 to +100
  value?: number; // Alternative to overallScore (for compatibility)
  score?: number; // Another alternative to overallScore (for compatibility)
  classification?: string; // Classification label (for compatibility)
  confidence?: number; // Confidence level (0-1)
  sources: {
    twitter: number;
    reddit: number;
    news: number;
    fearGreedIndex: number;
    googleTrends: number;
  };
  velocity: number; // Rate of sentiment change
  momentum: number; // Sentiment + historical trend
  newsImpact: Array<{
    headline: string;
    source: string;
    timestamp: number;
    impact: number;
    category: 'REGULATORY' | 'PARTNERSHIP' | 'TECHNICAL' | 'MARKET_ANALYSIS';
  }>;
}

export interface WhaleActivity {
  symbol: string;
  timestamp: number;
  largeTransactions: Array<{
    amount: number;
    direction: 'IN' | 'OUT';
    exchange: string;
    timestamp: number;
    walletCluster?: string;
  }>;
  exchangeFlows: {
    netFlow: number; // Positive = inflow, Negative = outflow
    reserves: number;
    reserveChange: number;
  };
  onChainMetrics: {
    activeAddresses: number;
    hodlerBehavior: {
      longTermHolders: number;
      shortTermHolders: number;
      supply: {
        longTerm: number;
        shortTerm: number;
      };
    };
    networkValue: number;
    hashRate?: number; // For PoW coins
    stakingMetrics?: { // For PoS coins
      totalStaked: number;
      stakingReward: number;
      validatorCount: number;
    };
  };
}

export interface Opportunity {
  id: string;
  symbol: string;
  detectionTime: number;
  patternType: string;
  confidence: number;
  technicalScore: number;
  sentimentScore: number;
  whaleScore: number;
  combinedScore: number;
  targetPrice: number;
  stopLoss: number;
  expectedReturn: number;
  riskReward: number;
  status: 'NEW' | 'MONITORING' | 'TRIGGERED' | 'CLOSED' | 'EXPIRED';
  reasoning: string[];
  similarHistoricalPatterns: Array<{
    timestamp: number;
    outcome: 'SUCCESS' | 'FAILURE';
    actualReturn: number;
  }>;
}

export interface TrainingMetrics {
  epoch: number;
  timestamp: number;
  mse?: number;
  mae?: number;
  r2?: number;
  learningRate: number;
  gradientNorm: number;
  resetEvents?: number;
  modelVersion?: string;
  directionalAccuracy?: number;
  seed?: number;
  // Loss metrics (can be object or number for backward compatibility)
  loss?: number | {
    mse: number;
    mae: number;
    rSquared: number;
  };
  // Accuracy metrics (can be object or number for backward compatibility)
  accuracy?: number | {
    directional: number;
    classification: number;
  };
  stabilityMetrics?: {
    lossVariance?: number;
    gradientStability?: number;
    predictionConsistency?: number;
    nanCount?: number;
    infCount?: number;
    resetCount?: number;
  };
  explorationStats?: {
    epsilon?: number;
    temperature?: number;
    explorationRate?: number;
    explorationRatio?: number;
    exploitationRatio?: number;
  };
}

export interface PredictionData {
  symbol: string;
  bullishProbability: number;
  bearishProbability: number;
  neutralProbability: number;
  confidence: number;
  prediction: 'BULL' | 'BEAR' | 'NEUTRAL';
  riskScore: number;
  timestamp: number;
  timeframe?: string;
  targetPrice?: number;
  stopLoss?: number;
}

export interface TradingDecision {
  action: 'LONG' | 'SHORT' | 'FLAT';
  bullProbability: number;
  bearProbability: number;
  neutralProbability: number;
  confidence: number;
  uncertainty: number;
  riskGate: boolean;
  reasoning: string[];
}

export interface CandlestickData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  impact: 'high' | 'medium' | 'low';
}

export interface PortfolioPosition {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  allocation: number;
}

export interface AIConfig {
  initializer: { type: string; mode?: string; gain?: number };
  activations: { preClip: number; postClip: number; leakySlope?: number };
  optimizer: { type: string; lr: number; beta1?: number; beta2?: number; weightDecay?: number };
  stability: {
    clip: { useGlobalNorm: boolean; maxNorm: number };
    instability: { spikeFactor: number; gradientSpikeFactor: number; nanReset: boolean; lrDecayOnReset: number };
  };
  replay: { enabled: boolean; capacity: number; batchSize: number; prioritized: boolean };
  exploration: { mode: string; start: number; end: number; decaySteps: number };
  thresholds: { enterLong: number; enterShort: number; abstain: number };
}

export interface BacktestTrade {
  id?: string;
  runId?: string;
  symbol: string;
  timeframe?: string;
  entryTime: Date | number;
  exitTime: Date | number;
  entryPrice: number;
  exitPrice: number;
  side: 'LONG' | 'SHORT';
  confidence: number;
  regime: 'BULL' | 'BEAR' | 'NEUTRAL';
  pnl: number;
  drawdown?: number;
}

export interface BacktestResult {
  runId?: string;
  symbol: string;
  timeframe: string;
  startDate: Date;
  endDate: Date;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  directionalAccuracy: number;
  var95: number;
  trades: BacktestTrade[];
  totalReturn?: number;
  annualizedReturn?: number;
}

// Tuning Types
export interface TuningMetrics {
  sharpe?: number | null;
  winRate?: number | null;
  pnl?: number | null;
}

export interface ScoringConfig {
  version: string;
  weights: Record<string, number>;
  categories?: {
    core?: { weight: number; detectors: string[] };
    smc?: { weight: number; detectors: string[] };
    patterns?: { weight: number; detectors: string[] };
    sentiment?: { weight: number; detectors: string[] };
    ml?: { weight: number; detectors: string[] };
  };
  thresholds?: {
    buyScore: number;
    sellScore: number;
    minConfidence: number;
  };
}

export interface TuningRunResult {
  id: string;
  mode: 'grid' | 'ga';
  startedAt: string;
  finishedAt: string | null;
  metric: 'sharpe' | 'winRate' | 'pnl';
  baselineMetrics: TuningMetrics | null;
  bestCandidate: {
    config: ScoringConfig;
    metrics: TuningMetrics;
  } | null;
  candidatesTested: number;
  error?: string | null;
}

export interface TuningConfig {
  enabled: boolean;
  mode: 'grid' | 'ga';
  maxCandidates: number;
  maxGenerations: number;
  populationSize: number;
  metric: 'sharpe' | 'winRate' | 'pnl';
  backtestDefaults: {
    symbolUniverse: string[];
    timeframe: string;
    lookbackDays: number;
    initialBalance: number;
  };
  promotion: {
    autoPromote: boolean;
    tunedConfigPath: string;
  };
}

export interface SystemHealth {
  timestamp: number;
  performance: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  };
  connectivity: {
    binanceStatus: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
    binanceLatency: number;
    databaseStatus: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
    redisStatus: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  };
  dataQuality: {
    marketDataFreshness: number; // Seconds since last update
    missingDataPoints: number;
    validationErrors: number;
  };
  aiModel: {
    status: 'TRAINING' | 'READY' | 'ERROR';
    lastTraining: number;
    predictionLatency: number;
    accuracy: number;
  };
}

export interface Alert {
  id: string;
  symbol: string;
  type: 'PRICE' | 'VOLUME' | 'TECHNICAL' | 'AI_SIGNAL' | 'SENTIMENT' | 'WHALE';
  condition: string;
  threshold: number;
  currentValue: number;
  triggered: boolean;
  triggerTime?: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  actions: Array<'NOTIFICATION' | 'EMAIL' | 'TELEGRAM' | 'TRADE_SIGNAL'>;
  cooldownPeriod: number; // Minutes
  lastTriggered?: number;
}

// ====== Strategy & Trading Update Types ======

/** Direction type for market direction */
export type Direction = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

/** Action type for trading decisions */
export type Action = 'BUY' | 'SELL' | 'HOLD';

/** Detector output with signed score */
export interface DetectorOutput {
  score: number; // [-1..+1]
  meta?: Record<string, unknown>;
}

/** Component contribution in scoring */
export interface Component {
  name: string;
  raw: number;
  weight: number;
  signed: number;
}

/** Timeframe result with components */
export interface TFResult {
  tf: string;
  direction: Direction;
  final_score: number; // [0..1]
  components: Component[];
}

/** Confluence information (AI + Tech + Context) */
export interface ConfluenceInfo {
  enabled: boolean;
  score: number; // [0..1]
  agreement: number; // [0..1]
  ai: number; // [0..1]
  tech: number; // [0..1]
  context: number; // [0..1]
  passed: boolean;
}

/** Entry plan for futures trading */
export interface EntryPlan {
  mode: 'FIXED' | 'ATR' | 'STRUCT';
  sl: number;
  tp: number[];
  ladder: number[];
  trailing?: {
    enabled: boolean;
    startAtTP1: boolean;
    atrK: number;
  };
  leverage?: number;
}

/** Context snapshot (sentiment, news, whales) */
export interface ContextSnapshot {
  sentiment01: number; // [0..1]
  news01: number; // [0..1]
  whales01?: number; // [0..1]
  raw?: Record<string, unknown>;
}

/** Enhanced scoring snapshot with confluence, entry plan, and context */
export interface ScoringSnapshot {
  symbol: string;
  results: TFResult[];
  direction: Direction;
  final_score: number; // [0..1]
  action: Action;
  rationale: string;
  confluence?: ConfluenceInfo;
  entryPlan?: EntryPlan;
  context?: ContextSnapshot;
  timestamp?: number;
}

/** Exchange credentials configuration */
export interface ExchangeCredential {
  exchange: 'kucoin' | 'binance' | 'okx' | 'bybit';
  apiKey: string;
  secret: string;
  passphrase?: string;
  isDefault: boolean;
}

/** Strategy template for StrategyLab */
export interface StrategyTemplate {
  id: string;
  name: string;
  description?: string;
  config: {
    scoringWeights?: Record<string, number>;
    strategyConfig?: any;
  };
  createdAt: number;
}

// ====== End Strategy & Trading Update Types ======

export interface ApiConfig {
  binance: {
    apiKey: string;
    secretKey: string;
    testnet: boolean;
    rateLimits: {
      requestsPerSecond: number;
      dailyLimit: number;
    };
  };
  kucoin?: {
    apiKey: string;
    secretKey: string;
    passphrase: string;
    testnet: boolean;
    rateLimits: {
      requestsPerSecond: number;
      requestsPerMinute: number;
    };
  };
  telegram: {
    botToken: string;
    chatId: string;
  };
  database: {
    path: string;
    encrypted: boolean;
    backupEnabled: boolean;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  exchange?: {
    name?: string;
    demoMode?: boolean;
    realDataMode?: boolean;
    primarySource?: string;
    fallbackSources?: string[];
    tradingEnabled?: boolean;
    preferredExchange?: 'binance' | 'kucoin';
  };
  marketData?: {
    symbols?: string[];
    updateInterval?: number;
    newsUpdateInterval?: number;
    sentimentUpdateInterval?: number;
  };
  analysis?: {
    rsiPeriod?: number;
    trendAnalysis?: boolean;
    autoTrading?: boolean;
  };
  apis?: {
    coinmarketcap?: {
      enabled?: boolean;
      key?: string;
      baseUrl?: string;
    };
    cryptocompare?: {
      enabled?: boolean;
      key?: string;
      baseUrl?: string;
    };
    newsapi?: {
      enabled?: boolean;
      key?: string;
      baseUrl?: string;
    };
    cryptopanic?: {
      enabled?: boolean;
      key?: string;
      baseUrl?: string;
    };
    coingecko?: {
      enabled?: boolean;
      key?: string;
      baseUrl?: string;
    };
    etherscan?: {
      enabled?: boolean;
      key?: string;
      baseUrl?: string;
    };
    bscscan?: {
      enabled?: boolean;
      key?: string;
      baseUrl?: string;
    };
    tronscan?: {
      enabled?: boolean;
      key?: string;
      baseUrl?: string;
    };
    alternative?: {
      enabled?: boolean;
      key?: string;
      baseUrl?: string;
    };
    clankapp?: {
      enabled?: boolean;
      key?: string;
      baseUrl?: string;
    };
    huggingface?: {
      enabled?: boolean;
      key?: string;
      baseUrl?: string;
      datasetsBaseUrl?: string;
      primaryModel?: string;
      fallbackModel?: string;
      datasets?: Record<string, string>;
    };
    [key: string]: any; // Allow other API configs
  };
  apiPriority?: string[];
  cache?: {
    ttl?: {
      market_data?: number;
      news?: number;
      sentiment?: number;
      fear_greed?: number;
      social?: number;
      hf_ohlcv?: number;
      hf_sentiment?: number;
      [key: string]: number | undefined;
    };
  };
  dynamicWeighting?: {
    updateInterval?: number;
    minWeight?: number;
    maxWeight?: number;
    accuracyFactor?: number;
    freshnessFactor?: number;
    qualityFactor?: number;
    volatilityFactor?: number;
  };
}

// ====== Trading Engine Types ======

/** Trade signal from various sources */
export interface TradeSignal {
  source: 'strategy-pipeline' | 'live-scoring' | 'manual';
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence?: number | null;
  score?: number | null;
  timestamp: number;
  market?: TradingMarket;
}

/** Trade execution result */
export interface TradeExecutionResult {
  executed: boolean;
  reason?: string;
  order?: PlaceOrderResult | null;
  market?: TradingMarket;
}

/** Order placement parameters */
export interface PlaceOrderParams {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  type?: 'MARKET';
  leverage?: number;
  reduceOnly?: boolean;
  market?: TradingMarket;
}

/** Order placement result */
export interface PlaceOrderResult {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  status: 'FILLED' | 'PENDING' | 'REJECTED';
  price?: number;
  timestamp: number;
  error?: string;
}

/** Position result from exchange */
export interface PositionResult {
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  markPrice: number;
  leverage: number;
  unrealizedPnl: number;
  liquidationPrice: number;
  marginMode: 'CROSS' | 'ISOLATED';
}

/** Account information from exchange */
export interface AccountInfo {
  availableBalance: number;
  accountEquity: number;
  unrealisedPNL: number;
  marginBalance: number;
}

/** Risk guard configuration for a specific market */
export interface MarketRiskConfig {
  maxPositionSizeUSDT: number;
  maxDailyLossUSDT: number;
  maxOpenPositions: number;
  stopLossMultiplier?: number;
  takeProfitMultiplier?: number;
  leverage?: number;
  minAccountBalanceUSDT: number;
  maxRiskPerTradePercent: number;
  requireMarketData: boolean;
}

/** Risk guard configuration (legacy single config or new dual config) */
export interface RiskGuardConfig {
  // Legacy single config fields (for backwards compatibility)
  maxPositionSizeUSDT?: number;
  maxDailyLossUSDT?: number;
  maxOpenPositions?: number;
  stopLossMultiplier?: number;
  takeProfitMultiplier?: number;
  leverage?: number;
  minAccountBalanceUSDT?: number;
  maxRiskPerTradePercent?: number;
  requireMarketData?: boolean;

  // New dual-mode config
  spot?: MarketRiskConfig;
  futures?: MarketRiskConfig;
}

/** Risk check input */
export interface RiskCheckInput {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantityUSDT: number;
  market?: TradingMarket;
}

/** Risk check result */
export interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
}

// ====== End Trading Engine Types ======

// ====== System Control & Status Types ======

/** Trading mode */
export type TradingMode = 'OFF' | 'DRY_RUN' | 'TESTNET';

/** Trading market type */
export type TradingMarket = 'SPOT' | 'FUTURES' | 'BOTH';

/** System configuration with feature flags and modes */
export interface SystemConfig {
  features: {
    liveScoring: boolean;
    backtest: boolean;
    autoTuning: boolean;
    autoTrade: boolean;
    manualTrade: boolean;
  };
  modes: {
    environment: 'DEV' | 'STAGING' | 'PROD';
    trading: TradingMode;
  };
  trading?: {
    environment: 'DEV' | 'STAGING' | 'PROD';
    mode: TradingMode;
    market: TradingMarket;
  };
}

/** System status response aggregating all subsystems */
export interface SystemStatusResponse {
  environment: 'DEV' | 'STAGING' | 'PROD';
  features: {
    liveScoring: boolean;
    backtest: boolean;
    autoTuning: boolean;
    autoTrade: boolean;
    manualTrade: boolean;
  };
  trading: {
    mode: TradingMode;
    market?: TradingMarket;
    health: 'ok' | 'unreachable' | 'off' | 'unknown';
  };
  liveScoring: {
    enabled: boolean;
    streaming: boolean;
    lastScoreTimestamp: number | null;
  };
  tuning: {
    hasRun: boolean;
    lastMetric: {
      metric: 'sharpe' | 'winRate' | 'pnl' | null;
      value: number | null;
    };
  };
  dataSource?: {
    primarySource: string;
    availableSources: string[];
    overrides: {
      primarySource: string | null;
    };
  };
}

export type PrimaryDataSource = 'huggingface' | 'binance' | 'kucoin' | 'mixed';

export interface DataSourceProviderConfig {
  enabled: boolean;
  baseUrl?: string;
  timeout?: number;
  userAgent?: string;
  notes?: string;
  strategy?: 'balanced' | 'failover';
}

export interface DataSourceConfigResponse {
  ok: boolean;
  primarySource: PrimaryDataSource;
  availableSources: PrimaryDataSource[];
  overrides: {
    primarySource: PrimaryDataSource | null;
  };
  huggingface: DataSourceProviderConfig & {
    baseUrl: string;
    timeout: number;
    userAgent: string;
  };
  binance?: DataSourceProviderConfig;
  kucoin?: DataSourceProviderConfig;
  mixed?: DataSourceProviderConfig;
  runtimeOverrideSupported?: boolean;
  timestamp?: number;
}

// ====== End System Control & Status Types ======

// Re-export strategy pipeline types
export * from './strategyPipeline';