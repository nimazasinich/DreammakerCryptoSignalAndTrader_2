/**
 * Unit Tests برای API Test Framework
 * 
 * این تست‌ها خود Framework را تست می‌کنند
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ResponseValidator,
  RequestValidator,
  ErrorHandler,
  RetryHandler,
  APITestError,
} from '../api-test-framework';
import { CommonSchemas } from '../request-validator';

describe('ResponseValidator', () => {
  describe('validateSchema', () => {
    it('should validate correct schema', () => {
      const data = {
        name: 'Test',
        age: 25,
        active: true,
      };

      const schema = {
        name: 'string',
        age: 'number',
        active: 'boolean',
      };

      const result = ResponseValidator.validateSchema(data, schema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const data = {
        name: 'Test',
      };

      const schema = {
        name: 'string',
        age: 'number',
      };

      const result = ResponseValidator.validateSchema(data, schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Missing required field: age');
    });

    it('should detect type mismatches', () => {
      const data = {
        name: 'Test',
        age: '25', // should be number
      };

      const schema = {
        name: 'string',
        age: 'number',
      };

      const result = ResponseValidator.validateSchema(data, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('should be of type number');
    });

    it('should validate arrays', () => {
      const data = {
        items: [1, 2, 3],
      };

      const schema = {
        items: 'array',
      };

      const result = ResponseValidator.validateSchema(data, schema);
      expect(result.valid).toBe(true);
    });

    it('should validate nested objects', () => {
      const data = {
        user: {
          name: 'Test',
          age: 25,
        },
      };

      const schema = {
        user: {
          name: 'string',
          age: 'number',
        },
      };

      const result = ResponseValidator.validateSchema(data, schema);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateStatus', () => {
    it('should validate single status code', () => {
      expect(ResponseValidator.validateStatus(200, 200)).toBe(true);
      expect(ResponseValidator.validateStatus(404, 200)).toBe(false);
    });

    it('should validate multiple status codes', () => {
      expect(ResponseValidator.validateStatus(200, [200, 201, 204])).toBe(true);
      expect(ResponseValidator.validateStatus(404, [200, 201, 204])).toBe(false);
    });
  });

  describe('validateHeaders', () => {
    it('should validate required headers', () => {
      const headers = {
        'content-type': 'application/json',
        'authorization': 'Bearer token',
      };

      const result = ResponseValidator.validateHeaders(headers, ['content-type', 'authorization']);
      expect(result.valid).toBe(true);
    });

    it('should detect missing headers', () => {
      const headers = {
        'content-type': 'application/json',
      };

      const result = ResponseValidator.validateHeaders(headers, ['content-type', 'authorization']);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Missing required header: authorization');
    });
  });
});

describe('RequestValidator', () => {
  describe('validate', () => {
    it('should validate correct data', () => {
      const data = {
        symbol: 'BTCUSDT',
        limit: 100,
      };

      const schema = {
        symbol: {
          required: true,
          type: 'string' as const,
        },
        limit: {
          required: false,
          type: 'number' as const,
          min: 1,
          max: 1000,
        },
      };

      const result = RequestValidator.validate(data, schema);
      expect(result.valid).toBe(true);
    });

    it('should detect missing required fields', () => {
      const data = {
        limit: 100,
      };

      const schema = {
        symbol: {
          required: true,
          type: 'string' as const,
        },
      };

      const result = RequestValidator.validate(data, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('required');
    });

    it('should validate min/max for numbers', () => {
      const data = {
        limit: 2000,
      };

      const schema = {
        limit: {
          required: true,
          type: 'number' as const,
          min: 1,
          max: 1000,
        },
      };

      const result = RequestValidator.validate(data, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('at most 1000');
    });

    it('should validate string patterns', () => {
      const data = {
        symbol: 'invalid@symbol',
      };

      const schema = {
        symbol: {
          required: true,
          type: 'string' as const,
          pattern: /^[A-Z0-9]+$/,
        },
      };

      const result = RequestValidator.validate(data, schema);
      expect(result.valid).toBe(false);
    });

    it('should validate enum values', () => {
      const data = {
        timeframe: '5x',
      };

      const schema = {
        timeframe: {
          required: true,
          type: 'string' as const,
          enum: ['1m', '5m', '15m', '1h', '4h', '1d'],
        },
      };

      const result = RequestValidator.validate(data, schema);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateSymbol', () => {
    it('should validate correct symbols', () => {
      const validSymbols = ['BTC', 'BTCUSDT', 'BTC/USDT', 'BTC-USDT'];
      
      for (const symbol of validSymbols) {
        const result = RequestValidator.validateSymbol(symbol);
        expect(result.valid).toBe(true);
      }
    });

    it('should reject invalid symbols', () => {
      const invalidSymbols = ['', 'invalid@', 'btc', '123'];
      
      for (const symbol of invalidSymbols) {
        const result = RequestValidator.validateSymbol(symbol);
        expect(result.valid).toBe(false);
      }
    });
  });

  describe('validateTimeframe', () => {
    it('should validate correct timeframes', () => {
      const validTimeframes = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];
      
      for (const tf of validTimeframes) {
        const result = RequestValidator.validateTimeframe(tf);
        expect(result.valid).toBe(true);
      }
    });

    it('should reject invalid timeframes', () => {
      const invalidTimeframes = ['5x', '2h', '10m', 'invalid'];
      
      for (const tf of invalidTimeframes) {
        const result = RequestValidator.validateTimeframe(tf);
        expect(result.valid).toBe(false);
      }
    });
  });

  describe('validatePagination', () => {
    it('should validate correct pagination', () => {
      const result = RequestValidator.validatePagination(1, 100);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid page numbers', () => {
      const result = RequestValidator.validatePagination(0, 100);
      expect(result.valid).toBe(false);
    });

    it('should reject invalid limits', () => {
      const result1 = RequestValidator.validatePagination(1, 0);
      expect(result1.valid).toBe(false);

      const result2 = RequestValidator.validatePagination(1, 2000);
      expect(result2.valid).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove dangerous characters', () => {
      const dangerous = '<script>alert("XSS")</script>';
      const sanitized = RequestValidator.sanitizeInput(dangerous);
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
    });

    it('should remove SQL injection attempts', () => {
      const dangerous = "'; DROP TABLE users; --";
      const sanitized = RequestValidator.sanitizeInput(dangerous);
      expect(sanitized).not.toContain("'");
      expect(sanitized).not.toContain(';');
    });

    it('should preserve normal input', () => {
      const normal = 'BTCUSDT';
      const sanitized = RequestValidator.sanitizeInput(normal);
      expect(sanitized).toBe(normal);
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize all string fields', () => {
      const obj = {
        name: '<b>Test</b>',
        symbol: "BTC'; DROP TABLE",
        value: 'normal',
      };

      const sanitized = RequestValidator.sanitizeObject(obj);
      expect(sanitized.name).not.toContain('<');
      expect(sanitized.symbol).not.toContain("'");
      expect(sanitized.value).toBe('normal');
    });

    it('should handle nested objects', () => {
      const obj = {
        user: {
          name: '<script>alert(1)</script>',
        },
      };

      const sanitized = RequestValidator.sanitizeObject(obj);
      expect(sanitized.user.name).not.toContain('<script>');
    });
  });
});

describe('CommonSchemas', () => {
  it('should have marketPriceRequest schema', () => {
    expect(CommonSchemas.marketPriceRequest).toBeDefined();
    expect(CommonSchemas.marketPriceRequest.symbols).toBeDefined();
  });

  it('should have historicalDataRequest schema', () => {
    expect(CommonSchemas.historicalDataRequest).toBeDefined();
    expect(CommonSchemas.historicalDataRequest.symbol).toBeDefined();
    expect(CommonSchemas.historicalDataRequest.interval).toBeDefined();
  });

  it('should validate with marketPriceRequest schema', () => {
    const data = { symbols: 'BTC,ETH' };
    const result = RequestValidator.validate(data, CommonSchemas.marketPriceRequest);
    expect(result.valid).toBe(true);
  });
});

describe('ErrorHandler', () => {
  it('should handle generic errors', () => {
    const error = new Error('Test error');
    const result = ErrorHandler.handleGenericError(error, 'Test');
    
    expect(result.passed).toBe(false);
    expect(result.error).toContain('Test error');
  });
});

describe('APITestError', () => {
  it('should create custom error', () => {
    const error = new APITestError('Test error', 'Test Name', 404);
    
    expect(error.message).toBe('Test error');
    expect(error.testName).toBe('Test Name');
    expect(error.statusCode).toBe(404);
    expect(error.name).toBe('APITestError');
  });
});

describe('RetryHandler', () => {
  it('should execute function successfully', async () => {
    const fn = async () => 'success';
    const result = await RetryHandler.executeWithRetry(fn, 3, 100);
    expect(result).toBe('success');
  });

  it('should retry on failure', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Fail');
      }
      return 'success';
    };

    const result = await RetryHandler.executeWithRetry(fn, 3, 10);
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should throw after max retries', async () => {
    const fn = async () => {
      throw new Error('Always fail');
    };

    await expect(
      RetryHandler.executeWithRetry(fn, 2, 10)
    ).rejects.toThrow('Always fail');
  });
});

