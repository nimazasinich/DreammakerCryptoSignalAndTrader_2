import { Logger } from '../core/Logger.js';
import { TrainingEngine } from './TrainingEngine.js';
import { ExplorationStrategies } from './ExplorationStrategies.js';
import { TensorFlowModel } from './TensorFlowModel.js';
import { FeatureEngineering } from './FeatureEngineering.js';
import { MarketData } from '../types/index.js';

export interface BullBearPrediction {
  probabilities: {
    bull: number;
    bear: number;
    neutral: number;
  };
  confidence: number;
  action: 'LONG' | 'SHORT' | 'HOLD';
  reasoning: string[];
  features: number[];
  uncertainty: number;
}

export interface GoalConfig {
  type: 'crypto_bull_bear' | 'volatility_prediction' | 'regime_classification';
  thresholds: {
    enterLong: number;
    enterShort: number;
    abstain: number;
  };
  riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class BullBearAgent {
  private static instance: BullBearAgent;
  private logger = Logger.getInstance();
  private trainingEngine = TrainingEngine.getInstance();
  private exploration = ExplorationStrategies.getInstance();
  private tensorFlowModel = TensorFlowModel.getInstance();
  private featureEngineering = FeatureEngineering.getInstance();

  private goalConfig: GoalConfig = {
    type: 'crypto_bull_bear',
    thresholds: {
      enterLong: 0.6,
      enterShort: 0.6,
      abstain: 0.5
    },
    riskTolerance: 'MEDIUM'
  };

  private isInitialized = false;
  private mcDropoutSamples = 20;
  private useTensorFlow = false;

  private constructor() {}

  static getInstance(): BullBearAgent {
    if (!BullBearAgent.instance) {
      BullBearAgent.instance = new BullBearAgent();
    }
    return BullBearAgent.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Try to initialize TensorFlow.js model
      if (this.tensorFlowModel.isTensorFlowAvailable()) {
        try {
          // Try to load existing model
          const loaded = await this.tensorFlowModel.loadModel();
          
          if (!loaded) {
            // Build new model if none exists
            await this.tensorFlowModel.buildModel({
              inputSize: 50,
              outputSize: 3,
              hiddenLayers: [128, 64, 32],
              dropoutRate: 0.3,
              learningRate: 0.001
            });
          }
          
          this.useTensorFlow = true;
          this.logger.info('TensorFlow.js model initialized');
        } catch (error) {
          this.logger.warn('TensorFlow.js initialization failed, using simulation mode', {}, error as Error);
          this.useTensorFlow = false;
        }
      }

      // Initialize traditional training engine as fallback
      await this.trainingEngine.initializeNetwork('hybrid', 50, 3);
      
      this.isInitialized = true;
      this.logger.info('Bull/Bear agent initialized', {
        goalType: this.goalConfig.type,
        thresholds: this.goalConfig.thresholds,
        tensorFlowMode: this.useTensorFlow
      });
    } catch (error) {
      this.logger.error('Failed to initialize Bull/Bear agent', {}, error as Error);
      throw error;
    }
  }

  updateGoalConfig(config: Partial<GoalConfig>): void {
    this.goalConfig = { ...this.goalConfig, ...config };
    this.logger.info('Goal configuration updated', this.goalConfig);
  }

  async predict(marketData: MarketData[], currentGoal?: string): Promise<BullBearPrediction> {
    if (!this.isInitialized) {
      console.error('Bull/Bear agent not initialized');
    }

    try {
      // Extract features from market data
      const features = this.extractFeatures(marketData);
      
      // Perform Monte Carlo Dropout for uncertainty quantification
      const mcPredictions = await this.performMCDropout(features);
      
      // Calculate mean probabilities and uncertainty
      const meanProbs = this.calculateMeanProbabilities(mcPredictions);
      const uncertainty = this.calculateUncertainty(mcPredictions);
      
      // Determine action based on probabilities and thresholds
      const action = this.determineAction(meanProbs);
      
      // Generate reasoning
      const reasoning = this.generateReasoning(features, meanProbs, action);
      
      // Calculate confidence (inverse of uncertainty)
      const confidence = Math.max(0, 1 - uncertainty);

      const prediction: BullBearPrediction = {
        probabilities: meanProbs,
        confidence,
        action,
        reasoning,
        features,
        uncertainty
      };

      this.logger.debug('Bull/Bear prediction generated', {
        action,
        bullProb: meanProbs.bull.toFixed(3),
        bearProb: meanProbs.bear.toFixed(3),
        confidence: confidence.toFixed(3),
        uncertainty: uncertainty.toFixed(3)
      });

      return prediction;
    } catch (error) {
      this.logger.error('Failed to generate prediction', {}, error as Error);
      throw error;
    }
  }

