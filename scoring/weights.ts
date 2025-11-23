/**
 * WEIGHTS PARLIAMENT
 * Dynamic influence control and constitutional weight management
 */

import { DetectorWeights, TimeframeWeights, ConstitutionalLimits, WeightAmendment } from './types.js';
import { Logger } from '../core/Logger.js';

/**
 * Default Constitutional Limits
 */
const CONSTITUTIONAL_LIMITS: ConstitutionalLimits = {
  MIN_WEIGHT: 0.01,      // No detector shall be rendered useless
  MAX_WEIGHT: 0.40,      // No single detector shall become dictator
  TOTAL_SUM: 1.00,       // The people's will shall be properly distributed
  NEUTRAL_TERRITORY: 0.05,
  STRONG_SIGNAL_OVERRIDE: 0.65,
  MAJORITY_CONSENSUS: 0.60
};

/**
 * Default Detector Weights
 */
const DEFAULT_DETECTOR_WEIGHTS: DetectorWeights = {
  technical_analysis: {
    harmonic: 0.15,
    elliott: 0.15,
    fibonacci: 0.10,
    price_action: 0.15,
    smc: 0.20,
    sar: 0.10
  },
  fundamental_analysis: {
    sentiment: 0.10,
    news: 0.03,
    whales: 0.02
  }
};

/**
 * Default Timeframe Weights
 */
const DEFAULT_TIMEFRAME_WEIGHTS: TimeframeWeights = {
  '5m': 0.15,
  '15m': 0.25,
  '1h': 0.30,
  '4h': 0.20,
  '1d': 0.10
};

/**
 * Weight Parliament
 * Manages detector and timeframe weights with constitutional compliance
 */
export class WeightParliament {
  private static instance: WeightParliament;
  private logger = Logger.getInstance();
  
  private detectorWeights: DetectorWeights = DEFAULT_DETECTOR_WEIGHTS;
  private timeframeWeights: TimeframeWeights = DEFAULT_TIMEFRAME_WEIGHTS;
  private weightsVersion: string = '1.0.0';
  private lastAmendment: string = new Date().toISOString();
  private amendmentHistory: Array<{ timestamp: string; amendment: WeightAmendment; reason?: string }> = [];

  private constructor() {}

  static getInstance(): WeightParliament {
    if (!WeightParliament.instance) {
      WeightParliament.instance = new WeightParliament();
    }
    return WeightParliament.instance;
  }

  /**
   * Get current detector weights
   */
  getDetectorWeights(): DetectorWeights {
    return JSON.parse(JSON.stringify(this.detectorWeights)); // Deep copy
  }

  /**
   * Get current timeframe weights
   */
  getTimeframeWeights(): TimeframeWeights {
    return JSON.parse(JSON.stringify(this.timeframeWeights)); // Deep copy
  }

  /**
   * Get constitutional limits
   */
  getConstitutionalLimits(): ConstitutionalLimits {
    return { ...CONSTITUTIONAL_LIMITS };
  }

  /**
   * Get weight for a specific detector
   */
  getDetectorWeight(detector: string): number {
    const weights = this.detectorWeights;
    
    if (weights.technical_analysis[detector as keyof typeof weights.technical_analysis] !== undefined) {
      return weights.technical_analysis[detector as keyof typeof weights.technical_analysis];
    }
    
    if (weights.fundamental_analysis[detector as keyof typeof weights.fundamental_analysis] !== undefined) {
      return weights.fundamental_analysis[detector as keyof typeof weights.fundamental_analysis];
    }
    
    return 0;
  }

  /**
   * Get weight for a specific timeframe
   */
  getTimeframeWeight(timeframe: string): number {
    return this.timeframeWeights[timeframe] || 0;
  }

