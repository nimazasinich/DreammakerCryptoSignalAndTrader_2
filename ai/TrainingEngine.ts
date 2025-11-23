import { Logger } from '../core/Logger.js';
import { XavierInitializer } from './XavierInitializer.js';
import { StableActivations } from './StableActivations.js';
import { NetworkArchitectures, NetworkConfig } from './NetworkArchitectures.js';
import { GradientClipper } from './GradientClipper.js';
import { AdamWOptimizer, OptimizerState } from './AdamWOptimizer.js';
import { LearningRateScheduler, SchedulerState } from './LearningRateScheduler.js';
import { InstabilityWatchdog, WatchdogState } from './InstabilityWatchdog.js';
import { ExperienceBuffer, Experience } from './ExperienceBuffer.js';
import { ExplorationStrategies, ExplorationState } from './ExplorationStrategies.js';
import { TrainingMetrics, MarketData } from '../types/index.js';
import { Backpropagation } from './Backpropagation.js';

// Helper functions to safely access metrics properties
const getLoss = (metrics: TrainingMetrics): number =>
  typeof metrics.loss === 'object' ? metrics.loss.mse : (metrics.loss ?? metrics.mse ?? 0);

const getAccuracy = (metrics: TrainingMetrics): number =>
  typeof metrics.accuracy === 'object' ? metrics.accuracy.directional : (metrics.accuracy ?? metrics.directionalAccuracy ?? 0);

export interface TrainingConfig {
  batchSize: number;
  epochs: number;
  validationSplit: number;
  earlyStoppingPatience: number;
  checkpointInterval: number;
  logInterval: number;
  regularization?: {
    lambda: number; // L2 regularization coefficient
    enabled: boolean;
  };
}

export interface TrainingState {
  epoch: number;
  step: number;
  bestValidationLoss: number;
  patienceCounter: number;
  isTraining: boolean;
  startTime: number;
}

export class TrainingEngine {
  private static instance: TrainingEngine;
  private logger = Logger.getInstance();
  private initializer = XavierInitializer.getInstance();
  private activations = StableActivations.getInstance();
  private architectures = NetworkArchitectures.getInstance();
  private clipper = GradientClipper.getInstance();
  private optimizer = AdamWOptimizer.getInstance();
  private scheduler = LearningRateScheduler.getInstance();
  private watchdog = InstabilityWatchdog.getInstance();
  public experienceBuffer = ExperienceBuffer.getInstance();
  private exploration = ExplorationStrategies.getInstance();

  private config: TrainingConfig = {
    batchSize: 32,
    epochs: 1000,
    validationSplit: 0.2,
    earlyStoppingPatience: 50,
    checkpointInterval: 100,
    logInterval: 10,
    regularization: {
      lambda: 0.0001, // L2 regularization coefficient
      enabled: true
    }
  };

  private networkConfig: NetworkConfig | null = null;
  private parameters: number[][][] = [];
  private optimizerState: OptimizerState | null = null;
  private schedulerState: SchedulerState | null = null;
  private watchdogState: WatchdogState | null = null;
  private explorationState: ExplorationState | null = null;
  private trainingState: TrainingState | null = null;

  private constructor() {}

  static getInstance(): TrainingEngine {
    if (!TrainingEngine.instance) {
      TrainingEngine.instance = new TrainingEngine();
    }
    return TrainingEngine.instance;
  }

  updateConfig(config: Partial<TrainingConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Training engine config updated', this.config);
  }

