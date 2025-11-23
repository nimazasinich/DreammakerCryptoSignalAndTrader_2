import { StableActivations } from '../StableActivations';

describe('StableActivations', () => {
  let activations: StableActivations;

  beforeEach(() => {
    activations = StableActivations.getInstance();
  });

  describe('LeakyReLU', () => {
    it('should return positive values as is', () => {
      const result = activations.leakyReLU(5);
      expect(result).toBe(5);
    });

    it('should apply leaky slope to negative values', () => {
      const result = activations.leakyReLU(-5);
      expect(result).toBeCloseTo(-0.05, 5); // -5 * 0.01
    });

    it('should handle zero', () => {
      const result = activations.leakyReLU(0);
      expect(result).toBe(0);
    });

    it('should handle extreme positive values', () => {
      const result = activations.leakyReLU(1000);
      expect(result).toBe(1000);
    });

    it('should handle extreme negative values', () => {
      const result = activations.leakyReLU(-1000);
      expect(result).toBeCloseTo(-10, 5); // -1000 * 0.01
    });
  });

  describe('Sigmoid', () => {
    it('should output values between 0 and 1', () => {
      const result = activations.sigmoid(0);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1);
      expect(result).toBeCloseTo(0.5, 1);
    });

    it('should handle large positive values', () => {
      const result = activations.sigmoid(10);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1);
      expect(result).toBeCloseTo(1, 1);
    });

    it('should handle large negative values', () => {
      const result = activations.sigmoid(-10);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1);
      expect(result).toBeCloseTo(0, 1);
    });

    it('should be stable for extreme inputs', () => {
      const result1 = activations.sigmoid(50);
      const result2 = activations.sigmoid(100);
      expect(result1).toBeGreaterThan(0);
      expect(result2).toBeGreaterThan(0);
      expect(result1).toBeLessThan(1);
      expect(result2).toBeLessThan(1);
    });
  });

  describe('Tanh', () => {
    it('should output values between -1 and 1', () => {
      const result = activations.tanh(0);
      expect(result).toBeGreaterThanOrEqual(-1);
      expect(result).toBeLessThanOrEqual(1);
      expect(result).toBeCloseTo(0, 5);
    });

    it('should handle large positive values', () => {
      const result = activations.tanh(10);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should handle large negative values', () => {
      const result = activations.tanh(-10);
      expect(result).toBeLessThan(0);
      expect(result).toBeGreaterThanOrEqual(-1);
    });

    it('should be symmetric', () => {
      const result1 = activations.tanh(5);
      const result2 = activations.tanh(-5);
      expect(result1).toBeCloseTo(-result2, 5);
    });
  });

  describe('Stability Tests', () => {
    it('should handle NaN inputs', () => {
      const result = activations.leakyReLU(NaN);
      expect(Number.isNaN(result)).toBe(true);
    });

    it('should handle Infinity inputs', () => {
      const result = activations.sigmoid(Infinity);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should handle very large arrays without overflow', () => {
      const largeInput = new Array(1000).fill(100);
      largeInput.forEach(val => {
        const result = activations.sigmoid(val);
        expect(Number.isFinite(result)).toBe(true);
      });
    });
  });
});

