/**
 * Strategy Templates for Easy Customization
 * Copy and modify these templates to create your own trading strategies
 */

export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  category: 'trend' | 'reversal' | 'breakout' | 'scalping' | 'custom';
  parameters: {
    [key: string]: {
      value: number | string | boolean;
      min?: number;
      max?: number;
      step?: number;
      options?: string[];
      description: string;
    };
  };
  conditions: {
    entry: string[];
    exit: string[];
  };
  riskManagement: {
    stopLoss: number;
    takeProfit: number;
    positionSize: number;
    maxDrawdown: number;
  };
}

// ===================================
// TEMPLATE 1: TREND FOLLOWING STRATEGY
// ===================================
export const TrendFollowingTemplate: StrategyTemplate = {
  id: 'trend-following-001',
  name: 'EMA Crossover Trend Following',
  description: 'Classic trend following strategy using EMA crossovers with momentum confirmation',
  category: 'trend',
  parameters: {
    fastEMA: {
      value: 20,
      min: 5,
      max: 50,
      step: 1,
      description: 'Fast EMA period for short-term trend'
    },
    slowEMA: {
      value: 50,
      min: 20,
      max: 200,
      step: 5,
      description: 'Slow EMA period for long-term trend'
    },
    rsiPeriod: {
      value: 14,
      min: 7,
      max: 28,
      step: 1,
      description: 'RSI period for momentum confirmation'
    },
    rsiOverbought: {
      value: 70,
      min: 60,
      max: 80,
      step: 1,
      description: 'RSI overbought threshold'
    },
    rsiOversold: {
      value: 30,
      min: 20,
      max: 40,
      step: 1,
      description: 'RSI oversold threshold'
    },
    volumeMultiplier: {
      value: 1.5,
      min: 1.0,
      max: 3.0,
      step: 0.1,
      description: 'Volume must be X times the average'
    }
  },
  conditions: {
    entry: [
      'Fast EMA crosses above Slow EMA (bullish)',
      'RSI > 50 (momentum confirmation)',
      'Volume > Average Volume * Multiplier',
      'Price above both EMAs'
    ],
    exit: [
      'Fast EMA crosses below Slow EMA',
      'RSI enters overbought territory',
      'Stop loss hit',
      'Take profit target reached'
    ]
  },
  riskManagement: {
    stopLoss: 2.0, // 2% stop loss
    takeProfit: 4.0, // 4% take profit (2:1 risk-reward)
    positionSize: 5.0, // 5% of portfolio
    maxDrawdown: 10.0 // Max 10% drawdown
  }
};

// ===================================
// TEMPLATE 2: MEAN REVERSION STRATEGY
// ===================================
export const MeanReversionTemplate: StrategyTemplate = {
  id: 'mean-reversion-001',
  name: 'Bollinger Band Mean Reversion',
  description: 'Trade oversold/overbought conditions using Bollinger Bands',
  category: 'reversal',
  parameters: {
    bbPeriod: {
      value: 20,
      min: 10,
      max: 50,
      step: 1,
      description: 'Bollinger Bands period'
    },
    bbStdDev: {
      value: 2.0,
      min: 1.5,
      max: 3.0,
      step: 0.1,
      description: 'Standard deviation multiplier'
    },
    rsiPeriod: {
      value: 14,
      min: 7,
      max: 28,
      step: 1,
      description: 'RSI period for confirmation'
    },
    rsiExtreme: {
      value: 25,
      min: 15,
      max: 35,
      step: 1,
      description: 'RSI extreme oversold level (buy signal)'
    }
  },
  conditions: {
    entry: [
      'Price touches or breaks below lower Bollinger Band',
      'RSI < Extreme threshold',
      'Volume above average',
      'Price starts to reverse towards middle band'
    ],
    exit: [
      'Price reaches middle Bollinger Band',
      'Price reaches upper Bollinger Band',
      'RSI > 70',
      'Stop loss hit'
    ]
  },
  riskManagement: {
    stopLoss: 1.5, // 1.5% stop loss (tighter for mean reversion)
    takeProfit: 3.0, // 3% take profit
    positionSize: 3.0, // 3% of portfolio (more conservative)
    maxDrawdown: 8.0 // Max 8% drawdown
  }
};