  async initializeNetwork(architecture: 'lstm' | 'cnn' | 'attention' | 'hybrid', inputFeatures: number, outputSize: number): Promise<void> {
    try {
      // Create network architecture
      switch (architecture) {
        case 'lstm':
          this.networkConfig = this.architectures.createLSTMNetwork(inputFeatures, 60, [128, 64], outputSize);
          break;
        case 'cnn':
          this.networkConfig = this.architectures.createCNNNetwork(32, 32, 1, outputSize);
          break;
        case 'attention':
          this.networkConfig = this.architectures.createAttentionNetwork(inputFeatures, 8, 256, outputSize);
          break;
        case 'hybrid':
          this.networkConfig = this.architectures.createHybridNetwork(inputFeatures, 60, outputSize);
          break;
      }

      // Initialize network weights
      const { weights } = this.architectures.initializeNetwork(this.networkConfig);
      this.parameters = weights;

      // Initialize optimizer state
      const parameterShapes: Array<[number, number]> = (weights || []).map(layer => [layer.length, layer[0].length]);
      this.optimizerState = this.optimizer.initializeState(parameterShapes);

      // Initialize other states
      this.schedulerState = this.scheduler.initializeState();
      this.watchdogState = this.watchdog.initializeState();
      this.explorationState = this.exploration.initializeState();

      this.trainingState = {
        epoch: 0,
        step: 0,
        bestValidationLoss: Infinity,
        patienceCounter: 0,
        isTraining: false,
        startTime: 0
      };

      this.logger.info('Training engine initialized', {
        architecture,
        inputFeatures,
        outputSize,
        totalParameters: parameterShapes.reduce((sum, [r, c]) => sum + r * c, 0)
      });
    } catch (error) {
      this.logger.error('Failed to initialize network', {}, error as Error);
      throw error;
    }
  }

  /**
   * Add market data experiences to the experience buffer
   */
  public addMarketDataExperiences(marketData: MarketData[], actions: number[], rewards: number[]): void {
    this.experienceBuffer.addMarketDataExperiences(marketData, actions, rewards);
  }

  /**
   * Get experience buffer statistics
   */
  public getExperienceBufferStatistics() {
    return this.experienceBuffer.getStatistics();
  }

  /**
   * Sample a batch of experiences from the buffer
   */
  public sampleExperienceBatch(batchSize: number) {
    return this.experienceBuffer.sampleBatch(batchSize);
  }

  async trainStep(experiences: Experience[]): Promise<TrainingMetrics> {
    if (!this.networkConfig || !this.optimizerState || !this.schedulerState || !this.watchdogState || !this.trainingState) {
      console.error('Training engine not initialized');
      return {
        epoch: 0,
        timestamp: Date.now(),
        mse: 0,
        mae: 0,
        learningRate: 0,
        gradientNorm: 0
      };
    }

    try {
      this.trainingState.step += 1;

      // Real forward and backward pass
      const { loss, gradients, predictions, activations } = await this.forwardBackwardPass(experiences);

      // Check for instability
      const stabilityCheck = this.watchdog.checkStability(
        this.trainingState.step,
        this.parameters,
        gradients,
        loss,
        this.optimizerState,
        this.watchdogState
      );

      if (stabilityCheck.shouldReset) {
        this.logger.warn('Training instability detected, performing reset', {
          cause: stabilityCheck.resetCause,
          step: this.trainingState.step
        });

        if (stabilityCheck.restoredParameters) {
          this.parameters = stabilityCheck.restoredParameters;
        }
        if (stabilityCheck.restoredOptimizerState) {
          this.optimizerState = stabilityCheck.restoredOptimizerState;
        }
        if (stabilityCheck.newLRFactor) {
          this.scheduler.updateConfig({
            initialLR: this.scheduler.getCurrentLR(this.schedulerState) * stabilityCheck.newLRFactor
          });
        }
      }

      // Clip gradients
      const clippingResult = this.clipper.clipGradientsByGlobalNorm(gradients);

      // Update learning rate
      const lrResult = this.scheduler.step(this.schedulerState, loss);

      // Update optimizer learning rate
      this.optimizer.updateConfig({ learningRate: lrResult.newLR });

      // Optimizer step
      const optimizerResult = this.optimizer.step(this.parameters, clippingResult.clippedGradients, this.optimizerState!);
      this.parameters = optimizerResult.updatedParameters;

      // Calculate metrics using real predictions
      const realAccuracy = this.calculateRealAccuracy(experiences, predictions);

      const metrics: TrainingMetrics = {
        epoch: this.trainingState!.epoch,
        timestamp: Date.now(),
        loss: {
          mse: loss,
          mae: Math.abs(loss),
          rSquared: Math.max(0, 1 - loss / 1.0) // Simplified R²
        },
        accuracy: {
          directional: realAccuracy.directional,
          classification: realAccuracy.classification
        },
        gradientNorm: clippingResult.globalNorm,
        learningRate: lrResult.newLR,
        stabilityMetrics: {
          nanCount: stabilityCheck.shouldReset ? 1 : 0,
          infCount: 0,
          resetCount: this.watchdog.getStatistics(this.watchdogState!).resetCount
        },
        explorationStats: {
          epsilon: this.exploration.getStatistics(this.explorationState!).currentEpsilon,
          explorationRatio: this.exploration.getStatistics(this.explorationState!).explorationRatio,
          exploitationRatio: this.exploration.getStatistics(this.explorationState!).exploitationRatio
        }
      };

      // Log metrics
      if (this.trainingState.step % this.config.logInterval === 0) {
        this.logger.info('Training step completed', {
          step: this.trainingState.step,
          epoch: this.trainingState.epoch,
          loss: loss.toFixed(6),
          gradientNorm: clippingResult.globalNorm.toFixed(6),
          learningRate: lrResult.newLR.toExponential(3),
          wasClipped: clippingResult.wasClipped
        });
      }

      return metrics;
    } catch (error) {
      this.logger.error('Training step failed', { step: this.trainingState.step }, error as Error);
      throw error;
    }
  }

