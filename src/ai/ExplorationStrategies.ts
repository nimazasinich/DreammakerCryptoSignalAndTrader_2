import { Logger } from '../core/Logger.js';

export interface ExplorationConfig {
  strategy: 'epsilon_greedy' | 'temperature' | 'entropy_guided';
  // Epsilon-greedy parameters
  initialEpsilon: number;
  finalEpsilon: number;
  decaySteps: number;
  // Temperature parameters
  initialTemperature: number;
  finalTemperature: number;
  temperatureDecay: number;
  // Entropy parameters
  entropyThreshold: number;
  uncertaintyWeight: number;
}

export interface ExplorationState {
  currentStep: number;
  currentEpsilon: number;
  currentTemperature: number;
  explorationCount: number;
  exploitationCount: number;
  totalActions: number;
}

export class ExplorationStrategies {
  private static instance: ExplorationStrategies;
  private logger = Logger.getInstance();
  private config: ExplorationConfig = {
    strategy: 'epsilon_greedy',
    initialEpsilon: 0.2,
    finalEpsilon: 0.02,
    decaySteps: 50000,
    initialTemperature: 1.0,
    finalTemperature: 0.1,
    temperatureDecay: 0.995,
    entropyThreshold: 0.5,
    uncertaintyWeight: 0.3
  };

  private constructor() {}

  static getInstance(): ExplorationStrategies {
    if (!ExplorationStrategies.instance) {
      ExplorationStrategies.instance = new ExplorationStrategies();
    }
    return ExplorationStrategies.instance;
  }

  updateConfig(config: Partial<ExplorationConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Exploration strategies config updated', this.config);
  }

  /**
   * Initialize exploration state
   */
  initializeState(): ExplorationState {
    const state: ExplorationState = {
      currentStep: 0,
      currentEpsilon: this.config.initialEpsilon,
      currentTemperature: this.config.initialTemperature,
      explorationCount: 0,
      exploitationCount: 0,
      totalActions: 0
    };

    this.logger.info('Exploration state initialized', {
      strategy: this.config.strategy,
      initialEpsilon: this.config.initialEpsilon,
      initialTemperature: this.config.initialTemperature
    });

    return state;
  }

  /**
   * Select action based on exploration strategy
   */
  selectAction(
    qValues: number[],
    state: ExplorationState,
    uncertainties?: number[]
  ): {
    action: number;
    isExploration: boolean;
    updatedState: ExplorationState;
    actionInfo: {
      strategy: string;
      epsilon?: number;
      temperature?: number;
      entropy?: number;
    };
  } {
    state.currentStep += 1;
    state.totalActions += 1;

    let action: number = 0;
    let isExploration: boolean = false;
    const actionInfo: any = { strategy: this.config.strategy };

    switch (this.config.strategy) {
      case 'epsilon_greedy':
        const result = this.epsilonGreedyAction(qValues, state);
        action = result.action;
        isExploration = result.isExploration;
        actionInfo.epsilon = result.epsilon;
        break;

      case 'temperature':
        const tempResult = this.temperatureBasedAction(qValues, state);
        action = tempResult.action;
        isExploration = tempResult.isExploration;
        actionInfo.temperature = tempResult.temperature;
        break;

      case 'entropy_guided':
        const entropyResult = this.entropyGuidedAction(qValues, state, uncertainties);
        action = entropyResult.action;
        isExploration = entropyResult.isExploration;
        actionInfo.entropy = entropyResult.entropy;
        break;

      default:
        console.error(`Unknown exploration strategy: ${this.config.strategy}`);
        action = qValues.indexOf(Math.max(...qValues));
        isExploration = false;
    }

    // Update counters
    if (isExploration) {
      state.explorationCount += 1;
    } else {
      state.exploitationCount += 1;
    }

    this.logger.debug('Action selected', {
      action,
      isExploration,
      strategy: this.config.strategy,
      explorationRatio: state.explorationCount / state.totalActions,
      ...actionInfo
    });

    return {
      action,
      isExploration,
      updatedState: state,
      actionInfo
    };
  }

  /**
   * Epsilon-greedy action selection with decay
   */
  private epsilonGreedyAction(qValues: number[], state: ExplorationState): {
    action: number;
    isExploration: boolean;
    epsilon: number;
  } {
    // Update epsilon with linear decay
    const decayProgress = Math.min(state.currentStep / this.config.decaySteps, 1.0);
    state.currentEpsilon = this.config.initialEpsilon - 
                          (this.config.initialEpsilon - this.config.finalEpsilon) * decayProgress;

    const isExploration = Math.random() < state.currentEpsilon;
    let action: number;

    if (isExploration) {
      // Random action
      action = Math.floor(Math.random() * qValues.length);
    } else {
      // Greedy action (argmax)
      action = qValues.indexOf(Math.max(...qValues));
    }

    return {
      action,
      isExploration,
      epsilon: state.currentEpsilon
    };
  }

