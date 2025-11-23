import { Logger } from '../core/Logger.js';
import { XavierInitializer } from './XavierInitializer.js';
import { StableActivations } from './StableActivations.js';

export interface LayerConfig {
  type: 'dense' | 'lstm' | 'cnn' | 'attention';
  inputSize: number;
  outputSize: number;
  activation: 'leakyRelu' | 'sigmoid' | 'tanh' | 'relu' | 'softmax';
  dropout?: number;
  batchNorm?: boolean;
}

export interface NetworkConfig {
  layers: LayerConfig[];
  inputFeatures: number;
  outputSize: number;
  architecture: 'lstm' | 'cnn' | 'attention' | 'hybrid';
}

export class NetworkArchitectures {
  private static instance: NetworkArchitectures;
  private logger = Logger.getInstance();
  private initializer = XavierInitializer.getInstance();
  private activations = StableActivations.getInstance();

  private constructor() {}

  static getInstance(): NetworkArchitectures {
    if (!NetworkArchitectures.instance) {
      NetworkArchitectures.instance = new NetworkArchitectures();
    }
    return NetworkArchitectures.instance;
  }

  /**
   * Create LSTM network for time-series sequence modeling
   */
  createLSTMNetwork(inputFeatures: number, sequenceLength: number, hiddenSizes: number[], outputSize: number): NetworkConfig {
    const layers: LayerConfig[] = [];

    // LSTM layers
    let currentInputSize = inputFeatures;
    for (let i = 0; i < hiddenSizes.length; i++) {
      layers.push({
        type: 'lstm',
        inputSize: currentInputSize,
        outputSize: hiddenSizes[i],
        activation: 'tanh',
        dropout: 0.2
      });
      currentInputSize = hiddenSizes[i];
    }

    // Dense output layer
    layers.push({
      type: 'dense',
      inputSize: currentInputSize,
      outputSize: outputSize,
      activation: 'sigmoid'
    });

    const config: NetworkConfig = {
      layers,
      inputFeatures,
      outputSize,
      architecture: 'lstm'
    };

    this.logger.info('LSTM network created', {
      inputFeatures,
      sequenceLength,
      hiddenSizes,
      outputSize,
      totalLayers: layers.length
    });

    return config;
  }

  /**
   * Create CNN network for chart pattern detection
   */
  createCNNNetwork(inputHeight: number, inputWidth: number, channels: number, outputSize: number): NetworkConfig {
    const layers: LayerConfig[] = [];

    // Convolutional layers for pattern detection
    const convLayers = [
      { filters: 32, kernelSize: 3 },
      { filters: 64, kernelSize: 3 },
      { filters: 128, kernelSize: 3 }
    ];

    let currentSize = inputHeight * inputWidth * channels;
    for (const conv of convLayers) {
      layers.push({
        type: 'cnn',
        inputSize: currentSize,
        outputSize: conv.filters,
        activation: 'leakyRelu',
        dropout: 0.25
      });
      currentSize = Math.floor(currentSize / 4) * conv.filters; // Approximate size after conv + pooling
    }

    // Dense layers
    layers.push({
      type: 'dense',
      inputSize: currentSize,
      outputSize: 256,
      activation: 'leakyRelu',
      dropout: 0.5
    });

    layers.push({
      type: 'dense',
      inputSize: 256,
      outputSize: outputSize,
      activation: 'sigmoid'
    });

    const config: NetworkConfig = {
      layers,
      inputFeatures: inputHeight * inputWidth * channels,
      outputSize,
      architecture: 'cnn'
    };

    this.logger.info('CNN network created', {
      inputDimensions: [inputHeight, inputWidth, channels],
      convLayers: convLayers.length,
      outputSize,
      totalLayers: layers.length
    });

    return config;
  }