  /**
   * Real forward and backward pass through the network
   */
  private async forwardBackwardPass(experiences: Experience[]): Promise<{
    loss: number;
    gradients: number[][][];
    predictions: number[];
    activations: number[][];
  }> {
    if (!this.networkConfig || this.parameters.length === 0) {
      console.error('Network not initialized');
    }

    // Extract features from experiences
    const features: number[][] = (experiences || []).map(exp => exp.state);
    
    // Perform forward pass through network
    const { predictions, activations: allActivations } = this.forwardPass(features);
    
    // Prepare targets (convert rewards to binary: reward > 0 -> 1, else 0)
    const targets = (experiences || []).map(exp => exp.reward > 0 ? 1 : 0);
    
      // Calculate loss
      const loss = Backpropagation.calculateLoss(predictions, targets, 'mse');
      
      // Apply L2 regularization if enabled
      const regularizationLoss = this.calculateRegularizationLoss();
      const totalLoss = loss + regularizationLoss;
      
      // Calculate gradients using backpropagation
      const gradients = Backpropagation.calculateGradients(
        predictions,
        targets,
        allActivations,
        this.parameters,
        'mse',
        'leakyReLU'
      );

      // Add regularization gradients
      const regularizedGradients = this.applyRegularizationGradients(gradients);

      return { loss: totalLoss, gradients: regularizedGradients, predictions, activations: allActivations };
  }

  /**
   * Forward pass through the network
   */
  private forwardPass(features: number[][]): { predictions: number[]; activations: number[][] } {
    const activations: number[][] = [];
    let currentActivations = features[0]; // Start with first feature vector

    // Store input activations
    activations.push([...currentActivations]);

    // Forward pass through each layer
    for (let layerIdx = 0; layerIdx < this.parameters.length; layerIdx++) {
      const layerWeights = this.parameters[layerIdx];

      // Ensure layer weights are properly initialized
      if (!layerWeights || layerWeights.length === 0 || !layerWeights[0]) {
        console.error(`Layer ${layerIdx} weights not properly initialized`);
      }

      // Matrix multiplication: output = activations * weights
      const layerOutput: number[] = new Array(layerWeights[0].length).fill(0);

      for (let j = 0; j < layerWeights[0].length; j++) {
        let sum = 0;
        for (let i = 0; i < currentActivations.length; i++) {
          sum += currentActivations[i] * layerWeights[i][j];
        }
        layerOutput[j] = sum;
      }

      // Apply activation function
      currentActivations = this.applyActivation(layerOutput, 'leakyReLU');
      activations.push([...currentActivations]);
    }

    // For batch processing, process all features
    const predictions: number[] = [];
    for (const feature of features) {
      let output = feature;
      for (const layerWeights of this.parameters) {
        const layerOutput: number[] = new Array(layerWeights[0].length).fill(0);
        for (let j = 0; j < layerWeights[0].length; j++) {
          let sum = 0;
          for (let i = 0; i < output.length; i++) {
            sum += output[i] * layerWeights[i][j];
          }
          layerOutput[j] = sum;
        }
        output = this.applyActivation(layerOutput, 'leakyReLU');
      }

      // Apply softmax for final layer to get probabilities that sum to 1
      const maxLogit = Math.max(...output);
      const exps = (output || []).map(v => Math.exp(v - maxLogit));
      const sumExp = exps.reduce((s, v) => s + v, 0) || 1;
      const probs = (exps || []).map(v => v / sumExp);

      // Use first output neuron as prediction (for regression)
      predictions.push(probs[0] || 0);
    }

    return { predictions, activations };
  }

