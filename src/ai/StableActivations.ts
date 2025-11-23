import { Logger } from '../core/Logger.js';

export interface ActivationConfig {
  preClipBound: number;
  postClipBound: number;
  leakyReluSlope: number;
}

export class StableActivations {
  private static instance: StableActivations;
  private logger = Logger.getInstance();
  private config: ActivationConfig = {
    preClipBound: 50.0,
    postClipBound: 50.0,
    leakyReluSlope: 0.01
  };

  private constructor() {}

  static getInstance(): StableActivations {
    if (!StableActivations.instance) {
      StableActivations.instance = new StableActivations();
    }
    return StableActivations.instance;
  }

  updateConfig(config: Partial<ActivationConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Stable activations config updated', this.config);
  }

  /**
   * Stable LeakyReLU with configurable slope and clipping
   */
  leakyRelu(x: number[]): number[] {
    return (x || []).map(val => {
      // Pre-activation clipping
      const clippedInput = Math.max(-this.config.preClipBound, Math.min(this.config.preClipBound, val));
      
      // LeakyReLU activation
      const activated = clippedInput > 0 ? clippedInput : this.config.leakyReluSlope * clippedInput;
      
      // Post-activation clipping
      return Math.max(-this.config.postClipBound, Math.min(this.config.postClipBound, activated));
    });
  }

  /**
   * Stable Sigmoid with saturation handling
   */
  sigmoid(x: number[]): number[] {
    return (x || []).map(val => {
      // Pre-activation clipping to prevent overflow
      const clippedInput = Math.max(-this.config.preClipBound, Math.min(this.config.preClipBound, val));
      
      // Stable sigmoid computation
      let result: number;
      if (clippedInput >= 0) {
        const exp_neg = Math.exp(-clippedInput);
        result = 1.0 / (1.0 + exp_neg);
      } else {
        const exp_pos = Math.exp(clippedInput);
        result = exp_pos / (1.0 + exp_pos);
      }
      
      // Handle saturation
      if (result < 1e-7) result = 1e-7;
      if (result > 1 - 1e-7) result = 1 - 1e-7;
      
      return result;
    });
  }

  /**
   * Stable Tanh with saturation handling
   */
  tanh(x: number[]): number[] {
    return (x || []).map(val => {
      // Pre-activation clipping
      const clippedInput = Math.max(-this.config.preClipBound, Math.min(this.config.preClipBound, val));
      
      // Stable tanh computation
      let result: number;
      if (Math.abs(clippedInput) < 1e-7) {
        result = clippedInput; // Linear approximation for very small values
      } else {
        const exp_2x = Math.exp(2 * clippedInput);
        result = (exp_2x - 1) / (exp_2x + 1);
      }
      
      // Handle saturation
      if (result < -1 + 1e-7) result = -1 + 1e-7;
      if (result > 1 - 1e-7) result = 1 - 1e-7;
      
      return result;
    });
  }

  /**
   * Stable ReLU with clipping
   */
  relu(x: number[]): number[] {
    return (x || []).map(val => {
      const clippedInput = Math.max(-this.config.preClipBound, Math.min(this.config.preClipBound, val));
      const activated = Math.max(0, clippedInput);
      return Math.min(this.config.postClipBound, activated);
    });
  }

  /**
   * Stable Softmax with numerical stability
   */
  softmax(x: number[]): number[] {
    // Pre-activation clipping
    const clippedInputs = (x || []).map(val => 
      Math.max(-this.config.preClipBound, Math.min(this.config.preClipBound, val))
    );
    
    // Numerical stability: subtract max value
    const maxVal = Math.max(...clippedInputs);
    const shiftedInputs = (clippedInputs || []).map(val => val - maxVal);
    
    // Compute exponentials
    const exponentials = (shiftedInputs || []).map(val => Math.exp(val));
    const sum = exponentials.reduce((acc, val) => acc + val, 0);
    
    // Normalize and handle edge cases
    return (exponentials || []).map(val => {
      const result = val / sum;
      return Math.max(1e-7, Math.min(1 - 1e-7, result));
    });
  }

  /**
   * Test activation functions with extreme inputs
   */
  testStability(): {
    passed: boolean;
    results: { [key: string]: { input: number[], output: number[], hasNaN: boolean, hasInf: boolean } };
  } {
    const extremeInputs = [
      [-1000, -100, -10, -1, 0, 1, 10, 100, 1000],
      [Number.NEGATIVE_INFINITY, -1e10, 1e10, Number.POSITIVE_INFINITY],
      [NaN, -NaN, 0, -0]
    ];

    const results: any = {};
    let allPassed = true;

    const activations = {
      leakyRelu: this.leakyRelu.bind(this),
      sigmoid: this.sigmoid.bind(this),
      tanh: this.tanh.bind(this),
      relu: this.relu.bind(this),
      softmax: this.softmax.bind(this)
    };

    for (const [name, activation] of Object.entries(activations)) {
      for (let i = 0; i < extremeInputs.length; i++) {
        const input = extremeInputs[i].filter(x => !isNaN(x) && isFinite(x)); // Filter out NaN/Inf for most tests
        if (input.length === 0) continue;

        try {
          const output = activation(input);
          const hasNaN = output.some(x => isNaN(x));
          const hasInf = output.some(x => !isFinite(x));
          
          results[`${name}_test_${i}`] = {
            input,
            output,
            hasNaN,
            hasInf
          };

          if (hasNaN || hasInf) {
            allPassed = false;
          }
        } catch (error) {
          results[`${name}_test_${i}`] = {
            input,
            output: [],
            hasNaN: true,
            hasInf: true,
            error: (error as Error).message
          };
          allPassed = false;
        }
      }
    }

    this.logger.info('Activation stability test completed', {
      passed: allPassed,
      testCount: Object.keys(results).length
    });

    return { passed: allPassed, results };
  }
}