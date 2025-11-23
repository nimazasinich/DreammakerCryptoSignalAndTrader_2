/**
 * Smart Weight Adjuster
 *
 * Adaptively adjusts detector and category weights based on performance telemetry.
 *
 * Key principles:
 * - Only adjust within safe bounds (min/max from config)
 * - Use incremental learning with decay to prevent wild swings
 * - Respect category-level target weights (40/25/20/10/5)
 * - Require minimum sample size before adjusting
 * - Normalize weights to ensure they sum to 1.0
 */

import fs from 'fs';
import path from 'path';
import { ScoringTelemetry, CategoryMetrics, DetectorMetrics } from './ScoringTelemetry';
import { Logger } from '../core/Logger';

export type AdaptiveConfig = {
  enabled: boolean;
  minSampleSize: number;
  learningRate: number;
  decay: number;
  categoryBounds: Record<string, { min: number; max: number }>;
  detectorBounds: Record<string, { min: number; max: number }>;
  telemetryPath: string;
  updateIntervalMs: number;
};

export type AdjustedWeights = {
  categories: {
    core: number;
    smc: number;
    patterns: number;
    sentiment: number;
    ml: number;
  };
  detectors: Record<string, number>;
  isAdaptive: boolean;
  lastUpdated: number;
};

/**
 * SmartWeightAdjuster - Singleton for adaptive weight management
 */
export class SmartWeightAdjuster {
  private static instance: SmartWeightAdjuster;
  private logger = Logger.getInstance();
  private telemetry: ScoringTelemetry;
  private config: AdaptiveConfig;
  private currentWeights: AdjustedWeights;
  private lastAdjustment = 0;

  private constructor(config: AdaptiveConfig) {
    this.config = config;
    this.telemetry = ScoringTelemetry.getInstance(config.telemetryPath);

    // Initialize with config defaults (will be loaded from config in production)
    this.currentWeights = {
      categories: {
        core: 0.40,
        smc: 0.25,
        patterns: 0.20,
        sentiment: 0.10,
        ml: 0.05
      },
      detectors: {},
      isAdaptive: config.enabled,
      lastUpdated: Date.now()
    };
  }

  public static getInstance(config?: AdaptiveConfig): SmartWeightAdjuster {
    if (!SmartWeightAdjuster.instance && config) {
      SmartWeightAdjuster.instance = new SmartWeightAdjuster(config);
    } else if (!SmartWeightAdjuster.instance) {
      throw new Error('SmartWeightAdjuster must be initialized with config on first call');
    }
    return SmartWeightAdjuster.instance;
  }

  /**
   * Get current weights (static or adaptive)
   * @param staticWeights - fallback static weights from config
   */
  public getWeights(staticWeights: AdjustedWeights): AdjustedWeights {
    if (!this.config.enabled) {
      return staticWeights;
    }

    // Check if enough time has passed to adjust
    const now = Date.now();
    if (now - this.lastAdjustment < this.config.updateIntervalMs) {
      return this.currentWeights;
    }

    // Adjust weights based on telemetry
    this.adjustWeights();
    this.lastAdjustment = now;

    return this.currentWeights;
  }