  /**
   * Temperature-based softmax action selection
   */
  private temperatureBasedAction(qValues: number[], state: ExplorationState): {
    action: number;
    isExploration: boolean;
    temperature: number;
  } {
    // Update temperature with exponential decay
    state.currentTemperature = Math.max(
      this.config.finalTemperature,
      state.currentTemperature * this.config.temperatureDecay
    );

    // Softmax with temperature
    const scaledQValues = (qValues || []).map(q => q / state.currentTemperature);
    const maxQ = Math.max(...scaledQValues);
    const expValues = (scaledQValues || []).map(q => Math.exp(q - maxQ)); // Numerical stability
    const sumExp = expValues.reduce((sum, exp) => sum + exp, 0);
    const probabilities = (expValues || []).map(exp => exp / sumExp);

    // Sample from probability distribution
    const random = Math.random();
    let cumulativeProb = 0;
    let action = 0;

    for (let i = 0; i < probabilities.length; i++) {
      cumulativeProb += probabilities[i];
      if (random <= cumulativeProb) {
        action = i;
        break;
      }
    }

    // Determine if this is exploration (not the greedy action)
    const greedyAction = qValues.indexOf(Math.max(...qValues));
    const isExploration = action !== greedyAction;

    return {
      action,
      isExploration,
      temperature: state.currentTemperature
    };
  }

  /**
   * Entropy-guided exploration for uncertainty regions
   */
  private entropyGuidedAction(
    qValues: number[], 
    state: ExplorationState, 
    uncertainties?: number[]
  ): {
    action: number;
    isExploration: boolean;
    entropy: number;
  } {
    // Calculate entropy of Q-values
    const softmaxProbs = this.softmax(qValues);
    const entropy = -softmaxProbs.reduce((sum, p) => sum + p * Math.log(p + 1e-8), 0);

    // Use uncertainty if provided, otherwise use entropy
    const uncertainty = uncertainties ? Math.max(...uncertainties) : entropy;
    
    // Decide exploration based on entropy threshold
    const shouldExplore = entropy > this.config.entropyThreshold || 
                         uncertainty > this.config.uncertaintyWeight;

    let action: number;
    let isExploration: boolean;

    if (shouldExplore) {
      // Explore in uncertain regions
      if (uncertainties) {
        // Select action with highest uncertainty
        action = uncertainties.indexOf(Math.max(...uncertainties));
      } else {
        // Random exploration
        action = Math.floor(Math.random() * qValues.length);
      }
      isExploration = true;
    } else {
      // Exploit with greedy action
      action = qValues.indexOf(Math.max(...qValues));
      isExploration = false;
    }

    return {
      action,
      isExploration,
      entropy
    };
  }

  /**
   * Softmax function for probability calculation
   */
  private softmax(values: number[]): number[] {
    const maxVal = Math.max(...values);
    const expValues = (values || []).map(v => Math.exp(v - maxVal));
    const sumExp = expValues.reduce((sum, exp) => sum + exp, 0);
    return (expValues || []).map(exp => exp / sumExp);
  }

  /**
   * Get exploration statistics
   */
  getStatistics(state: ExplorationState): {
    explorationRatio: number;
    exploitationRatio: number;
    currentEpsilon: number;
    currentTemperature: number;
    totalActions: number;
    decayProgress: number;
  } {
    const explorationRatio = state.totalActions > 0 ? state.explorationCount / state.totalActions : 0;
    const exploitationRatio = state.totalActions > 0 ? state.exploitationCount / state.totalActions : 0;
    const decayProgress = Math.min(state.currentStep / this.config.decaySteps, 1.0);

    return {
      explorationRatio,
      exploitationRatio,
      currentEpsilon: state.currentEpsilon,
      currentTemperature: state.currentTemperature,
      totalActions: state.totalActions,
      decayProgress
    };
  }

  /**
   * Test exploration strategies
   */
  testExplorationStrategies(): {
    passed: boolean;
    testResults: Array<{
      strategy: string;
      explorationRatio: number;
      consistentDecay: boolean;
      validActions: boolean;
    }>;
  } {
    const strategies: Array<ExplorationConfig['strategy']> = ['epsilon_greedy', 'temperature', 'entropy_guided'];
    const testResults = [];
    let allPassed = true;

    for (const strategy of strategies) {
      const originalConfig = { ...this.config };
      this.config.strategy = strategy;

      const state = this.initializeState();
      const qValues = [0.1, 0.8, 0.3, 0.6]; // Test Q-values
      const uncertainties = [0.2, 0.9, 0.1, 0.4]; // Test uncertainties

      let explorationCount = 0;
      let validActions = true;

      // Run 1000 action selections
      for (let i = 0; i < 1000; i++) {
        const result = this.selectAction(qValues, state, uncertainties);
        
        if (result.action < 0 || result.action >= qValues.length) {
          validActions = false;
        }
        
        if (result.isExploration) {
          explorationCount++;
        }
      }

      const explorationRatio = explorationCount / 1000;
      
      // Check if decay is working (for epsilon-greedy and temperature)
      let consistentDecay = true;
      if (strategy === 'epsilon_greedy') {
        consistentDecay = state.currentEpsilon < this.config.initialEpsilon;
      } else if (strategy === 'temperature') {
        consistentDecay = state.currentTemperature < this.config.initialTemperature;
      }

      const passed = validActions && explorationRatio > 0 && explorationRatio < 1;
      
      testResults.push({
        strategy,
        explorationRatio,
        consistentDecay,
        validActions
      });

      if (!passed) {
        allPassed = false;
      }

      // Restore original config
      this.config = originalConfig;
    }

    this.logger.info('Exploration strategies test completed', {
      passed: allPassed,
      testCount: testResults.length
    });

    return { passed: allPassed, testResults };
  }
}