  private extractFeatures(marketData: MarketData[]): number[] {
    if (marketData.length === 0) {
      console.error('No market data provided');
    }

    try {
      // Use FeatureEngineering for comprehensive feature extraction
      const technicalIndicators = this.featureEngineering.calculateTechnicalIndicators(marketData);
      const smcFeatures = this.featureEngineering.extractSMCFeatures(marketData);
      
      const features: number[] = [];

      // Price features
      const latest = marketData[marketData.length - 1];
      features.push(latest.close, latest.high, latest.low, latest.volume);

      // Technical indicators
      features.push(technicalIndicators.rsi);
      features.push(technicalIndicators.macd.macd);
      features.push(technicalIndicators.macd.signal);
      features.push(technicalIndicators.macd.histogram);
      features.push(...technicalIndicators.sma);
      features.push(...technicalIndicators.ema);
      features.push(technicalIndicators.bollingerBands.upper);
      features.push(technicalIndicators.bollingerBands.middle);
      features.push(technicalIndicators.bollingerBands.lower);
      features.push(technicalIndicators.atr);
      features.push(technicalIndicators.obv);

      // SMC features (simplified)
      if (smcFeatures.liquidityZones && (smcFeatures.liquidityZones?.length || 0) > 0) {
        const zone = smcFeatures.liquidityZones[0];
        features.push(zone.price, zone.volume, zone.strength);
      } else {
        features.push(0, 0, 0);
      }

      // Returns and momentum
      if ((marketData?.length || 0) >= 2) {
        const prevClose = marketData[marketData.length - 2].close;
        features.push((latest.close - prevClose) / prevClose);
        
        // Volume ratio
        if ((marketData?.length || 0) >= 20) {
          const avgVolume = marketData.slice(-20).reduce((sum, d) => sum + d.volume, 0) / 20;
          features.push(latest.volume / avgVolume);
        } else {
          features.push(1);
        }
      } else {
        features.push(0, 1);
      }

      // Pad to 50 features
      while (features.length < 50) {
        features.push(0);
      }

      return features.slice(0, 50);
    } catch (error) {
      this.logger.warn('Feature engineering failed, using simple features', {}, error as Error);
      // Fallback to simple features
      const latest = marketData[marketData.length - 1];
      const simpleFeatures = [
        latest.close, latest.high, latest.low, latest.volume
      ];
      
      while (simpleFeatures.length < 50) {
        simpleFeatures.push(0);
      }
      
      return simpleFeatures.slice(0, 50);
    }
  }

  private calculateSMA(data: MarketData[]): number {
    return data.reduce((sum, d) => sum + d.close, 0) / data.length;
  }

  private calculateATR(data: MarketData[]): number {
    if (data.length < 2) return 0;
    
    let atr = 0;
    for (let i = 1; i < data.length; i++) {
      const tr = Math.max(
        data[i].high - data[i].low,
        Math.abs(data[i].high - data[i - 1].close),
        Math.abs(data[i].low - data[i - 1].close)
      );
      atr += tr;
    }
    return atr / (data.length - 1);
  }

  private async performMCDropout(features: number[]): Promise<number[][]> {
    if (this.useTensorFlow && this.tensorFlowModel.isLoaded()) {
      try {
        // Use real TensorFlow.js model with Monte Carlo Dropout
        return await this.tensorFlowModel.predictWithMCDropout(features, this.mcDropoutSamples);
      } catch (error) {
        this.logger.warn('TensorFlow prediction failed, using training engine fallback', {}, error as Error);
        // Fallback to training engine instead of random
        return await this.fallbackToTrainingEngine(features);
      }
    }
    
    // Use training engine fallback instead of random simulation
    return await this.fallbackToTrainingEngine(features);
  }

