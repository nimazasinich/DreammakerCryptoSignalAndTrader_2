/**
 * Smart Test Runner
 * اجرای هوشمند تست‌ها با قابلیت‌های پیشرفته
 */

import APITestFramework, { TestCase, TestResult, TestSuiteResult } from './api-test-framework';
import { testConfig, SmartTestConfig } from './config';
import * as fs from 'fs';
import * as path from 'path';

export class SmartTestRunner {
  private framework: APITestFramework;
  private config: SmartTestConfig;
  private cache: Map<string, any> = new Map();

  constructor(customConfig?: Partial<SmartTestConfig>) {
    if (customConfig) {
      testConfig.updateConfig(customConfig);
    }
    
    this.config = testConfig.getConfig();
    this.framework = new APITestFramework({
      baseURL: this.config.baseURL!,
      timeout: this.config.timeout,
      retries: this.config.retries,
      retryDelay: this.config.retryDelay,
    });
  }

  /**
   * اجرای هوشمند تست‌ها با قابلیت parallel
   */
  async runTests(tests: TestCase[]): Promise<TestSuiteResult> {
    if (this.config.parallelTests) {
      return await this.runParallel(tests);
    } else {
      return await this.runSequential(tests);
    }
  }

  private async runParallel(tests: TestCase[]): Promise<TestSuiteResult> {
    const startTime = Date.now();
    const maxParallel = this.config.maxParallel || 5;
    const results: TestResult[] = [];
    
    // Split tests into chunks
    for (let i = 0; i < tests.length; i += maxParallel) {
      const chunk = tests.slice(i, i + maxParallel);
      const chunkResults = await Promise.all(
        chunk.map(test => this.runSingleTest(test))
      );
      
      results.push(...chunkResults);
      
      // Fail fast if enabled
      if (this.config.failFast && chunkResults.some(r => !r.passed)) {
        break;
      }
    }

    return this.buildSuiteResult('Smart Test Suite', tests, results, startTime);
  }

  private async runSequential(tests: TestCase[]): Promise<TestSuiteResult> {
    const startTime = Date.now();
    const results: TestResult[] = [];

    for (const test of tests) {
      const result = await this.runSingleTest(test);
      results.push(result);
      
      if (this.config.failFast && !result.passed) {
        break;
      }
    }

    return this.buildSuiteResult('Smart Test Suite', tests, results, startTime);
  }

  private async runSingleTest(test: TestCase): Promise<TestResult> {
    // Apply adaptive timeout
    const adaptiveTest = {
      ...test,
      timeout: testConfig.getAdaptiveTimeout(test.endpoint),
    };

    // Check cache if enabled
    if (this.config.cacheResponses) {
      const cacheKey = this.getCacheKey(test);
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }
    }

    // Run test
    const result = await this.framework.runTest(adaptiveTest);

    // Cache result if successful
    if (this.config.cacheResponses && result.passed) {
      const cacheKey = this.getCacheKey(test);
      this.cache.set(cacheKey, result);
    }

    // Save on fail if enabled
    if (this.config.saveOnFail && !result.passed) {
      await this.saveFailedTest(test, result);
    }

    return result;
  }

  private getCacheKey(test: TestCase): string {
    return `${test.method}:${test.endpoint}:${JSON.stringify(test.params || {})}`;
  }

  private async saveFailedTest(test: TestCase, result: TestResult): Promise<void> {
    if (!this.config.reportDir) return;

    const dir = this.config.reportDir;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `failed-${test.name.replace(/\s+/g, '-')}-${timestamp}.json`;
    const filepath = path.join(dir, filename);

    fs.writeFileSync(filepath, JSON.stringify({ test, result }, null, 2));
  }

  private buildSuiteResult(
    name: string,
    tests: TestCase[],
    results: TestResult[],
    startTime: number
  ): TestSuiteResult {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed && r.error !== 'Test skipped').length;
    const skipped = results.filter(r => r.error === 'Test skipped').length;

    return {
      suiteName: name,
      totalTests: tests.length,
      passed,
      failed,
      skipped,
      duration: Date.now() - startTime,
      results,
      timestamp: new Date(),
    };
  }

  /**
   * تولید گزارش بر اساس تنظیمات
   */
  async generateReport(results: TestSuiteResult[]): Promise<void> {
    if (!this.config.reportDir) return;

    const dir = this.config.reportDir;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (this.config.reportFormat === 'json' || this.config.reportFormat === 'all') {
      const jsonPath = path.join(dir, `report-${timestamp}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
    }

    if (this.config.reportFormat === 'markdown' || this.config.reportFormat === 'all') {
      const mdPath = path.join(dir, `report-${timestamp}.md`);
      const mdContent = this.framework.generateMarkdownReport(results);
      fs.writeFileSync(mdPath, mdContent);
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export default SmartTestRunner;