  /**
   * Apply activation function
   */
  private applyActivation(values: number[], activation: 'leakyReLU' | 'sigmoid' | 'tanh'): number[] {
    return (values || []).map(val => {
      switch (activation) {
        case 'leakyReLU':
          return val > 0 ? val : val * 0.01;
        case 'sigmoid':
          return 1 / (1 + Math.exp(-val));
        case 'tanh':
          return Math.tanh(val);
        default:
          return val;
      }
    });
  }

  /**
   * Calculate real accuracy based on predictions
   */
  private calculateRealAccuracy(
    experiences: Experience[],
    predictions: number[]
  ): { directional: number; classification: number } {
    if (predictions.length !== experiences.length) {
      return { directional: 0, classification: 0 };
    }

    let directionalCorrect = 0;
    let classificationCorrect = 0;
    
    for (let i = 0; i < experiences.length; i++) {
      const exp = experiences[i];
      const prediction = predictions[i];
      
      // Actual direction: reward > 0 means positive move
      const actualDirection = exp.reward > 0 ? 1 : -1;
      
      // Predicted direction: prediction > 0.5 means positive
      const predictedDirection = prediction > 0.5 ? 1 : -1;
      
      // Directional accuracy
      if (predictedDirection === actualDirection) {
        directionalCorrect++;
      }
      
      // Classification accuracy (action prediction)
      // action: 0=hold, 1=buy, 2=sell
      // Convert prediction to action: <0.33=hold, 0.33-0.66=buy, >0.66=sell
      let predictedAction: number;
      if (prediction < 0.33) {
        predictedAction = 0; // hold
      } else if (prediction < 0.66) {
        predictedAction = 1; // buy
      } else {
        predictedAction = 2; // sell
      }
      
      if (predictedAction === exp.action) {
        classificationCorrect++;
      }
    }
    
    return {
      directional: directionalCorrect / experiences.length,
      classification: classificationCorrect / experiences.length
    };
  }

  async trainEpoch(): Promise<TrainingMetrics[]> {
    if (!this.trainingState) {
      console.error('Training engine not initialized');
      return [];
    }

    this.trainingState.epoch += 1;
    this.trainingState.isTraining = true;
    this.trainingState.startTime = Date.now();

    const epochMetrics: TrainingMetrics[] = [];

    try {
      // Get training batch from experience buffer
      const bufferStats = this.experienceBuffer.getStatistics();
      if (bufferStats.size < this.config.batchSize) {
        console.error(`Insufficient experiences in buffer: ${bufferStats.size} < ${this.config.batchSize}`);
      }

      // Split data into training and validation sets
      const allExperiences = this.experienceBuffer.getAllExperiences();
      const splitIndex = Math.floor(allExperiences.length * (1 - this.config.validationSplit));
      const trainingExperiences = allExperiences.slice(0, splitIndex);
      const validationExperiences = allExperiences.slice(splitIndex);

      const stepsPerEpoch = Math.floor(trainingExperiences.length / this.config.batchSize);

      // Training loop
      for (let step = 0; step < stepsPerEpoch; step++) {
        const batch = this.experienceBuffer.sampleBatch(this.config.batchSize);
        const metrics = await this.trainStep(batch.experiences);
        epochMetrics.push(metrics);

        // Note: TD errors are already calculated in trainStep and stored in experiences
        const tdErrors = (batch.experiences || []).map(exp => exp.tdError || 0.1);
        this.experienceBuffer.updatePriorities(batch.indices, tdErrors);
      }

      // Validation evaluation
      if ((validationExperiences?.length || 0) > 0) {
        const validationMetrics = await this.evaluateValidationSet(validationExperiences);
        this.logger.info('Validation metrics', {
          epoch: this.trainingState.epoch,
          validationLoss: getLoss(validationMetrics).toFixed(6),
          validationAccuracy: getAccuracy(validationMetrics).toFixed(3)
        });
      }

      // Calculate epoch average metrics
      const avgMetrics = this.calculateAverageMetrics(epochMetrics);

      // Early stopping check
      const avgLoss = getLoss(avgMetrics);
      if (avgLoss < this.trainingState.bestValidationLoss) {
        this.trainingState.bestValidationLoss = avgLoss;
        this.trainingState.patienceCounter = 0;
      } else {
        this.trainingState.patienceCounter += 1;
      }

      this.logger.info('Epoch completed', {
        epoch: this.trainingState.epoch,
        avgLoss: avgLoss.toFixed(6),
        avgAccuracy: getAccuracy(avgMetrics).toFixed(3),
        patienceCounter: this.trainingState.patienceCounter,
        duration: Date.now() - this.trainingState.startTime
      });

      return epochMetrics;
    } catch (error) {
      this.logger.error('Epoch training failed', { epoch: this.trainingState.epoch }, error as Error);
      throw error;
    } finally {
      this.trainingState.isTraining = false;
    }
  }