  /**
   * Adjust weights based on telemetry performance
   */
  private adjustWeights(): void {
    const telemetryData = this.telemetry.getAllData();
    const globalWinRate = telemetryData.globalStats.globalWinRate;

    if (telemetryData.globalStats.totalSignals < this.config.minSampleSize) {
      this.logger.debug('Insufficient telemetry data for adaptive weighting', {
        totalSignals: telemetryData.globalStats.totalSignals,
        minRequired: this.config.minSampleSize
      });
      return;
    }

    this.logger.info('Adjusting weights based on telemetry', {
      totalSignals: telemetryData.globalStats.totalSignals,
      globalWinRate: globalWinRate.toFixed(3)
    });

    // Adjust category weights
    const newCategoryWeights = { ...this.currentWeights.categories };

    for (const [catName, catMetrics] of Object.entries(telemetryData.categories)) {
      if (catMetrics.totalSignals < this.config.minSampleSize) {
        continue; // Skip categories with insufficient data
      }

      const categoryKey = catName as keyof typeof newCategoryWeights;
      const currentWeight = newCategoryWeights[categoryKey];
      const bounds = this.config.categoryBounds[catName];

      if (!bounds) {
        this.logger.warn(`No bounds configured for category ${catName}`);
        continue;
      }

      // Calculate adjustment based on performance vs global average
      const performanceDelta = catMetrics.winRate - globalWinRate;
      const adjustment = performanceDelta * this.config.learningRate;

      // Apply adjustment with bounds
      let newWeight = currentWeight + adjustment;
      newWeight = Math.max(bounds.min, Math.min(bounds.max, newWeight));

      // Apply decay to smooth changes
      newWeight = currentWeight * this.config.decay + newWeight * (1 - this.config.decay);

      newCategoryWeights[categoryKey] = newWeight;

      this.logger.debug(`Category weight adjusted`, {
        category: catName,
        oldWeight: currentWeight.toFixed(3),
        newWeight: newWeight.toFixed(3),
        winRate: catMetrics.winRate.toFixed(3),
        delta: adjustment.toFixed(4)
      });
    }

    // Normalize category weights to sum to 1.0
    const categorySum = Object.values(newCategoryWeights).reduce((sum, w) => sum + w, 0);
    if (categorySum > 0) {
      for (const key of Object.keys(newCategoryWeights) as Array<keyof typeof newCategoryWeights>) {
        newCategoryWeights[key] /= categorySum;
      }
    }

    this.currentWeights.categories = newCategoryWeights;
    this.currentWeights.lastUpdated = Date.now();

    this.logger.info('Adaptive weights updated', {
      core: newCategoryWeights.core.toFixed(3),
      smc: newCategoryWeights.smc.toFixed(3),
      patterns: newCategoryWeights.patterns.toFixed(3),
      sentiment: newCategoryWeights.sentiment.toFixed(3),
      ml: newCategoryWeights.ml.toFixed(3)
    });
  }

  /**
   * Adjust individual detector weights within a category
   * (More granular adjustment - optional enhancement)
   */
  public adjustDetectorWeights(
    categoryName: 'core' | 'smc' | 'patterns' | 'sentiment' | 'ml',
    detectorScores: Record<string, number>
  ): Record<string, number> {
    if (!this.config.enabled) {
      return detectorScores;
    }

    const adjustedScores: Record<string, number> = {};
    const telemetryData = this.telemetry.getAllData();

    for (const [detectorName, score] of Object.entries(detectorScores)) {
      const metrics = telemetryData.detectors[detectorName];

      if (!metrics || metrics.totalSignals < this.config.minSampleSize) {
        adjustedScores[detectorName] = score;
        continue;
      }

      const bounds = this.config.detectorBounds[detectorName];
      if (!bounds) {
        adjustedScores[detectorName] = score;
        continue;
      }

      // Boost or penalize score based on detector win rate
      const globalWinRate = telemetryData.globalStats.globalWinRate;
      const performanceDelta = metrics.winRate - globalWinRate;
      const boost = 1.0 + (performanceDelta * this.config.learningRate * 2); // 2x multiplier for detector-level

      let adjustedScore = score * boost;
      adjustedScore = Math.max(0, Math.min(1, adjustedScore)); // Clamp to [0, 1]

      adjustedScores[detectorName] = adjustedScore;
    }

    return adjustedScores;
  }

  /**
   * Get current effective weights
   */
  public getCurrentWeights(): AdjustedWeights {
    return this.currentWeights;
  }

  /**
   * Reset weights to defaults
   */
  public reset(): void {
    this.logger.warn('Resetting adaptive weights to defaults');
    this.currentWeights = {
      categories: {
        core: 0.40,
        smc: 0.25,
        patterns: 0.20,
        sentiment: 0.10,
        ml: 0.05
      },
      detectors: {},
      isAdaptive: this.config.enabled,
      lastUpdated: Date.now()
    };
  }
}