  /**
   * Validate constitutional limits
   */
  private validateConstitutionalLimits(
    detectorWeights?: Partial<DetectorWeights>,
    timeframeWeights?: TimeframeWeights
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate detector weights
    if (detectorWeights) {
      // Check technical analysis weights
      if (detectorWeights.technical_analysis) {
        const techWeights = detectorWeights.technical_analysis;
        const techSum = Object.values(techWeights).reduce((sum, w) => sum + (w || 0), 0);
        
        Object.entries(techWeights).forEach(([detector, weight]) => {
          if (weight !== undefined) {
            if (weight < CONSTITUTIONAL_LIMITS.MIN_WEIGHT) {
              errors.push(`Detector ${detector} weight ${weight} below minimum ${CONSTITUTIONAL_LIMITS.MIN_WEIGHT}`);
            }
            if (weight > CONSTITUTIONAL_LIMITS.MAX_WEIGHT) {
              errors.push(`Detector ${detector} weight ${weight} above maximum ${CONSTITUTIONAL_LIMITS.MAX_WEIGHT}`);
            }
          }
        });
      }

      // Check fundamental analysis weights
      if (detectorWeights.fundamental_analysis) {
        const fundWeights = detectorWeights.fundamental_analysis;
        
        Object.entries(fundWeights).forEach(([detector, weight]) => {
          if (weight !== undefined) {
            if (weight < CONSTITUTIONAL_LIMITS.MIN_WEIGHT) {
              errors.push(`Detector ${detector} weight ${weight} below minimum ${CONSTITUTIONAL_LIMITS.MIN_WEIGHT}`);
            }
            if (weight > CONSTITUTIONAL_LIMITS.MAX_WEIGHT) {
              errors.push(`Detector ${detector} weight ${weight} above maximum ${CONSTITUTIONAL_LIMITS.MAX_WEIGHT}`);
            }
          }
        });
      }
    }

    // Validate timeframe weights
    if (timeframeWeights) {
      const tfSum = Object.values(timeframeWeights).reduce((sum, w) => sum + w, 0);
      
      if (Math.abs(tfSum - CONSTITUTIONAL_LIMITS.TOTAL_SUM) > 0.01) {
        errors.push(`Timeframe weights sum to ${tfSum}, must equal ${CONSTITUTIONAL_LIMITS.TOTAL_SUM}`);
      }

      Object.entries(timeframeWeights).forEach(([tf, weight]) => {
        if (weight < CONSTITUTIONAL_LIMITS.MIN_WEIGHT) {
          errors.push(`Timeframe ${tf} weight ${weight} below minimum ${CONSTITUTIONAL_LIMITS.MIN_WEIGHT}`);
        }
        if (weight > CONSTITUTIONAL_LIMITS.MAX_WEIGHT) {
          errors.push(`Timeframe ${tf} weight ${weight} above maximum ${CONSTITUTIONAL_LIMITS.MAX_WEIGHT}`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Enact weight amendment (parliamentary voting procedure)
   */
  enactWeightAmendment(amendment: WeightAmendment): { success: boolean; errors?: string[] } {
    // Validate authority
    if (!amendment.authority) {
      return { success: false, errors: ['Amendment requires authority'] };
    }

    // Validate constitutional limits
    const validation = this.validateConstitutionalLimits(
      amendment.detectorWeights,
      amendment.timeframeWeights
    );

    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    // Apply amendments
    if (amendment.detectorWeights) {
      if (amendment.detectorWeights.technical_analysis) {
        this.detectorWeights.technical_analysis = {
          ...this.detectorWeights.technical_analysis,
          ...amendment.detectorWeights.technical_analysis
        };
      }
      if (amendment.detectorWeights.fundamental_analysis) {
        this.detectorWeights.fundamental_analysis = {
          ...this.detectorWeights.fundamental_analysis,
          ...amendment.detectorWeights.fundamental_analysis
        };
      }
    }

    if (amendment.timeframeWeights) {
      this.timeframeWeights = {
        ...this.timeframeWeights,
        ...amendment.timeframeWeights
      };
    }

    // Update version and timestamp
    this.weightsVersion = this.incrementVersion(this.weightsVersion);
    this.lastAmendment = new Date().toISOString();

    // Record in history
    this.amendmentHistory.push({
      timestamp: this.lastAmendment,
      amendment,
      reason: amendment.reason
    });

    // Keep only last 100 amendments
    if ((this.amendmentHistory?.length || 0) > 100) {
      this.amendmentHistory.shift();
    }

    // Broadcast amendment
    this.activateEmergencyBroadcast(amendment);

    this.logger.info('Weight amendment enacted', {
      authority: amendment.authority,
      version: this.weightsVersion,
      reason: amendment.reason
    });

    return { success: true };
  }

  /**
   * Reset to default weights
   */
  resetToDefaults(): void {
    this.detectorWeights = JSON.parse(JSON.stringify(DEFAULT_DETECTOR_WEIGHTS));
    this.timeframeWeights = JSON.parse(JSON.stringify(DEFAULT_TIMEFRAME_WEIGHTS));
    this.weightsVersion = '1.0.0';
    this.lastAmendment = new Date().toISOString();

    this.logger.info('Weights reset to defaults');
  }

  /**
   * Get amendment history
   */
  getAmendmentHistory(limit: number = 10): Array<{ timestamp: string; amendment: WeightAmendment; reason?: string }> {
    return this.amendmentHistory.slice(-limit);
  }

  /**
   * Get weights metadata
   */
  getWeightsMetadata(): {
    version: string;
    lastAmendment: string;
    historyCount: number;
  } {
    return {
      version: this.weightsVersion,
      lastAmendment: this.lastAmendment,
      historyCount: this.amendmentHistory.length
    };
  }

  /**
   * Increment version number
   */
  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  /**
   * Activate emergency broadcast (notify all systems)
   */
  private activateEmergencyBroadcast(amendment: WeightAmendment): void {
    // In a real implementation, this would emit WebSocket events
    // For now, just log
    this.logger.info('Emergency broadcast: Weight amendment', {
      authority: amendment.authority,
      timestamp: this.lastAmendment
    });
  }
}
