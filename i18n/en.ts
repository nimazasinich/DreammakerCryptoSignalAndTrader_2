export const en = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    loading: 'Loading…',
    error: 'Error',
    retry: 'Retry',
  },
  layout: {
    healthLabel: 'Health',
    sidebarOnline: 'System online',
    sidebarDetails: 'Latency < 20ms · AI models active',
    sidebarCompact: 'Online',
    sidebarTagline: 'Neural trading suite',
  },
  navigation: {
    dashboard: 'Dashboard',
    charting: 'Advanced Charting',
    market: 'Market Analysis',
    scanner: 'Market Scanner',
    trading: 'Trading',
    futures: 'Futures Trading',
    training: 'AI Training',
    risk: 'Risk Center',
    backtest: 'Backtesting',
    health: 'System Health',
    settings: 'Settings',
  },
  scanner: {
    title: 'Market Scanner',
    subtitle: 'Deterministic signals generated from consistent factor analysis.',
    actions: {
      refresh: 'Refresh data',
    },
    kpis: {
      healthy: 'Buy signals',
      neutral: 'Hold signals',
      score: 'Average score',
      quality: 'Data quality',
    },
    status: {
      idle: 'Idle',
      loading: 'Refreshing data…',
      error: 'Error',
    },
    table: {
      heading: 'Signal Overview',
      columns: {
        symbol: 'Symbol',
        price: 'Price',
        change: '24h change',
        volume: '24h volume',
        signal: 'Signal',
        score: 'Score',
        reason: 'Reason',
        quality: 'Source',
      },
    },
    quality: {
      live: 'Live market data',
      synthetic: 'Synthetic baseline',
    },
    signals: {
      buy: 'Buy',
      sell: 'Sell',
      hold: 'Hold',
    },
    empty: 'No signals available. Adjust filters or refresh to try again.',
    error: 'Unable to load scanner data. Please try again.',
  },
  training: {
    title: 'AI Training',
    subtitle: 'Design, monitor, and iterate on AI trading models.',
    actions: {
      start: 'Start Training',
      stop: 'Stop',
    },
    config: {
      heading: 'Run Configuration',
      description: 'Define the inputs for this training run. Values are validated to protect model integrity.',
      fields: {
        epochs: 'Epochs',
        batchSize: 'Batch Size',
        learningRate: 'Learning Rate',
        optimizer: 'Optimizer',
        datasetSize: 'Dataset Size',
      },
      errors: {
        required: 'This value is required.',
        positive: 'Enter a value greater than zero.',
        learningRateRange: 'Learning rate must be between 0 and 1.',
      },
    },
    status: {
      idle: 'Idle',
      running: 'Training in progress',
      completed: 'Completed',
    },
    progress: {
      heading: 'Training Progress',
      label: 'Progress',
      epoch: 'Epoch',
      elapsed: 'Elapsed',
      remaining: 'Remaining',
    },
    metrics: {
      heading: 'Training Snapshot',
      loss: 'Training Loss',
      accuracy: 'Accuracy',
      valLoss: 'Validation Loss',
      valAccuracy: 'Validation Accuracy',
    },
    charts: {
      loss: 'Loss curve',
      accuracy: 'Accuracy curve',
    },
    summary: {
      completedTitle: 'Training complete',
      completedSubtitle: 'Model stored and ready to deploy.',
    },
    savedModels: {
      heading: 'Recent Models',
      empty: 'No models saved yet.',
      model: 'Model',
      created: 'Created',
      accuracy: 'Accuracy',
      winRate: 'Win rate',
      trades: 'Trades',
    },
    steps: {
      data: {
        title: 'Data preparation',
        description: 'Clean feature engineering for balanced datasets.',
      },
      optimise: {
        title: 'Hyperparameter tuning',
        description: 'Optimizer, schedule, and regularisation review.',
      },
      train: {
        title: 'Model training',
        description: 'Batch processing with live progress monitoring.',
      },
      evaluate: {
        title: 'Evaluation & export',
        description: 'Validation metrics and deployment readiness.',
      },
    },
  },
  backtest: {
    title: 'Backtesting',
    subtitle: 'Evaluate strategies across multiple markets with deterministic analytics.',
    actions: {
      run: 'Run Backtest',
      reset: 'Clear Results',
    },
    status: {
      idle: 'Idle',
      running: 'Processing historical data…',
      completed: 'Backtest complete',
    },
    progress: {
      heading: 'Execution Progress',
    },
    config: {
      heading: 'Scenario Configuration',
      fields: {
        symbols: 'Symbols (comma separated)',
        lookback: 'Lookback (days)',
        capital: 'Initial capital (USDT)',
        risk: 'Risk per trade (%)',
        slippage: 'Assumed slippage (%)',
      },
      errors: {
        required: 'This value is required.',
        positive: 'Enter a value greater than zero.',
      },
    },
    timeline: {
      data: {
        title: 'Data preparation',
        description: 'Clean OHLCV history and align corporate actions.',
      },
      signals: {
        title: 'Signal modelling',
        description: 'Deterministic factor scoring and ensemble blending.',
      },
      risk: {
        title: 'Risk filters',
        description: 'Sizing, drawdown gates, and volatility ceilings.',
      },
      allocation: {
        title: 'Capital allocation',
        description: 'Position sizing and final decision engine.',
      },
    },
    metrics: {
      heading: 'Performance Overview',
      cagr: 'CAGR',
      sharpe: 'Sharpe ratio',
      drawdown: 'Max drawdown',
      winRate: 'Win rate',
      profitFactor: 'Profit factor',
      trades: 'Trades analysed',
    },
    table: {
      heading: 'Asset Breakdown',
      columns: {
        rank: 'Rank',
        symbol: 'Symbol',
        price: 'Price',
        successRate: 'Success %',
        risk: 'Risk %',
        whaleActivity: 'Whale activity',
        smartMoney: 'Smart money',
        elliottWave: 'Elliott wave',
        priceAction: 'Price action',
        ict: 'ICT levels',
        finalScore: 'Final score',
      },
      empty: 'Run the backtest to see instrument level metrics.',
    },
  },
} as const;

export type Dictionary = typeof en;