  /**
   * Fallback to training engine for predictions (better than random)
   */
  private async fallbackToTrainingEngine(features: number[]): Promise<number[][]> {
    const predictions: number[][] = [];
    
    try {
      // Get parameters from training engine
      const parameters = this.trainingEngine.getParameters();
      
      if (parameters.length === 0) {
        // If no trained parameters, use simplified heuristic
        return [this.simulateForwardPass(features)]; // Last resort fallback - wrap in array
      }
      
      // Use trained model for predictions
      for (let i = 0; i < this.mcDropoutSamples; i++) {
        // Apply dropout for Monte Carlo sampling
        const dropoutRate = 0.3;
        const maskedFeatures = (features || []).map(f => 
          Math.random() < dropoutRate ? 0 : f
        );
        
        // Forward pass through network
        let output = maskedFeatures;
        for (const layerWeights of parameters) {
          const layerOutput: number[] = new Array(layerWeights[0]?.length || 3).fill(0);
          
          for (let j = 0; j < layerOutput.length; j++) {
            let sum = 0;
            for (let k = 0; k < output.length; k++) {
              sum += output[k] * (layerWeights[k]?.[j] || 0);
            }
            layerOutput[j] = sum;
          }
          
          // Apply activation
          output = (layerOutput || []).map(val => val > 0 ? val : val * 0.01); // LeakyReLU
        }
        
        // Normalize to probabilities (softmax-like)
        const maxVal = Math.max(...output);
        const expValues = (output || []).map(val => Math.exp(val - maxVal));
        const sumExp = expValues.reduce((a, b) => a + b, 0);
        const probs = (expValues || []).map(val => val / sumExp);
        
        predictions.push(probs.slice(0, 3)); // Ensure 3 outputs
      }
      
      return predictions;
    } catch (error) {
      this.logger.warn('Training engine fallback failed, using simulation', {}, error as Error);
      // Last resort: use simulation - wrap in array to match return type
      return [this.simulateForwardPass(features)];
    }
  }

  private simulateForwardPass(features: number[]): number[] {
    // Last resort fallback: use technical analysis-based prediction
    try {
      return this.calculateTechnicalPrediction(features);
    } catch (error) {
      this.logger.warn('Technical prediction failed, using simple heuristic', {}, error as Error);
      return this.calculateSimplePrediction(features);
    }
  }

  /**
   * Calculate simple prediction based on price momentum
   */
  private calculateSimplePrediction(features: number[]): number[] {
    // Features: [close, high, low, volume, rsi, macd, ...]
    // Simple heuristic: if price change > 0, bullish; else bearish
    const priceChange = features[10] || 0; // Index 10 typically contains price change
    const volumeRatio = features[9] || 1;
    
    // Normalize price change
    const normalizedChange = Math.max(-1, Math.min(1, priceChange * 10));
    
    let bullProb = 0.33 + normalizedChange * 0.33;
    let bearProb = 0.33 - normalizedChange * 0.33;
    let neutralProb = 0.34;
    
    // Adjust based on volume
    if (volumeRatio > 1.5) {
      bullProb += 0.1;
      bearProb -= 0.05;
    } else if (volumeRatio < 0.5) {
      neutralProb += 0.1;
    }
    
    // Normalize probabilities
    const total = bullProb + bearProb + neutralProb;
    return [
      Math.max(0, Math.min(1, bullProb / total)),
      Math.max(0, Math.min(1, bearProb / total)),
      Math.max(0, Math.min(1, neutralProb / total))
    ];
  }