// ===================================
// TEMPLATE 3: BREAKOUT STRATEGY
// ===================================
export const BreakoutTemplate: StrategyTemplate = {
  id: 'breakout-001',
  name: 'Volume Breakout Strategy',
  description: 'Trade price breakouts from consolidation with volume confirmation',
  category: 'breakout',
  parameters: {
    consolidationPeriod: {
      value: 20,
      min: 10,
      max: 50,
      step: 1,
      description: 'Number of candles to identify consolidation'
    },
    breakoutThreshold: {
      value: 0.5,
      min: 0.2,
      max: 2.0,
      step: 0.1,
      description: 'Percentage above resistance for breakout confirmation'
    },
    volumeMultiplier: {
      value: 2.0,
      min: 1.5,
      max: 3.0,
      step: 0.1,
      description: 'Volume must be X times the average'
    },
    atrMultiplier: {
      value: 1.5,
      min: 1.0,
      max: 3.0,
      step: 0.1,
      description: 'ATR multiplier for stop loss'
    }
  },
  conditions: {
    entry: [
      'Price breaks above resistance level',
      'Volume > Average Volume * Multiplier',
      'Price closes above breakout level',
      'No immediate resistance above'
    ],
    exit: [
      'Price returns below breakout level',
      'Volume decreases significantly',
      'Stop loss (ATR-based) hit',
      'Take profit target reached'
    ]
  },
  riskManagement: {
    stopLoss: 2.5, // 2.5% stop loss
    takeProfit: 7.5, // 7.5% take profit (3:1 risk-reward)
    positionSize: 4.0, // 4% of portfolio
    maxDrawdown: 12.0 // Max 12% drawdown
  }
};

// ===================================
// TEMPLATE 4: SCALPING STRATEGY
// ===================================
export const ScalpingTemplate: StrategyTemplate = {
  id: 'scalping-001',
  name: 'Fast Momentum Scalping',
  description: 'Quick trades on short timeframes with tight stops',
  category: 'scalping',
  parameters: {
    macdFast: {
      value: 12,
      min: 8,
      max: 16,
      step: 1,
      description: 'MACD fast period'
    },
    macdSlow: {
      value: 26,
      min: 20,
      max: 35,
      step: 1,
      description: 'MACD slow period'
    },
    macdSignal: {
      value: 9,
      min: 7,
      max: 12,
      step: 1,
      description: 'MACD signal period'
    },
    rsiPeriod: {
      value: 7,
      min: 5,
      max: 14,
      step: 1,
      description: 'RSI period (faster for scalping)'
    },
    timeframe: {
      value: '5m',
      options: ['1m', '3m', '5m', '15m'],
      description: 'Trading timeframe'
    }
  },
  conditions: {
    entry: [
      'MACD crosses above signal line',
      'RSI crosses above 50',
      'Strong momentum on low timeframe',
      'Price above short-term EMA'
    ],
    exit: [
      'Take profit hit (0.5-1.0%)',
      'Stop loss hit (0.3%)',
      'MACD crosses below signal',
      'Time-based exit (5-15 minutes)'
    ]
  },
  riskManagement: {
    stopLoss: 0.3, // 0.3% stop loss (very tight)
    takeProfit: 0.8, // 0.8% take profit
    positionSize: 10.0, // 10% of portfolio (higher position for small gains)
    maxDrawdown: 5.0 // Max 5% drawdown (strict)
  }
};

