/**
 * Testing Module - Index
 * صادرات تمام ماژول‌های تست
 */

// API Test Framework
export {
  APITestFramework,
  ResponseValidator,
  ErrorHandler,
  RetryHandler,
  APITestError,
} from './api-test-framework';

export type {
  TestConfig,
  TestCase,
  TestResult,
  TestSuiteResult,
} from './api-test-framework';

// Request Validator
export {
  RequestValidator,
  CommonSchemas,
  validateRequest,
  sanitizeRequest,
} from './request-validator';

export type {
  ValidationRule,
  ValidationSchema,
  ValidationResult,
  ValidationError,
} from './request-validator';

// Integration Tests
export {
  IntegrationTestRunner,
  runIntegrationTests,
  marketDataFlowTests,
  signalGenerationFlowTests,
  aiPredictionFlowTests,
  performanceTests,
  errorHandlingTests,
  securityTests,
} from './integration-tests';

// Market API Tests
export { runStandaloneTests as runMarketTests } from './market-api.test';

// Smart Features
export { SmartTestRunner } from './smart-runner';
export { testConfig, TestConfigManager } from './config';
export type { SmartTestConfig } from './config';
export { AutoTestScheduler, initAutoTest } from './auto-test';

// Middleware & Plugins
export { TestingMiddleware, healthCheckWithTests } from './middleware';
export { PluginManager, pluginManager, LoggerPlugin, RetryPlugin, CachePlugin } from './plugin';
export type { TestPlugin } from './plugin';