  /**
   * Calculate technical prediction using RSI-like indicators
   */
  private calculateTechnicalPrediction(features: number[]): number[] {
    // Features contain RSI at index (typically 4)
    const rsi = features[4] || 50; // Default to neutral if not available
    const macd = features[5] || 0; // MACD value
    const macdSignal = features[6] || 0; // MACD signal

    let bullProb = 0.33;
    let bearProb = 0.33;
    let neutralProb = 0.34;

    // RSI-based prediction
    if (rsi < 30) {
      // Oversold - bullish (ensure strict inequality with epsilon)
      const eps = 1e-6;
      bullProb += 0.3 + eps;
      bearProb -= 0.15;
      neutralProb -= 0.15 + eps;
    } else if (rsi > 70) {
      // Overbought - bearish (ensure strict inequality with epsilon)
      const eps = 1e-6;
      bearProb += 0.3 + eps;
      bullProb -= 0.15;
      neutralProb -= 0.15 + eps;
    } else {
      // Neutral zone
      neutralProb += 0.1;
    }

    // MACD-based adjustment
    if (macd > macdSignal) {
      // Bullish crossover
      bullProb += 0.1;
      bearProb -= 0.05;
    } else if (macd < macdSignal) {
      // Bearish crossover
      bearProb += 0.1;
      bullProb -= 0.05;
    }

    // Normalize probabilities and ensure strict inequalities are maintained
    let total = bullProb + bearProb + neutralProb;
    let normalized = [
      Math.max(0, Math.min(1, bullProb / total)),
      Math.max(0, Math.min(1, bearProb / total)),
      Math.max(0, Math.min(1, neutralProb / total))
    ];

    // Re-normalize to ensure sum = 1.0 exactly
    const sum = normalized.reduce((a, b) => a + b, 0);
    return (normalized || []).map(v => v / sum);
  }

  private calculateMeanProbabilities(predictions: number[][]): { bull: number; bear: number; neutral: number } {
    const mean = predictions.reduce(
      (acc, pred) => ({
        bull: acc.bull + pred[0],
        bear: acc.bear + pred[1],
        neutral: acc.neutral + pred[2]
      }),
      { bull: 0, bear: 0, neutral: 0 }
    );

    const count = predictions.length;
    return {
      bull: mean.bull / count,
      bear: mean.bear / count,
      neutral: mean.neutral / count
    };
  }

  private calculateUncertainty(predictions: number[][]): number {
    // Calculate variance across MC samples
    const mean = this.calculateMeanProbabilities(predictions);
    
    let variance = 0;
    for (const pred of predictions) {
      variance += Math.pow(pred[0] - mean.bull, 2);
      variance += Math.pow(pred[1] - mean.bear, 2);
      variance += Math.pow(pred[2] - mean.neutral, 2);
    }
    
    return Math.sqrt(variance / (predictions.length * 3));
  }

  private determineAction(probabilities: { bull: number; bear: number; neutral: number }): 'LONG' | 'SHORT' | 'HOLD' {
    const { bull, bear, neutral } = probabilities;
    const { enterLong, enterShort, abstain } = this.goalConfig.thresholds;

    if (bull > enterLong && bull > bear && bull > neutral) {
      return 'LONG';
    } else if (bear > enterShort && bear > bull && bear > neutral) {
      return 'SHORT';
    } else {
      return 'HOLD';
    }
  }

  private generateReasoning(features: number[], probabilities: { bull: number; bear: number; neutral: number }, action: string): string[] {
    const reasoning: string[] = [];
    
    reasoning.push(`Bull probability: ${(probabilities.bull * 100).toFixed(1)}%`);
    reasoning.push(`Bear probability: ${(probabilities.bear * 100).toFixed(1)}%`);
    reasoning.push(`Neutral probability: ${(probabilities.neutral * 100).toFixed(1)}%`);
    
    if (action === 'LONG') {
      reasoning.push('Strong bullish signal detected');
      reasoning.push('Price momentum and volume support upward movement');
    } else if (action === 'SHORT') {
      reasoning.push('Strong bearish signal detected');
      reasoning.push('Price momentum and volume indicate downward pressure');
    } else {
      reasoning.push('Uncertain market conditions');
      reasoning.push('Waiting for clearer directional signal');
    }
    
    // Add technical reasoning based on features
    const priceChange = features[10] || 0;
    if (Math.abs(priceChange) > 0.02) {
      reasoning.push(`Significant price movement: ${(priceChange * 100).toFixed(2)}%`);
    }
    
    const volumeRatio = features[9] || 1;
    if (volumeRatio > 1.5) {
      reasoning.push('Above-average volume confirms price movement');
    } else if (volumeRatio < 0.5) {
      reasoning.push('Below-average volume suggests weak conviction');
    }
    
    return reasoning;
  }

