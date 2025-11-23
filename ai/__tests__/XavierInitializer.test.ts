import { XavierInitializer, InitializationMode } from '../XavierInitializer';

describe('XavierInitializer', () => {
  let initializer: XavierInitializer;

  beforeEach(() => {
    initializer = XavierInitializer.getInstance();
  });

  describe('Uniform Initialization', () => {
    it('should initialize weights with uniform distribution', () => {
      const weights = initializer.initializeUniform({
        mode: InitializationMode.UNIFORM,
        gain: 1.0,
        fanIn: 100,
        fanOut: 50
      });

      expect(weights).toBeDefined();
      expect(weights.length).toBe(50);
      expect(weights[0].length).toBe(100);
    });

    it('should generate weights within expected range', () => {
      const weights = initializer.initializeUniform({
        mode: InitializationMode.UNIFORM,
        gain: 1.0,
        fanIn: 100,
        fanOut: 50
      });

      const limit = 1.0 * Math.sqrt(6.0 / (100 + 50));
      
      for (const row of weights) {
        for (const weight of row) {
          expect(weight).toBeGreaterThanOrEqual(-limit);
          expect(weight).toBeLessThanOrEqual(limit);
        }
      }
    });

    it('should handle different gain values', () => {
      const weights1 = initializer.initializeUniform({
        mode: InitializationMode.UNIFORM,
        gain: 1.0,
        fanIn: 100,
        fanOut: 50
      });

      const weights2 = initializer.initializeUniform({
        mode: InitializationMode.UNIFORM,
        gain: 0.5,
        fanIn: 100,
        fanOut: 50
      });

      expect(weights1.length).toBe(weights2.length);
      expect(weights1[0].length).toBe(weights2[0].length);
    });
  });

  describe('Normal Initialization', () => {
    it('should initialize weights with normal distribution', () => {
      const weights = initializer.initializeNormal({
        mode: InitializationMode.NORMAL,
        gain: 1.0,
        fanIn: 100,
        fanOut: 50
      });

      expect(weights).toBeDefined();
      expect(weights.length).toBe(50);
      expect(weights[0].length).toBe(100);
    });

    it('should generate weights with correct variance', () => {
      const weights = initializer.initializeNormal({
        mode: InitializationMode.NORMAL,
        gain: 1.0,
        fanIn: 100,
        fanOut: 50
      });

      const std = 1.0 * Math.sqrt(2.0 / (100 + 50));
      
      // Calculate sample variance
      let sum = 0;
      let sumSquared = 0;
      for (const row of weights) {
        for (const weight of row) {
          sum += weight;
          sumSquared += weight * weight;
        }
      }
      
      const mean = sum / (weights.length * weights[0].length);
      const variance = sumSquared / (weights.length * weights[0].length) - mean * mean;
      const sampleStd = Math.sqrt(variance);
      
      // Allow some variance in statistical sampling
      expect(sampleStd).toBeGreaterThan(std * 0.5);
      expect(sampleStd).toBeLessThan(std * 1.5);
    });
  });

  describe('Layer Initialization', () => {
    it('should initialize dense layers', () => {
      const weights = initializer.initializeLayer('dense', 100, 50);
      
      expect(weights).toBeDefined();
      expect(weights.length).toBe(50);
      expect(weights[0].length).toBe(100);
    });

    it('should initialize LSTM layers', () => {
      const weights = initializer.initializeLayer('lstm', 100, 50);
      
      expect(weights).toBeDefined();
      expect(weights.length).toBe(50);
      expect(weights[0].length).toBe(100);
    });

    it('should initialize Conv layers', () => {
      const weights = initializer.initializeLayer('conv', 100, 50);
      
      expect(weights).toBeDefined();
      expect(weights.length).toBe(50);
      expect(weights[0].length).toBe(100);
    });
  });
});

