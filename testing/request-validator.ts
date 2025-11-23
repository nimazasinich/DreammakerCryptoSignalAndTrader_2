/**
 * Request Validator
 * اعتبارسنجی پیشرفته درخواست‌های API
 * 
 * ویژگی‌ها:
 * - اعتبارسنجی پارامترها
 * - اعتبارسنجی Body
 * - اعتبارسنجی Headers
 * - اعتبارسنجی Query Parameters
 * - Type Checking
 * - Custom Validators
 */

// ===== Types =====

export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// ===== Validator Class =====

export class RequestValidator {
  /**
   * اعتبارسنجی داده با Schema
   */
  static validate(data: any, schema: ValidationSchema): ValidationResult {
    const errors: ValidationError[] = [];

    // بررسی فیلدهای required
    for (const [field, rules] of Object.entries(schema)) {
      if (rules.required && !(field in data)) {
        errors.push({
          field,
          message: `Field '${field}' is required`,
        });
        continue;
      }

      // اگر فیلد وجود ندارد و required نیست، ادامه بده
      if (!(field in data)) {
        continue;
      }

      const value = data[field];

      // Type Validation
      if (rules.type) {
        const typeError = this.validateType(field, value, rules.type);
        if (typeError) {
          errors.push(typeError);
          continue; // اگر type اشتباه است، بقیه validation‌ها را انجام نده
        }
      }

      // Min/Max Validation (برای numbers)
      if (rules.type === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push({
            field,
            message: `Field '${field}' must be at least ${rules.min}`,
            value,
          });
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push({
            field,
            message: `Field '${field}' must be at most ${rules.max}`,
            value,
          });
        }
      }

      // Length Validation (برای strings و arrays)
      if (rules.type === 'string' || rules.type === 'array') {
        const length = rules.type === 'string' ? value.length : value.length;
        
        if (rules.minLength !== undefined && length < rules.minLength) {
          errors.push({
            field,
            message: `Field '${field}' must have at least ${rules.minLength} ${rules.type === 'string' ? 'characters' : 'items'}`,
            value,
          });
        }
        if (rules.maxLength !== undefined && length > rules.maxLength) {
          errors.push({
            field,
            message: `Field '${field}' must have at most ${rules.maxLength} ${rules.type === 'string' ? 'characters' : 'items'}`,
            value,
          });
        }
      }

      // Pattern Validation (برای strings)
      if (rules.type === 'string' && rules.pattern) {
        if (!rules.pattern.test(value)) {
          errors.push({
            field,
            message: `Field '${field}' does not match the required pattern`,
            value,
          });
        }
      }

      // Enum Validation
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push({
          field,
          message: `Field '${field}' must be one of: ${rules.enum.join(', ')}`,
          value,
        });
      }