  async trainOnMarketData(marketData: MarketData[], labels: number[]): Promise<void> {
    if (!this.isInitialized) {
      console.error('Bull/Bear agent not initialized');
    }

    try {
      // Extract features from market data
      const features = (marketData || []).map(data => this.extractFeatures([data]));
      
      // Convert labels to categorical format (one-hot encoding)
      const categoricalLabels = (labels || []).map(label => {
        if (label > 0) return [1, 0, 0]; // Bull
        if (label < 0) return [0, 1, 0]; // Bear
        return [0, 0, 1]; // Neutral
      });

      // Train with TensorFlow.js if available
      if (this.useTensorFlow && this.tensorFlowModel.isLoaded()) {
        try {
          const metrics = await this.tensorFlowModel.train(
            features,
            categoricalLabels,
            1, // epochs
            32, // batch size
            0.2 // validation split
          );

          // Save model after training
          await this.tensorFlowModel.saveModel();

          this.logger.info('TensorFlow.js training completed', {
            dataPoints: marketData.length,
            loss: metrics[0]?.loss.toFixed(6),
            accuracy: metrics[0]?.accuracy.toFixed(4)
          });

          return;
        } catch (error) {
          this.logger.warn('TensorFlow training failed, using fallback', {}, error as Error);
          this.useTensorFlow = false;
        }
      }

      // Fallback to traditional training engine
      const actions = (labels || []).map(label => label > 0 ? 1 : (label < 0 ? 2 : 0));
      const rewards = (labels || []).map(label => label);
      
      this.trainingEngine.addMarketDataExperiences(marketData, actions, rewards);
      const metrics = await this.trainingEngine.trainEpoch();
      
      const lastMetric = metrics[metrics.length - 1];
      const avgLoss = typeof lastMetric?.loss === 'object' ? lastMetric.loss.mse : lastMetric?.loss;
      const avgAccuracy = typeof lastMetric?.accuracy === 'object' ? lastMetric.accuracy.directional : lastMetric?.accuracy;

      this.logger.info('Training completed on market data (fallback mode)', {
        dataPoints: marketData.length,
        avgLoss: avgLoss?.toFixed(6),
        avgAccuracy: avgAccuracy?.toFixed(3)
      });
    } catch (error) {
      this.logger.error('Failed to train on market data', {}, error as Error);
      throw error;
    }
  }

  getModelStatistics(): {
    isInitialized: boolean;
    isTraining: boolean;
    trainingState: any;
    experienceBufferSize: number;
    tensorFlowAvailable: boolean;
    usingTensorFlow: boolean;
    modelSummary: any;
    trainingHistory: any[];
  } {
    return {
      isInitialized: this.isInitialized,
      isTraining: this.trainingEngine.isTraining(),
      trainingState: this.trainingEngine.getTrainingState(),
      experienceBufferSize: this.trainingEngine.getExperienceBufferStatistics().size,
      tensorFlowAvailable: this.tensorFlowModel.isTensorFlowAvailable(),
      usingTensorFlow: this.useTensorFlow,
      modelSummary: this.tensorFlowModel.getModelSummary(),
      trainingHistory: this.tensorFlowModel.getTrainingHistory().slice(-10) // Last 10 epochs
    };
  }

  /**
   * Save the current model
   */
  async saveModel(): Promise<void> {
    if (this.useTensorFlow) {
      await this.tensorFlowModel.saveModel();
    }
  }

  /**
   * Load a saved model
   */
  async loadModel(): Promise<boolean> {
    if (this.tensorFlowModel.isTensorFlowAvailable()) {
      const loaded = await this.tensorFlowModel.loadModel();
      if (loaded) {
        this.useTensorFlow = true;
        this.isInitialized = true;
      }
      return loaded;
    }
    return false;
  }
}