  /**
   * Create Attention network for feature importance weighting
   */
  createAttentionNetwork(inputFeatures: number, attentionHeads: number, hiddenSize: number, outputSize: number): NetworkConfig {
    const layers: LayerConfig[] = [];

    // Multi-head attention layer
    layers.push({
      type: 'attention',
      inputSize: inputFeatures,
      outputSize: hiddenSize,
      activation: 'leakyRelu'
    });

    // Dense layers after attention
    layers.push({
      type: 'dense',
      inputSize: hiddenSize,
      outputSize: hiddenSize / 2,
      activation: 'leakyRelu',
      dropout: 0.3
    });

    layers.push({
      type: 'dense',
      inputSize: hiddenSize / 2,
      outputSize: outputSize,
      activation: 'sigmoid'
    });

    const config: NetworkConfig = {
      layers,
      inputFeatures,
      outputSize,
      architecture: 'attention'
    };

    this.logger.info('Attention network created', {
      inputFeatures,
      attentionHeads,
      hiddenSize,
      outputSize,
      totalLayers: layers.length
    });

    return config;
  }

  /**
   * Create hybrid network combining LSTM, CNN, and Attention
   */
  createHybridNetwork(inputFeatures: number, sequenceLength: number, outputSize: number): NetworkConfig {
    const layers: LayerConfig[] = [];

    // LSTM branch for temporal patterns
    layers.push({
      type: 'lstm',
      inputSize: inputFeatures,
      outputSize: 128,
      activation: 'tanh',
      dropout: 0.2
    });

    // CNN branch for local patterns
    layers.push({
      type: 'cnn',
      inputSize: inputFeatures,
      outputSize: 64,
      activation: 'leakyRelu',
      dropout: 0.25
    });

    // Attention for feature importance
    layers.push({
      type: 'attention',
      inputSize: 128 + 64, // Combined LSTM + CNN features
      outputSize: 96,
      activation: 'leakyRelu'
    });

    // Final dense layers
    layers.push({
      type: 'dense',
      inputSize: 96,
      outputSize: 64,
      activation: 'leakyRelu',
      dropout: 0.4
    });

    layers.push({
      type: 'dense',
      inputSize: 64,
      outputSize: outputSize,
      activation: 'sigmoid'
    });

    const config: NetworkConfig = {
      layers,
      inputFeatures,
      outputSize,
      architecture: 'hybrid'
    };

    this.logger.info('Hybrid network created', {
      inputFeatures,
      sequenceLength,
      outputSize,
      branches: ['LSTM', 'CNN', 'Attention'],
      totalLayers: layers.length
    });

    return config;
  }

  /**
   * Initialize all network weights using Xavier initialization
   */
  initializeNetwork(config: NetworkConfig): { weights: number[][][]; biases: number[][] } {
    const weights: number[][][] = [];
    const biases: number[][] = [];

    for (let i = 0; i < config.layers.length; i++) {
      const layer = config.layers[i];

      // Map layer type for Xavier initializer (cnn -> conv, attention -> dense)
      const xavierLayerType: 'dense' | 'lstm' | 'conv' =
        layer.type === 'cnn' ? 'conv' :
        layer.type === 'attention' ? 'dense' :
        layer.type;

      // Initialize weights with Xavier
      const layerWeights = this.initializer.initializeLayer(
        xavierLayerType,
        layer.inputSize,
        layer.outputSize,
        this.getGainForActivation(layer.activation)
      );
      weights.push(layerWeights);

      // Initialize biases to zero
      const layerBiases = new Array(layer.outputSize).fill(0);
      biases.push(layerBiases);
    }

    // Verify gradient balance
    const balanceCheck = this.initializer.verifyGradientBalance(weights);
    if (!balanceCheck.isBalanced) {
      this.logger.warn('Gradient balance issues detected', balanceCheck);
    }

    this.logger.info('Network weights initialized', {
      architecture: config.architecture,
      layerCount: config.layers.length,
      totalParameters: weights.reduce((sum, w) => sum + w.length * w[0].length, 0),
      gradientBalanced: balanceCheck.isBalanced
    });

    return { weights, biases };
  }

  private getGainForActivation(activation: string): number {
    switch (activation) {
      case 'relu':
      case 'leakyRelu':
        return Math.sqrt(2.0) * 0.5; // Reduced He initialization gain to prevent gradient explosion
      case 'sigmoid':
      case 'tanh':
        return 0.5; // Reduced Xavier gain from 1.0 to prevent gradient explosion
      case 'softmax':
        return 0.5; // Reduced from 1.0
      default:
        return 0.5; // Reduced from 1.0
    }
  }
}