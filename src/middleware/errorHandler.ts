/**
 * Error Handler Middleware - مدیریت هوشمند خطاها
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../core/Logger.js';

const logger = Logger.getInstance();

export interface APIError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  isOperational?: boolean;
}

export class AppError extends Error implements APIError {
  statusCode: number;
  code: string;
  details?: any;
  isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * پیام‌های خطای کاربرپسند
 */
const ERROR_MESSAGES: Record<string, string> = {
  // خطاهای شبکه
  ECONNREFUSED: 'Unable to connect to the service. Please check your connection.',
  ETIMEDOUT: 'Request timed out. Please try again.',
  ENOTFOUND: 'Service not found. Please check the configuration.',
  
  // خطاهای دسترسی
  UNAUTHORIZED: 'Authentication required. Please login.',
  FORBIDDEN: 'You don\'t have permission to access this resource.',
  NOT_FOUND: 'The requested resource was not found.',
  
  // خطاهای داده
  INVALID_INPUT: 'Invalid input data. Please check your request.',
  VALIDATION_ERROR: 'Data validation failed. Please check the required fields.',
  MISSING_PARAMETER: 'Required parameter is missing.',
  
  // خطاهای سرویس
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable. Please try again later.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please slow down.',
  INTERNAL_ERROR: 'An internal error occurred. Our team has been notified.',
};

/**
 * دریافت پیام خطای کاربرپسند
 */
function getUserFriendlyMessage(error: APIError): string {
  // اگر پیام سفارشی وجود دارد
  if (error.code && ERROR_MESSAGES[error.code]) {
    return ERROR_MESSAGES[error.code];
  }

  // بر اساس status code
  if (error.statusCode) {
    switch (error.statusCode) {
      case 400:
        return 'Bad request. Please check your input.';
      case 401:
        return 'Authentication required.';
      case 403:
        return 'Access denied.';
      case 404:
        return 'Resource not found.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'Internal server error. Please try again.';
      case 503:
        return 'Service temporarily unavailable.';
      default:
        return 'An error occurred. Please try again.';
    }
  }

  return error.message || 'An unexpected error occurred.';
}

/**
 * تعیین status code بر اساس خطا
 */
function getStatusCode(error: APIError): number {
  if (error.statusCode) {
    return error.statusCode;
  }

  // خطاهای شبکه
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return 503;
  }

  if (error.code === 'ETIMEDOUT') {
    return 504;
  }

  // خطاهای validation
  if (error.name === 'ValidationError') {
    return 400;
  }

  // پیش‌فرض
  return 500;
}

/**
 * Middleware اصلی کنترل خطا
 */
export function errorHandler(
  error: APIError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = getStatusCode(error);
  const userMessage = getUserFriendlyMessage(error);

  // لاگ خطا
  if (statusCode >= 500) {
    logger.error('Server error', {
      path: req.path,
      method: req.method,
      statusCode,
      code: error.code,
      message: error.message,
      stack: error.stack,
    }, error);
  } else {
    logger.warn('Client error', {
      path: req.path,
      method: req.method,
      statusCode,
      code: error.code,
      message: error.message,
    });
  }

  // پاسخ به کلاینت
  const response: any = {
    success: false,
    error: {
      message: userMessage,
      code: error.code || 'UNKNOWN_ERROR',
      statusCode,
    },
    timestamp: Date.now(),
  };

  // اضافه کردن جزئیات در حالت توسعه
  if (process.env.NODE_ENV === 'development') {
    response.error.details = error.details;
    response.error.stack = error.stack;
    response.error.originalMessage = error.message;
  }

  res.status(statusCode).json(response);
}

/**
 * Middleware برای خطاهای 404
 */
export function notFoundHandler(req: Request, res: Response): void {
  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
  });

  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: 'NOT_FOUND',
      statusCode: 404,
    },
    timestamp: Date.now(),
  });
}

/**
 * Wrapper برای async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Middleware برای validation ورودی
 */
export function validateRequest(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // TODO: اضافه کردن validation با Joi یا Zod
      next();
    } catch (error) {
      next(new AppError(
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        error
      ));
    }
  };
}

/**
 * Middleware برای rate limiting
 */
export function rateLimitHandler(req: Request, res: Response, next: NextFunction): void {
  // TODO: پیاده‌سازی rate limiting
  next();
}

export default {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  validateRequest,
  rateLimitHandler,
  AppError,
};