      // Custom Validation
      if (rules.custom) {
        const customResult = rules.custom(value);
        if (customResult !== true) {
          errors.push({
            field,
            message: typeof customResult === 'string' ? customResult : `Field '${field}' failed custom validation`,
            value,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * اعتبارسنجی نوع داده
   */
  private static validateType(field: string, value: any, expectedType: string): ValidationError | null {
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (actualType !== expectedType) {
      return {
        field,
        message: `Field '${field}' must be of type '${expectedType}', got '${actualType}'`,
        value,
      };
    }

    return null;
  }

  /**
   * اعتبارسنجی Symbol
   */
  static validateSymbol(symbol: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!symbol || typeof symbol !== 'string') {
      errors.push({
        field: 'symbol',
        message: 'Symbol is required and must be a string',
      });
      return { valid: false, errors };
    }

    // بررسی فرمت symbol
    const validSymbolPattern = /^[A-Z0-9]{2,10}([-\/]?[A-Z0-9]{2,10})?$/;
    if (!validSymbolPattern.test(symbol)) {
      errors.push({
        field: 'symbol',
        message: 'Invalid symbol format. Expected format: BTC, BTCUSDT, BTC/USDT, or BTC-USDT',
        value: symbol,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * اعتبارسنجی Timeframe
   */
  static validateTimeframe(timeframe: string): ValidationResult {
    const errors: ValidationError[] = [];

    const validTimeframes = [
      '1m', '3m', '5m', '15m', '30m',
      '1h', '2h', '4h', '6h', '8h', '12h',
      '1d', '3d', '1w', '1M'
    ];

    if (!validTimeframes.includes(timeframe)) {
      errors.push({
        field: 'timeframe',
        message: `Invalid timeframe. Must be one of: ${validTimeframes.join(', ')}`,
        value: timeframe,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * اعتبارسنجی Date Range
   */
  static validateDateRange(startDate: string | number, endDate: string | number): ValidationResult {
    const errors: ValidationError[] = [];

    const start = typeof startDate === 'string' ? new Date(startDate).getTime() : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate).getTime() : endDate;

    if (isNaN(start)) {
      errors.push({
        field: 'startDate',
        message: 'Invalid start date',
        value: startDate,
      });
    }

    if (isNaN(end)) {
      errors.push({
        field: 'endDate',
        message: 'Invalid end date',
        value: endDate,
      });
    }

    if (!isNaN(start) && !isNaN(end) && start >= end) {
      errors.push({
        field: 'dateRange',
        message: 'Start date must be before end date',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * اعتبارسنجی Pagination
   */
  static validatePagination(page?: number, limit?: number): ValidationResult {
    const errors: ValidationError[] = [];

    if (page !== undefined) {
      if (typeof page !== 'number' || page < 1) {
        errors.push({
          field: 'page',
          message: 'Page must be a positive integer',
          value: page,
        });
      }
    }

    if (limit !== undefined) {
      if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
        errors.push({
          field: 'limit',
          message: 'Limit must be between 1 and 1000',
          value: limit,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * اعتبارسنجی API Key
   */
  static validateApiKey(apiKey: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!apiKey || typeof apiKey !== 'string') {
      errors.push({
        field: 'apiKey',
        message: 'API key is required',
      });
      return { valid: false, errors };
    }

    if (apiKey.length < 16) {
      errors.push({
        field: 'apiKey',
        message: 'API key is too short',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize Input - پاکسازی ورودی از کاراکترهای خطرناک
   */
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return input;
    }

    // حذف کاراکترهای خطرناک
    return input
      .replace(/[<>]/g, '') // حذف HTML tags
      .replace(/['"]/g, '') // حذف quotes
      .replace(/[;]/g, '')  // حذف semicolons
      .trim();
  }

  /**
   * Sanitize Object - پاکسازی تمام فیلدهای یک object
   */
  static sanitizeObject(obj: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeInput(value);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Format Validation Errors - فرمت کردن خطاها برای نمایش
   */
  static formatErrors(errors: ValidationError[]): string {
    return errors.map(err => `${err.field}: ${err.message}`).join('; ');
  }
}

// ===== Common Validation Schemas =====

export const CommonSchemas = {
  /**
   * Schema برای درخواست قیمت بازار
   */
  marketPriceRequest: {
    symbols: {
      required: true,
      type: 'string' as const,
      minLength: 1,
      custom: (value: string) => {
        const symbols = value.split(',').map(s => s.trim());
        return symbols.every(s => /^[A-Z0-9]{2,10}$/.test(s)) || 'Invalid symbol format';
      },
    },
  },

  /**
   * Schema برای درخواست داده‌های تاریخی
   */
  historicalDataRequest: {
    symbol: {
      required: true,
      type: 'string' as const,
      pattern: /^[A-Z0-9]{2,10}([-\/]?[A-Z0-9]{2,10})?$/,
    },
    interval: {
      required: true,
      type: 'string' as const,
      enum: ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'],
    },
    limit: {
      required: false,
      type: 'number' as const,
      min: 1,
      max: 1000,
    },
    startTime: {
      required: false,
      type: 'number' as const,
      min: 0,
    },
    endTime: {
      required: false,
      type: 'number' as const,
      min: 0,
    },
  },

  /**
   * Schema برای درخواست سیگنال
   */
  signalRequest: {
    symbol: {
      required: true,
      type: 'string' as const,
      pattern: /^[A-Z0-9]{2,10}([-\/]?[A-Z0-9]{2,10})?$/,
    },
    timeframe: {
      required: false,
      type: 'string' as const,
      enum: ['1m', '5m', '15m', '1h', '4h', '1d'],
    },
  },

  /**
   * Schema برای درخواست Backtest
   */
  backtestRequest: {
    symbol: {
      required: true,
      type: 'string' as const,
    },
    strategy: {
      required: true,
      type: 'string' as const,
      minLength: 1,
    },
    startDate: {
      required: true,
      type: 'string' as const,
    },
    endDate: {
      required: true,
      type: 'string' as const,
    },
    initialCapital: {
      required: false,
      type: 'number' as const,
      min: 0,
    },
  },
};

// ===== Express Middleware =====

/**
 * Middleware برای اعتبارسنجی درخواست‌های Express
 */
export function validateRequest(schema: ValidationSchema) {
  return (req: any, res: any, next: any) => {
    // ترکیب params، query و body
    const data = {
      ...req.params,
      ...req.query,
      ...req.body,
    };

    const result = RequestValidator.validate(data, schema);

    if (!result.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.errors,
      });
    }

    next();
  };
}

/**
 * Middleware برای Sanitize کردن ورودی‌ها
 */
export function sanitizeRequest() {
  return (req: any, res: any, next: any) => {
    if (req.body && typeof req.body === 'object') {
      req.body = RequestValidator.sanitizeObject(req.body);
    }

    if (req.query && typeof req.query === 'object') {
      req.query = RequestValidator.sanitizeObject(req.query);
    }

    if (req.params && typeof req.params === 'object') {
      req.params = RequestValidator.sanitizeObject(req.params);
    }

    next();
  };
}

// ===== Export =====

export default RequestValidator;

