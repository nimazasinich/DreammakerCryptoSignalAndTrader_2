import { Logger } from '../core/Logger.js';

export interface GradientClipConfig {
  maxNorm: number;
  normType: 'l2' | 'l1' | 'inf';
  errorIfNonFinite: boolean;
}

export class GradientClipper {
  private static instance: GradientClipper;
  private logger = Logger.getInstance();
  private config: GradientClipConfig = {
    maxNorm: 1.0,
    normType: 'l2',
    errorIfNonFinite: true
  };

  private constructor() {}

  static getInstance(): GradientClipper {
    if (!GradientClipper.instance) {
      GradientClipper.instance = new GradientClipper();
    }
    return GradientClipper.instance;
  }

  updateConfig(config: Partial<GradientClipConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Gradient clipper config updated', this.config);
  }

  /**
   * Clip gradients by global norm to prevent exploding gradients
   */
  clipGradientsByGlobalNorm(gradients: number[][][]): {
    clippedGradients: number[][][];
    globalNorm: number;
    wasClipped: boolean;
    scaleFactor: number;
  } {
    // Calculate global norm across all parameters
    const globalNorm = this.calculateGlobalNorm(gradients);
    
    // Check for non-finite values
    if (!isFinite(globalNorm)) {
      if (this.config.errorIfNonFinite) {
        console.error(`Non-finite gradient norm detected: ${globalNorm}`);
      } else {
        this.logger.warn('Non-finite gradient norm detected, setting to zero', { globalNorm });
        return {
          clippedGradients: (gradients || []).map(layer => (layer || []).map(row => (row || []).map(() => 0))),
          globalNorm: 0,
          wasClipped: true,
          scaleFactor: 0
        };
      }
    }

    // Determine if clipping is needed
    const wasClipped = globalNorm > this.config.maxNorm;
    const scaleFactor = wasClipped ? this.config.maxNorm / globalNorm : 1.0;

    // Apply clipping
    const clippedGradients = (gradients || []).map(layer =>
      (layer || []).map(row =>
        (row || []).map(grad => grad * scaleFactor)
      )
    );

    if (wasClipped) {
      this.logger.debug('Gradients clipped', {
        originalNorm: globalNorm.toFixed(6),
        maxNorm: this.config.maxNorm,
        scaleFactor: scaleFactor.toFixed(6)
      });
    }

    return {
      clippedGradients,
      globalNorm,
      wasClipped,
      scaleFactor
    };
  }

  /**
   * Calculate global norm of gradients
   */
  private calculateGlobalNorm(gradients: number[][][]): number {
    let totalSquaredNorm = 0;

    switch (this.config.normType) {
      case 'l2':
        for (const layer of gradients) {
          for (const row of layer) {
            for (const grad of row) {
              if (isFinite(grad)) {
                totalSquaredNorm += grad * grad;
              }
            }
          }
        }
        return Math.sqrt(totalSquaredNorm);

      case 'l1':
        let totalAbsSum = 0;
        for (const layer of gradients) {
          for (const row of layer) {
            for (const grad of row) {
              if (isFinite(grad)) {
                totalAbsSum += Math.abs(grad);
              }
            }
          }
        }
        return totalAbsSum;

      case 'inf':
        let maxAbs = 0;
        for (const layer of gradients) {
          for (const row of layer) {
            for (const grad of row) {
              if (isFinite(grad)) {
                maxAbs = Math.max(maxAbs, Math.abs(grad));
              }
            }
          }
        }
        return maxAbs;

      default:
        console.error(`Unsupported norm type: ${this.config.normType}`);
        return 0;
    }
  }

  /**
   * Test gradient clipping with extreme values
   */
  testExplodingGradients(): {
    passed: boolean;
    testResults: Array<{
      testName: string;
      originalNorm: number;
      clippedNorm: number;
      wasClipped: boolean;
      passed: boolean;
    }>;
  } {
    const testCases = [
      {
        name: 'normal_gradients',
        gradients: [[[0.1, 0.2], [0.3, 0.4]], [[0.5, 0.6]]]
      },
      {
        name: 'large_gradients',
        gradients: [[[10, 20], [30, 40]], [[50, 60]]]
      },
      {
        name: 'extreme_gradients',
        gradients: [[[1000, 2000], [3000, 4000]], [[5000, 6000]]]
      },
      {
        name: 'mixed_gradients',
        gradients: [[[0.01, 1000], [0.02, 2000]], [[0.03, 3000]]]
      }
    ];

    const testResults = [];
    let allPassed = true;

    for (const testCase of testCases) {
      try {
        const result = this.clipGradientsByGlobalNorm(testCase.gradients);
        const clippedNorm = this.calculateGlobalNorm(result.clippedGradients);
        
        const passed = clippedNorm <= this.config.maxNorm + 1e-6; // Small tolerance for floating point
        
        testResults.push({
          testName: testCase.name,
          originalNorm: result.globalNorm,
          clippedNorm,
          wasClipped: result.wasClipped,
          passed
        });

        if (!passed) {
          allPassed = false;
        }
      } catch (error) {
        testResults.push({
          testName: testCase.name,
          originalNorm: NaN,
          clippedNorm: NaN,
          wasClipped: false,
          passed: false
        });
        allPassed = false;
      }
    }

    this.logger.info('Gradient clipping test completed', {
      passed: allPassed,
      testCount: testResults.length
    });

    return { passed: allPassed, testResults };
  }
}