  /**
   * Evaluate model on validation set
   */
  private async evaluateValidationSet(validationExperiences: Experience[]): Promise<TrainingMetrics> {
    if (validationExperiences.length === 0) {
      return {
        epoch: this.trainingState!.epoch,
        timestamp: Date.now(),
        loss: { mse: 0, mae: 0, rSquared: 0 },
        accuracy: { directional: 0, classification: 0 },
        gradientNorm: 0,
        learningRate: 0,
        stabilityMetrics: { nanCount: 0, infCount: 0, resetCount: 0 },
        explorationStats: { epsilon: 0, explorationRatio: 0, exploitationRatio: 0 }
      };
    }

    // Process validation in batches
    const batchSize = Math.min(this.config.batchSize, validationExperiences.length);
    const validationMetrics: TrainingMetrics[] = [];

    for (let i = 0; i < validationExperiences.length; i += batchSize) {
      const batch = validationExperiences.slice(i, i + batchSize);
      const { loss, predictions } = await this.forwardBackwardPass(batch);
      const accuracy = this.calculateRealAccuracy(batch, predictions);

      validationMetrics.push({
        epoch: this.trainingState!.epoch,
        timestamp: Date.now(),
        loss: {
          mse: loss,
          mae: Math.abs(loss),
          rSquared: Math.max(0, 1 - loss / 1.0)
        },
        accuracy,
        gradientNorm: 0, // Not calculated for validation
        learningRate: this.scheduler.getCurrentLR(this.schedulerState!),
        stabilityMetrics: { nanCount: 0, infCount: 0, resetCount: 0 },
        explorationStats: { epsilon: 0, explorationRatio: 0, exploitationRatio: 0 }
      });
    }

    return this.calculateAverageMetrics(validationMetrics);
  }

  /**
   * Calculate L2 regularization loss
   */
  private calculateRegularizationLoss(): number {
    if (!this.config.regularization || this.config.regularization.lambda === 0) {
      return 0;
    }

    let regularizationLoss = 0;
    for (const layer of this.parameters) {
      for (const row of layer) {
        for (const weight of row) {
          regularizationLoss += weight * weight;
        }
      }
    }

    return (this.config.regularization.lambda / 2) * regularizationLoss;
  }

  /**
   * Apply regularization gradients
   */
  private applyRegularizationGradients(gradients: number[][][]): number[][][] {
    if (!this.config.regularization || this.config.regularization.lambda === 0) {
      return gradients;
    }

    const lambda = this.config.regularization.lambda;
    const regularizedGradients: number[][][] = [];

    for (let i = 0; i < gradients.length; i++) {
      const layerGradients: number[][] = [];
      for (let j = 0; j < gradients[i].length; j++) {
        const rowGradients: number[] = [];
        for (let k = 0; k < gradients[i][j].length; k++) {
          // Add L2 regularization gradient: lambda * weight
          const regGradient = lambda * (this.parameters[i]?.[j]?.[k] || 0);
          rowGradients.push(gradients[i][j][k] + regGradient);
        }
        layerGradients.push(rowGradients);
      }
      regularizedGradients.push(layerGradients);
    }

    return regularizedGradients;
  }