// ===================================
// TEMPLATE 5: AI-ENHANCED STRATEGY
// ===================================
export const AIEnhancedTemplate: StrategyTemplate = {
  id: 'ai-enhanced-001',
  name: 'AI Signal + Technical Confirmation',
  description: 'Combine AI predictions with traditional technical indicators',
  category: 'custom',
  parameters: {
    aiConfidenceThreshold: {
      value: 75,
      min: 60,
      max: 95,
      step: 5,
      description: 'Minimum AI confidence percentage'
    },
    technicalConfirmation: {
      value: true,
      description: 'Require technical indicator confirmation'
    },
    emaFast: {
      value: 20,
      min: 10,
      max: 50,
      step: 5,
      description: 'Fast EMA for trend confirmation'
    },
    emaSlow: {
      value: 50,
      min: 30,
      max: 200,
      step: 10,
      description: 'Slow EMA for trend confirmation'
    },
    volumeConfirmation: {
      value: true,
      description: 'Require volume confirmation'
    }
  },
  conditions: {
    entry: [
      'AI signal confidence > Threshold',
      'AI prediction direction matches trend (optional)',
      'Price above fast EMA (for bullish)',
      'Volume above average (if enabled)',
      'No conflicting technical signals'
    ],
    exit: [
      'AI signal reverses',
      'AI confidence drops below threshold',
      'Technical indicators show reversal',
      'Stop loss or take profit hit'
    ]
  },
  riskManagement: {
    stopLoss: 2.0, // 2% stop loss
    takeProfit: 5.0, // 5% take profit
    positionSize: 6.0, // 6% of portfolio
    maxDrawdown: 10.0 // Max 10% drawdown
  }
};

// ===================================
// TEMPLATE 6: CUSTOM EMPTY TEMPLATE
// ===================================
export const CustomTemplate: StrategyTemplate = {
  id: 'custom-001',
  name: 'Your Custom Strategy',
  description: 'Start from scratch and build your own strategy',
  category: 'custom',
  parameters: {
    parameter1: {
      value: 0,
      min: 0,
      max: 100,
      step: 1,
      description: 'Your first parameter'
    },
    parameter2: {
      value: 0,
      min: 0,
      max: 100,
      step: 1,
      description: 'Your second parameter'
    },
    enableFeature: {
      value: false,
      description: 'Enable optional feature'
    }
  },
  conditions: {
    entry: [
      'Define your entry conditions here',
      'Add multiple conditions',
      'Combine different indicators'
    ],
    exit: [
      'Define your exit conditions here',
      'Set stop loss rules',
      'Set take profit rules'
    ]
  },
  riskManagement: {
    stopLoss: 2.0,
    takeProfit: 4.0,
    positionSize: 5.0,
    maxDrawdown: 10.0
  }
};

// Export all templates
export const STRATEGY_TEMPLATES = {
  trendFollowing: TrendFollowingTemplate,
  meanReversion: MeanReversionTemplate,
  breakout: BreakoutTemplate,
  scalping: ScalpingTemplate,
  aiEnhanced: AIEnhancedTemplate,
  custom: CustomTemplate
};

// Helper function to get template by ID
export function getTemplateById(id: string): StrategyTemplate | undefined {
  return Object.values(STRATEGY_TEMPLATES).find(template => template.id === id);
}

// Helper function to get templates by category
export function getTemplatesByCategory(category: string): StrategyTemplate[] {
  return Object.values(STRATEGY_TEMPLATES).filter(template => template.category === category);
}

// Helper function to clone and customize a template
export function cloneTemplate(template: StrategyTemplate, customizations: Partial<StrategyTemplate>): StrategyTemplate {
  return {
    ...template,
    ...customizations,
    id: `${template.id}-custom-${Date.now()}`,
    parameters: {
      ...template.parameters,
      ...(customizations.parameters || {})
    }
  };
}

// Export template categories for UI
export const TEMPLATE_CATEGORIES = [
  { id: 'trend', name: 'Trend Following', description: 'Follow market trends for profit' },
  { id: 'reversal', name: 'Mean Reversion', description: 'Trade oversold/overbought conditions' },
  { id: 'breakout', name: 'Breakout', description: 'Catch price breakouts from consolidation' },
  { id: 'scalping', name: 'Scalping', description: 'Quick trades on short timeframes' },
  { id: 'custom', name: 'Custom', description: 'Build your own strategy' }
];
