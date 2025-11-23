/**
 * API Test Framework
 * چارچوب قدرتمند برای تست خودکار API
 * 
 * ویژگی‌ها:
 * - تست خودکار endpoint‌ها
 * - اعتبارسنجی request و response
 * - مدیریت خطاها
 * - گزارش‌دهی جامع
 * - پشتیبانی از Retry و Timeout
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// ===== Types =====

export interface TestConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  validateStatus?: (status: number) => boolean;
}

export interface TestCase {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  data?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  expectedStatus?: number | number[];
  expectedSchema?: any;
  validateResponse?: (response: AxiosResponse) => boolean | Promise<boolean>;
  skip?: boolean;
  timeout?: number;
}

export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  status?: number;
  error?: string;
  response?: any;
  validationErrors?: string[];
}

export interface TestSuiteResult {
  suiteName: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: TestResult[];
  timestamp: Date;
}

// ===== Validators =====

export class ResponseValidator {
  /**
   * اعتبارسنجی ساختار پاسخ با Schema
   */
  static validateSchema(data: any, schema: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (typeof schema !== 'object' || schema === null) {
      return { valid: true, errors };
    }

    for (const [key, expectedType] of Object.entries(schema)) {
      if (!(key in data)) {
        errors.push(`Missing required field: ${key}`);
        continue;
      }

      const actualValue = data[key];
      
      if (expectedType === 'array') {
        if (!Array.isArray(actualValue)) {
          errors.push(`Field ${key} should be an array`);
        }
      } else if (expectedType === 'object') {
        if (typeof actualValue !== 'object' || actualValue === null || Array.isArray(actualValue)) {
          errors.push(`Field ${key} should be an object`);
        }
      } else if (typeof expectedType === 'object' && expectedType !== null) {
        // Nested schema
        if (typeof actualValue === 'object' && actualValue !== null) {
          const nestedResult = this.validateSchema(actualValue, expectedType);
          errors.push(...nestedResult.errors.map(e => `${key}.${e}`));
        } else {
          errors.push(`Field ${key} should be an object`);
        }
      } else if (typeof actualValue !== expectedType) {
        errors.push(`Field ${key} should be of type ${expectedType}, got ${typeof actualValue}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * اعتبارسنجی Status Code
   */
  static validateStatus(actual: number, expected: number | number[]): boolean {
    if (Array.isArray(expected)) {
      return expected.includes(actual);
    }
    return actual === expected;
  }

  /**
   * اعتبارسنجی Headers
   */
  static validateHeaders(headers: any, required: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const header of required) {
      if (!headers[header] && !headers[header.toLowerCase()]) {
        errors.push(`Missing required header: ${header}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

// ===== Error Handler =====

export class APITestError extends Error {
  constructor(
    message: string,
    public testName: string,
    public statusCode?: number,
    public response?: any,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'APITestError';
  }
}

export class ErrorHandler {
  /**
   * مدیریت خطاهای Axios
   */
  static handleAxiosError(error: AxiosError, testName: string): TestResult {
    const duration = 0;
    
    if (error.response) {
      // سرور پاسخ داده اما با خطا
      return {
        name: testName,
        passed: false,
        duration,
        status: error.response.status,
        error: `HTTP ${error.response.status}: ${error.response.statusText}`,
        response: error.response.data,
      };
    } else if (error.request) {
      // درخواست ارسال شده اما پاسخی دریافت نشده
      return {
        name: testName,
        passed: false,
        duration,
        error: 'No response received from server (timeout or network error)',
      };
    } else {
      // خطا در تنظیم درخواست
      return {
        name: testName,
        passed: false,
        duration,
        error: `Request setup error: ${error.message}`,
      };
    }
  }

  /**
   * مدیریت خطاهای عمومی
   */
  static handleGenericError(error: Error, testName: string): TestResult {
    return {
      name: testName,
      passed: false,
      duration: 0,
      error: `Unexpected error: ${error.message}`,
    };
  }
}

// ===== Retry Logic =====

export class RetryHandler {
  /**
   * اجرای درخواست با قابلیت Retry
   */
  static async executeWithRetry<T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i <= retries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (i < retries) {
          // منتظر بمان قبل از تلاش مجدد
          await this.sleep(delay * Math.pow(2, i)); // Exponential backoff
        }
      }
    }

    throw lastError;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ===== Main Test Framework =====

export class APITestFramework {
  private client: AxiosInstance;
  private config: TestConfig;

  constructor(config: TestConfig) {
    this.config = {
      timeout: 10000,
      retries: 3,
      retryDelay: 1000,
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: this.config.headers,
      validateStatus: this.config.validateStatus || (() => true), // قبول همه status code‌ها
    });
  }

  /**
   * اجرای یک Test Case
   */
  async runTest(testCase: TestCase): Promise<TestResult> {
    if (testCase.skip) {
      return {
        name: testCase.name,
        passed: false,
        duration: 0,
        error: 'Test skipped',
      };
    }

    const startTime = Date.now();

    try {
      // ساخت config درخواست
      const requestConfig: AxiosRequestConfig = {
        method: testCase.method,
        url: testCase.endpoint,
        data: testCase.data,
        params: testCase.params,
        headers: testCase.headers,
        timeout: testCase.timeout || this.config.timeout,
      };

      // اجرای درخواست با Retry
      const response = await RetryHandler.executeWithRetry(
        () => this.client.request(requestConfig),
        this.config.retries,
        this.config.retryDelay
      );

      const duration = Date.now() - startTime;

      // اعتبارسنجی Status Code
      const expectedStatus = testCase.expectedStatus || 200;
      const statusValid = ResponseValidator.validateStatus(response.status, expectedStatus);

      if (!statusValid) {
        return {
          name: testCase.name,
          passed: false,
          duration,
          status: response.status,
          error: `Expected status ${expectedStatus}, got ${response.status}`,
          response: response.data,
        };
      }

      // اعتبارسنجی Schema
      const validationErrors: string[] = [];
      if (testCase.expectedSchema) {
        const schemaValidation = ResponseValidator.validateSchema(
          response.data,
          testCase.expectedSchema
        );
        if (!schemaValidation.valid) {
          validationErrors.push(...schemaValidation.errors);
        }
      }

      // اعتبارسنجی سفارشی
      if (testCase.validateResponse) {
        const customValid = await testCase.validateResponse(response);
        if (!customValid) {
          validationErrors.push('Custom validation failed');
        }
      }

      // نتیجه نهایی
      const passed = validationErrors.length === 0;

      return {
        name: testCase.name,
        passed,
        duration,
        status: response.status,
        response: response.data,
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (axios.isAxiosError(error)) {
        const result = ErrorHandler.handleAxiosError(error, testCase.name);
        return { ...result, duration };
      } else {
        return ErrorHandler.handleGenericError(error as Error, testCase.name);
      }
    }
  }

  /**
   * اجرای یک Test Suite
   */
  async runSuite(suiteName: string, testCases: TestCase[]): Promise<TestSuiteResult> {
    const startTime = Date.now();
    const results: TestResult[] = [];

    console.log(`\n🧪 Running Test Suite: ${suiteName}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    for (const testCase of testCases) {
      console.log(`  ▶ ${testCase.name}...`);
      const result = await this.runTest(testCase);
      results.push(result);

      if (result.passed) {
        console.log(`    ✅ PASSED (${result.duration}ms)`);
      } else {
        console.log(`    ❌ FAILED: ${result.error}`);
        if (result.validationErrors) {
          result.validationErrors.forEach(err => {
            console.log(`       - ${err}`);
          });
        }
      }
    }

    const duration = Date.now() - startTime;
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed && r.error !== 'Test skipped').length;
    const skipped = results.filter(r => r.error === 'Test skipped').length;

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 Test Suite Results:`);
    console.log(`   Total: ${testCases.length}`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ⏱️  Duration: ${duration}ms`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    return {
      suiteName,
      totalTests: testCases.length,
      passed,
      failed,
      skipped,
      duration,
      results,
      timestamp: new Date(),
    };
  }

  /**
   * اجرای چندین Test Suite
   */
  async runMultipleSuites(suites: { name: string; tests: TestCase[] }[]): Promise<TestSuiteResult[]> {
    const allResults: TestSuiteResult[] = [];

    for (const suite of suites) {
      const result = await this.runSuite(suite.name, suite.tests);
      allResults.push(result);
    }

    // خلاصه کلی
    const totalPassed = allResults.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = allResults.reduce((sum, r) => sum + r.failed, 0);
    const totalSkipped = allResults.reduce((sum, r) => sum + r.skipped, 0);
    const totalDuration = allResults.reduce((sum, r) => sum + r.duration, 0);

    console.log(`\n${'='.repeat(50)}`);
    console.log(`📈 OVERALL TEST SUMMARY`);
    console.log(`${'='.repeat(50)}`);
    console.log(`Total Suites: ${suites.length}`);
    console.log(`Total Tests: ${totalPassed + totalFailed + totalSkipped}`);
    console.log(`✅ Passed: ${totalPassed}`);
    console.log(`❌ Failed: ${totalFailed}`);
    console.log(`⏭️  Skipped: ${totalSkipped}`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    console.log(`${'='.repeat(50)}\n`);

    return allResults;
  }

  /**
   * تولید گزارش JSON
   */
  generateJSONReport(results: TestSuiteResult[]): string {
    return JSON.stringify(results, null, 2);
  }

  /**
   * تولید گزارش Markdown
   */
  generateMarkdownReport(results: TestSuiteResult[]): string {
    let markdown = '# API Test Report\n\n';
    markdown += `**Generated:** ${new Date().toISOString()}\n\n`;

    for (const suite of results) {
      markdown += `## ${suite.suiteName}\n\n`;
      markdown += `- **Total Tests:** ${suite.totalTests}\n`;
      markdown += `- **Passed:** ${suite.passed} ✅\n`;
      markdown += `- **Failed:** ${suite.failed} ❌\n`;
      markdown += `- **Skipped:** ${suite.skipped} ⏭️\n`;
      markdown += `- **Duration:** ${suite.duration}ms\n\n`;

      markdown += `### Test Results\n\n`;
      markdown += `| Test Name | Status | Duration | Error |\n`;
      markdown += `|-----------|--------|----------|-------|\n`;

      for (const result of suite.results) {
        const status = result.passed ? '✅ PASS' : '❌ FAIL';
        const error = result.error || '-';
        markdown += `| ${result.name} | ${status} | ${result.duration}ms | ${error} |\n`;
      }

      markdown += `\n`;
    }

    return markdown;
  }
}

// ===== Export =====

export default APITestFramework;

