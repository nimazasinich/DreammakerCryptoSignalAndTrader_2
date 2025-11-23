/**
 * AccuracyMetrics
 * Real accuracy measurement for model evaluation
 */

import { Logger } from '../core/Logger.js';
import { BullBearAgent } from './BullBearAgent.js';
import { MarketData } from '../types/index.js';
import { BullBearPrediction } from './BullBearAgent.js';

// Utility to convert Date | number to number
const toTimestamp = (ts: Date | number): number =>
  typeof ts === 'number' ? ts : ts.getTime();

export interface AccuracyMetricsResult {
  directionalAccuracy: number;
  classificationAccuracy: number;
  mse: number;
  predictions: Array<{
    actual: string;
    predicted: string;
    confidence: number;
    timestamp: number;
  }>;
  confusionMatrix: {
    truePositive: number;
    trueNegative: number;
    falsePositive: number;
    falseNegative: number;
  };
}

export class AccuracyMetrics {
  private static logger = Logger.getInstance();

  /**
   * Measure model accuracy based on test data
   */
  static async measureModelAccuracy(
    agent: BullBearAgent,
    testData: MarketData[],
    lookbackWindow: number = 50
  ): Promise<AccuracyMetricsResult> {
    if (testData.length < lookbackWindow + 1) {
      console.error(`Insufficient test data: need at least ${lookbackWindow + 1} data points`);
    }

    const predictions: Array<{
      actual: string;
      predicted: string;
      confidence: number;
      timestamp: number;
    }> = [];

    let correctDirectional = 0;
    let correctClassification = 0;
    let totalSquaredError = 0;
    
    let truePositive = 0; // Predicted LONG, actual LONG
    let trueNegative = 0; // Predicted SHORT, actual SHORT
    let falsePositive = 0; // Predicted LONG, actual SHORT
    let falseNegative = 0; // Predicted SHORT, actual LONG

    for (let i = lookbackWindow; i < testData.length; i++) {
      const window = testData.slice(i - lookbackWindow, i);
      const nextBar = testData[i];
      const prevBar = testData[i - 1];

      try {
        // Get prediction
        const prediction = await agent.predict(window);

        // Calculate actual direction
        const actualDirection = nextBar.close > prevBar.close ? 'LONG' :
                               nextBar.close < prevBar.close ? 'SHORT' : 'HOLD';

        // Compare with prediction
        const predictedDirection = prediction.action;

        // Directional accuracy
        if (predictedDirection === actualDirection) {
          correctDirectional++;
        }

        // Classification accuracy (Bull/Bear/Neutral)
        const actualClass = actualDirection === 'LONG' ? 'BULL' :
                          actualDirection === 'SHORT' ? 'BEAR' : 'NEUTRAL';
        const predictedClass = predictedDirection === 'LONG' ? 'BULL' :
                              predictedDirection === 'SHORT' ? 'BEAR' : 'NEUTRAL';

        if (predictedClass === actualClass) {
          correctClassification++;
        }

        // Calculate squared error
        const actualPriceChange = (nextBar.close - prevBar.close) / prevBar.close;
        const predictedPriceChange = prediction.probabilities.bull - prediction.probabilities.bear;
        totalSquaredError += Math.pow(actualPriceChange - predictedPriceChange, 2);

        // Confusion matrix
        if (predictedDirection === 'LONG' && actualDirection === 'LONG') {
          truePositive++;
        } else if (predictedDirection === 'SHORT' && actualDirection === 'SHORT') {
          trueNegative++;
        } else if (predictedDirection === 'LONG' && actualDirection === 'SHORT') {
          falsePositive++;
        } else if (predictedDirection === 'SHORT' && actualDirection === 'LONG') {
          falseNegative++;
        }

        predictions.push({
          actual: actualDirection,
          predicted: predictedDirection,
          confidence: prediction.confidence,
          timestamp: toTimestamp(nextBar.timestamp)
        });
      } catch (error) {
        this.logger.warn('Failed to get prediction for accuracy measurement', {
          index: i
        }, error as Error);
        continue;
      }
    }

    const total = testData.length - lookbackWindow;
    
    if (total === 0) {
      return {
        directionalAccuracy: 0,
        classificationAccuracy: 0,
        mse: 0,
        predictions: [],
        confusionMatrix: {
          truePositive: 0,
          trueNegative: 0,
          falsePositive: 0,
          falseNegative: 0
        }
      };
    }

    return {
      directionalAccuracy: correctDirectional / total,
      classificationAccuracy: correctClassification / total,
      mse: totalSquaredError / total,
      predictions,
      confusionMatrix: {
        truePositive,
        trueNegative,
        falsePositive,
        falseNegative
      }
    };
  }

  /**
   * Calculate precision, recall, and F1 score
   */
  static calculatePrecisionRecall(
    confusionMatrix: {
      truePositive: number;
      trueNegative: number;
      falsePositive: number;
      falseNegative: number;
    }
  ): {
    precision: number;
    recall: number;
    f1Score: number;
  } {
    const { truePositive, falsePositive, falseNegative } = confusionMatrix;

    const precision = (truePositive + falsePositive) > 0
      ? truePositive / (truePositive + falsePositive)
      : 0;

    const recall = (truePositive + falseNegative) > 0
      ? truePositive / (truePositive + falseNegative)
      : 0;

    const f1Score = (precision + recall) > 0
      ? 2 * (precision * recall) / (precision + recall)
      : 0;

    return { precision, recall, f1Score };
  }

  /**
   * Calculate accuracy by confidence threshold
   */
  static calculateAccuracyByConfidence(
    predictions: Array<{
      actual: string;
      predicted: string;
      confidence: number;
      timestamp: number;
    }>,
    threshold: number = 0.5
  ): {
    total: number;
    correct: number;
    accuracy: number;
  } {
    const filtered = predictions.filter(p => p.confidence >= threshold);
    
    if (filtered.length === 0) {
      return { total: 0, correct: 0, accuracy: 0 };
    }

    const correct = filtered.filter(p => p.actual === p.predicted).length;

    return {
      total: filtered.length,
      correct,
      accuracy: correct / filtered.length
    };
  }
}
