/**
 * Backpropagation
 * Real gradient calculation using backpropagation algorithm
 */

import { Logger } from '../core/Logger.js';

export type ActivationFunction = 'leakyReLU' | 'sigmoid' | 'tanh' | 'linear';

export class Backpropagation {
  private static logger = Logger.getInstance();

  /**
   * Calculate real gradients using backpropagation algorithm
   */
  static calculateGradients(
    networkOutput: number[],
    targets: number[],
    activations: number[][],
    weights: number[][][],
    lossFunction: 'mse' | 'crossEntropy' = 'mse',
    activationFn: ActivationFunction = 'leakyReLU'
  ): number[][][] {
    if (networkOutput.length !== targets.length) {
      console.error('Output and target lengths must match');
    }

    const gradients: number[][][] = [];

    // Calculate gradient of loss with respect to output
    let outputGradients: number[];
    if (lossFunction === 'mse') {
      // MSE: L = (y_pred - y_true)^2
      // dL/dy_pred = 2 * (y_pred - y_true)
      outputGradients = (networkOutput || []).map((out, i) => 2 * (out - targets[i]));
    } else {
      // Cross-entropy (for classification)
      // L = -sum(y_true * log(y_pred))
      // dL/dy_pred = -y_true / y_pred
      outputGradients = (networkOutput || []).map((out, i) => {
        const target = targets[i];
        // Prevent division by zero
        const epsilon = 1e-8;
        return (out - target) / (out * (1 - out) + epsilon);
      });
    }

    // Backpropagate from output layer to input layer
    let currentGradients = outputGradients;

    for (let layerIdx = weights.length - 1; layerIdx >= 0; layerIdx--) {
      const layerWeights = weights[layerIdx];
      const layerActivations = activations[layerIdx] || activations[layerIdx + 1] || [];

      if (!layerWeights || layerWeights.length === 0) {
        continue;
      }

      // Calculate gradient of weights
      const weightGradients: number[][] = [];
      for (let i = 0; i < layerWeights.length; i++) {
        const row: number[] = [];
        for (let j = 0; j < layerWeights[i].length; j++) {
          // Gradient = (gradient from next layer) * (activation from previous layer)
          const activation = layerActivations[i] || 0;
          const gradient = currentGradients[j] * activation;
          row.push(gradient);
        }
        weightGradients.push(row);
      }

      gradients.unshift(weightGradients); // Add to beginning (reverse order)

      // Calculate gradient for previous layer (if not input layer)
      if (layerIdx > 0) {
        currentGradients = this.backwardPassThroughLayer(
          currentGradients,
          layerWeights,
          layerActivations,
          activationFn
        );
      }
    }

    return gradients;
  }

  /**
   * Backward pass through a single layer
   */
  private static backwardPassThroughLayer(
    gradients: number[],
    weights: number[][],
    activations: number[],
    activationFn: ActivationFunction
  ): number[] {
    // Calculate gradient for previous layer
    const prevGradients: number[] = new Array(weights.length).fill(0);

    for (let i = 0; i < weights.length; i++) {
      // Sum gradients weighted by connection weights
      for (let j = 0; j < gradients.length; j++) {
        prevGradients[i] += gradients[j] * weights[i][j];
      }
      // Apply gradient of activation function
      prevGradients[i] *= this.activationGradient(activations[i] || 0, activationFn);
    }

    return prevGradients;
  }

  /**
   * Calculate gradient of activation function
   */
  private static activationGradient(value: number, activation: ActivationFunction): number {
    switch (activation) {
      case 'leakyReLU':
        return value > 0 ? 1 : 0.01;
      case 'sigmoid':
        // Derivative of sigmoid: s'(x) = s(x) * (1 - s(x))
        const sigmoid = 1 / (1 + Math.exp(-value));
        return sigmoid * (1 - sigmoid);
      case 'tanh':
        // Derivative of tanh: tanh'(x) = 1 - tanh²(x)
        const tanh = Math.tanh(value);
        return 1 - tanh * tanh;
      case 'linear':
        return 1;
      default:
        return 1;
    }
  }

  /**
   * Calculate loss value
   */
  static calculateLoss(
    predictions: number[],
    targets: number[],
    lossFunction: 'mse' | 'crossEntropy' = 'mse'
  ): number {
    if (predictions.length !== targets.length) {
      console.error('Predictions and targets must have same length');
    }

    if (lossFunction === 'mse') {
      // Mean Squared Error
      let sum = 0;
      for (let i = 0; i < predictions.length; i++) {
        const diff = predictions[i] - targets[i];
        sum += diff * diff;
      }
      return sum / predictions.length;
    } else {
      // Cross-entropy loss
      let sum = 0;
      const epsilon = 1e-8;
      for (let i = 0; i < predictions.length; i++) {
        const pred = Math.max(epsilon, Math.min(1 - epsilon, predictions[i]));
        const target = targets[i];
        sum += -target * Math.log(pred) - (1 - target) * Math.log(1 - pred);
      }
      return sum / predictions.length;
    }
  }

  /**
   * Calculate gradient norm for monitoring
   */
  static calculateGradientNorm(gradients: number[][][]): number {
    let sum = 0;
    for (const layer of gradients) {
      for (const row of layer) {
        for (const val of row) {
          sum += val * val;
        }
      }
    }
    return Math.sqrt(sum);
  }
}
