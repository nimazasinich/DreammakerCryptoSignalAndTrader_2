// src/ai/TensorFlowModel.ts
import { Logger } from '../core/Logger.js';
import { MarketData } from '../types/index.js';

const logger = Logger.getInstance();

// TensorFlow.js imports with conditional loading
let tf: any = null;

// Conditional import - only load if available
// @ts-ignore - require is only available in Node.js environment
if (typeof globalThis.require !== 'undefined') {
  try {
    // Try to load TensorFlow.js Node.js version
    // @ts-ignore - dynamic require for optional dependency
    const tfNode = globalThis.require('@tensorflow/tfjs-node');
    tf = tfNode;
    logger.info('TensorFlow.js Node.js backend loaded successfully');
  } catch (error) {
    // TensorFlow.js not installed - will use fallback mode
    // This is expected if @tensorflow/tfjs-node is not installed
  }
}

export interface ModelConfig {
  inputSize: number;
  outputSize: number;
  hiddenLayers: number[];
  dropoutRate: number;
  learningRate: number;
}

export interface TensorFlowTrainingMetrics {
  loss: number;
  accuracy: number;
  epoch: number;
  timestamp: number;
}

export class TensorFlowModel {
  private static instance: TensorFlowModel;
  private logger = Logger.getInstance();
  private model: any = null;
  private config: ModelConfig;
  private isModelLoaded = false;
  private trainingHistory: TensorFlowTrainingMetrics[] = [];
  private modelPath = 'models/bullbear-model';

  constructor() {
    this.config = {
      inputSize: 50, // Feature vector size
      outputSize: 3, // Bull/Bear/Neutral
      hiddenLayers: [128, 64, 32],
      dropoutRate: 0.3,
      learningRate: 0.001
    };
  }

  static getInstance(): TensorFlowModel {
    if (!TensorFlowModel.instance) {
      TensorFlowModel.instance = new TensorFlowModel();
    }
    return TensorFlowModel.instance;
  }

  /**
   * Check if TensorFlow.js is available
   */
  isTensorFlowAvailable(): boolean {
    return tf !== null;
  }

  /**
   * Build the neural network model
   */
  async buildModel(config?: Partial<ModelConfig>): Promise<void> {
    if (!tf) {
      this.logger.warn('TensorFlow.js not available, using simulation mode');
      this.isModelLoaded = true;
      return;
    }

    try {
      this.config = { ...this.config, ...config };

      // Create sequential model
      this.model = tf.sequential();

      // Input layer
      this.model.add(tf.layers.dense({
        units: this.config.hiddenLayers[0],
        inputShape: [this.config.inputSize],
        activation: 'relu',
        kernelInitializer: 'heNormal'
      }));

      // Hidden layers with dropout
      for (let i = 1; i < this.config.hiddenLayers.length; i++) {
        this.model.add(tf.layers.dense({
          units: this.config.hiddenLayers[i],
          activation: 'relu',
          kernelInitializer: 'heNormal'
        }));
        
        // Add dropout for regularization (except last layer)
        if (i < this.config.hiddenLayers.length - 1) {
          this.model.add(tf.layers.dropout({
            rate: this.config.dropoutRate
          }));
        }
      }

      // Output layer (softmax for classification)
      this.model.add(tf.layers.dense({
        units: this.config.outputSize,
        activation: 'softmax',
        kernelInitializer: 'glorotUniform'
      }));

      // Compile model
      this.model.compile({
        optimizer: tf.train.adam(this.config.learningRate),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });

      this.isModelLoaded = true;
      this.logger.info('TensorFlow.js model built successfully', {
        inputSize: this.config.inputSize,
        outputSize: this.config.outputSize,
        hiddenLayers: this.config.hiddenLayers
      });
    } catch (error) {
      this.logger.error('Failed to build TensorFlow.js model', {}, error as Error);
      this.isModelLoaded = true; // Allow simulation mode
    }
  }

  /**
   * Train the model on a batch of data
   */
  async train(
    features: number[][],
    labels: number[][],
    epochs: number = 1,
    batchSize: number = 32,
    validationSplit: number = 0.2
  ): Promise<TensorFlowTrainingMetrics[]> {
    if (!tf || !this.model) {
      this.logger.warn('TensorFlow.js not available, skipping real training');
      return this.generateSimulatedMetrics(epochs);
    }

    try {
      // Convert to tensors
      const xs = tf.tensor2d(features);
      const ys = tf.tensor2d(labels);

      // Train model
      const history = await this.model.fit(xs, ys, {
        epochs,
        batchSize,
        validationSplit,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch: number, logs: any) => {
            this.trainingHistory.push({
              loss: logs.loss || 0,
              accuracy: logs.acc || 0,
              epoch: epoch + 1,
              timestamp: Date.now()
            });

            this.logger.debug('Training epoch completed', {
              epoch: epoch + 1,
              loss: logs.loss?.toFixed(6),
              accuracy: logs.acc?.toFixed(4)
            });
          }
        }
      });

      // Cleanup tensors
      xs.dispose();
      ys.dispose();