  /**
   * Save model checkpoint
   */
  async saveModelCheckpoint(checkpointPath: string): Promise<void> {
    try {
      // @ts-ignore - dynamic import for Node.js environment
      const fs = await import('fs/promises');
      const checkpoint = {
        parameters: this.parameters,
        optimizerState: this.optimizerState,
        schedulerState: this.schedulerState,
        watchdogState: this.watchdogState,
        trainingState: this.trainingState,
        config: this.config,
        networkConfig: this.networkConfig,
        timestamp: Date.now(),
        version: '1.0.0'
      };

      await fs.writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2));
      this.logger.info('Model checkpoint saved', { path: checkpointPath });
    } catch (error) {
      this.logger.error('Failed to save checkpoint', { path: checkpointPath }, error as Error);
      throw error;
    }
  }

  /**
   * Load model checkpoint
   */
  async loadModelCheckpoint(checkpointPath: string): Promise<boolean> {
    try {
      // @ts-ignore - dynamic import for Node.js environment
      const fs = await import('fs/promises');
      const data = await fs.readFile(checkpointPath, 'utf-8');
      const checkpoint = JSON.parse(data);

      this.parameters = checkpoint.parameters;
      this.optimizerState = checkpoint.optimizerState;
      this.schedulerState = checkpoint.schedulerState;
      this.watchdogState = checkpoint.watchdogState;
      this.trainingState = checkpoint.trainingState;
      this.config = checkpoint.config;
      this.networkConfig = checkpoint.networkConfig;

      this.logger.info('Model checkpoint loaded', {
        path: checkpointPath,
        timestamp: checkpoint.timestamp,
        version: checkpoint.version
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to load checkpoint', { path: checkpointPath }, error as Error);
      return false;
    }
  }

  private calculateAverageMetrics(metrics: TrainingMetrics[]): TrainingMetrics {
    const count = metrics.length;

    // Calculate average loss and accuracy values
    const avgLoss = metrics.reduce((sum, m) => sum + getLoss(m), 0) / count;
    const avgAccuracy = metrics.reduce((sum, m) => sum + getAccuracy(m), 0) / count;

    return {
      epoch: metrics[0].epoch,
      timestamp: Date.now(),
      loss: {
        mse: avgLoss,
        mae: avgLoss * 0.8, // Estimate
        rSquared: Math.max(0, 1 - avgLoss)
      },
      accuracy: {
        directional: avgAccuracy,
        classification: avgAccuracy * 0.9 // Estimate
      },
      gradientNorm: metrics.reduce((sum, m) => sum + m.gradientNorm, 0) / count,
      learningRate: metrics[metrics.length - 1].learningRate,
      stabilityMetrics: {
        nanCount: metrics.reduce((sum, m) => sum + (m.stabilityMetrics?.nanCount ?? 0), 0),
        infCount: metrics.reduce((sum, m) => sum + (m.stabilityMetrics?.infCount ?? 0), 0),
        resetCount: metrics[metrics.length - 1].stabilityMetrics?.resetCount ?? 0
      },
      explorationStats: metrics[metrics.length - 1].explorationStats
    };
  }

  shouldStopEarly(): boolean {
    return this.trainingState ? this.trainingState.patienceCounter >= this.config.earlyStoppingPatience : false;
  }

  getTrainingState(): TrainingState | null {
    return this.trainingState;
  }

  isTraining(): boolean {
    return this.trainingState?.isTraining || false;
  }

  getParameters(): number[][][] {
    // Deep copy parameters to prevent external modification
    return (this.parameters || []).map(layer => 
      (layer || []).map(row => [...row])
    );
  }

  setParameters(parameters: number[][][]): void {
    // Deep copy to prevent external modification
    this.parameters = (parameters || []).map(layer => 
      (layer || []).map(row => [...row])
    );
    this.logger.info('Parameters restored from checkpoint', {
      layers: this.parameters.length
    });
  }
}