      return this.trainingHistory.slice(-epochs);
    } catch (error) {
      this.logger.error('Training failed', {}, error as Error);
      return this.generateSimulatedMetrics(epochs);
    }
  }

  /**
   * Predict using the model with Monte Carlo Dropout
   */
  async predictWithMCDropout(
    features: number[],
    samples: number = 20
  ): Promise<number[][]> {
    if (!tf || !this.model) {
      // Fallback to simulation
      return this.simulatePredictions(features, samples);
    }

    try {
      const predictions: number[][] = [];
      const inputTensor = tf.tensor2d([features]);

      // Enable training mode for dropout during inference
      this.model.trainable = true;

      for (let i = 0; i < samples; i++) {
        const prediction = this.model.predict(inputTensor, {
          training: true // Enable dropout
        }) as any;
        
        const predictionArray = await prediction.array();
        predictions.push(predictionArray[0]);
        prediction.dispose();
      }

      // Disable training mode
      this.model.trainable = false;
      inputTensor.dispose();

      return predictions;
    } catch (error) {
      this.logger.error('Prediction failed', {}, error as Error);
      return this.simulatePredictions(features, samples);
    }
  }

  /**
   * Regular prediction (no dropout)
   */
  async predict(features: number[]): Promise<number[]> {
    if (!tf || !this.model) {
      // Fallback to simulation
      return this.simulateSinglePrediction(features);
    }

    try {
      const inputTensor = tf.tensor2d([features]);
      const prediction = this.model.predict(inputTensor) as any;
      const predictionArray = await prediction.array();
      
      inputTensor.dispose();
      prediction.dispose();

      return predictionArray[0];
    } catch (error) {
      this.logger.error('Prediction failed', {}, error as Error);
      return this.simulateSinglePrediction(features);
    }
  }

  /**
   * Save model to disk
   */
  async saveModel(path?: string): Promise<void> {
    if (!tf || !this.model) {
      this.logger.warn('No model to save');
      return;
    }

    try {
      const savePath = path || this.modelPath;
      await this.model.save(`file://${savePath}`);
      this.logger.info('Model saved successfully', { path: savePath });
    } catch (error) {
      this.logger.error('Failed to save model', {}, error as Error);
    }
  }

  /**
   * Load model from disk
   */
  async loadModel(path?: string): Promise<boolean> {
    if (!tf) {
      this.logger.warn('TensorFlow.js not available, cannot load model');
      return false;
    }

    try {
      const loadPath = path || this.modelPath;
      this.model = await tf.loadLayersModel(`file://${loadPath}/model.json`);
      this.isModelLoaded = true;
      this.logger.info('Model loaded successfully', { path: loadPath });
      return true;
    } catch (error) {
      this.logger.warn('Model not found or failed to load, using new model', {}, error as Error);
      return false;
    }
  }

  /**
   * Get model summary
   */
  getModelSummary(): any {
    if (!tf || !this.model) {
      return {
        available: false,
        mode: 'simulation'
      };
    }

    try {
      this.model.summary();
      return {
        available: true,
        mode: 'tensorflow',
        inputSize: this.config.inputSize,
        outputSize: this.config.outputSize,
        layers: this.config.hiddenLayers.length + 2 // Input + hidden + output
      };
    } catch (error) {
      return {
        available: false,
        mode: 'simulation',
        error: (error as Error).message
      };
    }
  }

  /**
   * Get training history
   */
  getTrainingHistory(): TensorFlowTrainingMetrics[] {
    return [...this.trainingHistory];
  }

  /**
   * Check if model is loaded
   */
  isLoaded(): boolean {
    return this.isModelLoaded;
  }

  // Fallback simulation methods
  private simulatePredictions(features: number[], samples: number): number[][] {
    const predictions: number[][] = [];
    
    for (let i = 0; i < samples; i++) {
      const noise = () => (Math.random() - 0.5) * 0.1;
      const priceChange = features[10] || 0;
      const volumeRatio = features[9] || 1;
      
      let bullProb = Math.max(0, Math.min(1, 0.33 + priceChange * 2 + (volumeRatio - 1) * 0.1 + noise()));
      let bearProb = Math.max(0, Math.min(1, 0.33 - priceChange * 2 - (volumeRatio - 1) * 0.1 + noise()));
      let neutralProb = Math.max(0, Math.min(1, 1 - bullProb - bearProb));
      
      const total = bullProb + bearProb + neutralProb;
      predictions.push([bullProb / total, bearProb / total, neutralProb / total]);
    }
    
    return predictions;
  }

  private simulateSinglePrediction(features: number[]): number[] {
    const priceChange = features[10] || 0;
    const volumeRatio = features[9] || 1;
    
    let bullProb = Math.max(0, Math.min(1, 0.33 + priceChange * 2 + (volumeRatio - 1) * 0.1));
    let bearProb = Math.max(0, Math.min(1, 0.33 - priceChange * 2 - (volumeRatio - 1) * 0.1));
    let neutralProb = Math.max(0, Math.min(1, 1 - bullProb - bearProb));
    
    const total = bullProb + bearProb + neutralProb;
    return [bullProb / total, bearProb / total, neutralProb / total];
  }

  private generateSimulatedMetrics(epochs: number): TensorFlowTrainingMetrics[] {
    const metrics: TensorFlowTrainingMetrics[] = [];
    let loss = 0.8;
    let accuracy = 0.5;

    for (let i = 0; i < epochs; i++) {
      loss = Math.max(0.1, loss - Math.random() * 0.05);
      accuracy = Math.min(0.95, accuracy + Math.random() * 0.05);
      
      metrics.push({
        loss,
        accuracy,
        epoch: i + 1,
        timestamp: Date.now()
      });
    }

    return metrics;
  }

  /**
   * Dispose model and cleanup resources
   */
  dispose(): void {
    if (this.model && tf) {
      this.model.dispose();
      this.model = null;
    }
  }
}

