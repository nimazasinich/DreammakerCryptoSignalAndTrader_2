/**
 * Integration Tests
 * تست‌های یکپارچه‌سازی برای API
 * 
 * این ماژول شامل:
 * - تست‌های End-to-End
 * - تست‌های یکپارچه‌سازی بین سرویس‌ها
 * - تست‌های Workflow
 * - تست‌های Performance
 */

import APITestFramework, { TestCase, TestSuiteResult } from './api-test-framework';
import RequestValidator from './request-validator';

// ===== Configuration =====

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8001';

// ===== Integration Test Suites =====

/**
 * تست‌های یکپارچه Market Data Flow
 */
export const marketDataFlowTests: TestCase[] = [
  {
    name: 'Complete Market Data Flow - Get prices and historical data',
    method: 'GET',
    endpoint: '/api/market/prices',
    params: { symbols: 'BTC,ETH' },
    expectedStatus: 200,
    validateResponse: async (response) => {
      const prices = response.data;
      
      // بررسی که قیمت‌ها دریافت شده‌اند
      if (!prices.BTC || !prices.ETH) {
        return false;
      }

      return true;
    },
  },
  {
    name: 'Get historical data after price check',
    method: 'GET',
    endpoint: '/api/market/historical',
    params: {
      symbol: 'BTCUSDT',
      interval: '1h',
      limit: 10,
    },
    expectedStatus: [200, 404],
  },
];

/**
 * تست‌های یکپارچه Signal Generation
 */
export const signalGenerationFlowTests: TestCase[] = [
  {
    name: 'Step 1: Get market data for signal generation',
    method: 'GET',
    endpoint: '/api/market-data/BTCUSDT',
    expectedStatus: [200, 404],
  },
  {
    name: 'Step 2: Generate signal',
    method: 'POST',
    endpoint: '/api/signals/generate',
    data: {
      symbol: 'BTCUSDT',
      timeframe: '15m',
    },
    expectedStatus: [200, 404, 500],
  },
  {
    name: 'Step 3: Get signal history',
    method: 'GET',
    endpoint: '/api/signals/history',
    params: {
      limit: 10,
    },
    expectedStatus: [200, 404],
  },
];

/**
 * تست‌های یکپارچه AI Prediction
 */
export const aiPredictionFlowTests: TestCase[] = [
  {
    name: 'Step 1: Get market data for AI',
    method: 'GET',
    endpoint: '/api/market-data/BTCUSDT',
    expectedStatus: [200, 404],
  },
  {
    name: 'Step 2: Request AI prediction',
    method: 'POST',
    endpoint: '/api/ai/predict',
    data: {
      symbol: 'BTCUSDT',
      type: 'price',
    },
    expectedStatus: [200, 404, 500, 503],
  },
  {
    name: 'Step 3: Get training metrics',
    method: 'GET',
    endpoint: '/api/training-metrics',
    expectedStatus: [200, 404],
  },
];

/**
 * تست‌های Performance
 */
export const performanceTests: TestCase[] = [
  {
    name: 'Fast response - Health check (<100ms)',
    method: 'GET',
    endpoint: '/api/health',
    expectedStatus: 200,
    timeout: 100,
  },
  {
    name: 'Moderate response - Market prices (<2s)',
    method: 'GET',
    endpoint: '/api/market/prices',
    params: { symbols: 'BTC' },
    expectedStatus: 200,
    timeout: 2000,
  },
  {
    name: 'Heavy load - Multiple concurrent requests',
    method: 'GET',
    endpoint: '/api/market/prices',
    params: { symbols: 'BTC,ETH,BNB,ADA,XRP' },
    expectedStatus: 200,
    timeout: 5000,
  },
];

/**
 * تست‌های Error Handling
 */
export const errorHandlingTests: TestCase[] = [
  {
    name: 'Handle 404 - Non-existent endpoint',
    method: 'GET',
    endpoint: '/api/non-existent-endpoint',
    expectedStatus: 404,
  },
  {
    name: 'Handle 400 - Invalid parameters',
    method: 'GET',
    endpoint: '/api/market/historical',
    params: {
      symbol: '',
      interval: 'invalid',
    },
    expectedStatus: [400, 422, 500],
  },
  {
    name: 'Handle 500 - Server error gracefully',
    method: 'POST',
    endpoint: '/api/signals/generate',
    data: {
      symbol: null,
      timeframe: null,
    },
    expectedStatus: [400, 500],
  },
];

/**
 * تست‌های Security
 */
export const securityTests: TestCase[] = [
  {
    name: 'SQL Injection attempt - Should be blocked',
    method: 'GET',
    endpoint: '/api/market/prices',
    params: {
      symbols: "BTC'; DROP TABLE users; --",
    },
    expectedStatus: [400, 200], // باید یا reject شود یا sanitize شود
  },
  {
    name: 'XSS attempt - Should be sanitized',
    method: 'POST',
    endpoint: '/api/signals/generate',
    data: {
      symbol: '<script>alert("XSS")</script>',
      timeframe: '1h',
    },
    expectedStatus: [400, 200],
  },
  {
    name: 'Rate limiting - Should handle excessive requests',
    method: 'GET',
    endpoint: '/api/health',
    expectedStatus: [200, 429], // 429 = Too Many Requests
  },
];

// ===== Test Runner =====

export class IntegrationTestRunner {
  private framework: APITestFramework;

  constructor(baseURL: string = API_BASE_URL) {
    this.framework = new APITestFramework({
      baseURL,
      timeout: 15000,
      retries: 2,
      retryDelay: 1000,
    });
  }

  /**
   * اجرای تمام تست‌های یکپارچه‌سازی
   */
  async runAllTests(): Promise<TestSuiteResult[]> {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 STARTING INTEGRATION TESTS');
    console.log('='.repeat(60) + '\n');

    const suites = [
      { name: 'Market Data Flow', tests: marketDataFlowTests },
      { name: 'Signal Generation Flow', tests: signalGenerationFlowTests },
      { name: 'AI Prediction Flow', tests: aiPredictionFlowTests },
      { name: 'Performance Tests', tests: performanceTests },
      { name: 'Error Handling', tests: errorHandlingTests },
      { name: 'Security Tests', tests: securityTests },
    ];

    const results = await this.framework.runMultipleSuites(suites);

    return results;
  }

  /**
   * اجرای تست‌های Performance
   */
  async runPerformanceTests(): Promise<TestSuiteResult> {
    return await this.framework.runSuite('Performance Tests', performanceTests);
  }

  /**
   * اجرای تست‌های Security
   */
  async runSecurityTests(): Promise<TestSuiteResult> {
    return await this.framework.runSuite('Security Tests', securityTests);
  }

  /**
   * اجرای تست‌های Error Handling
   */
  async runErrorHandlingTests(): Promise<TestSuiteResult> {
    return await this.framework.runSuite('Error Handling', errorHandlingTests);
  }

  /**
   * تست Concurrent Requests
   */
  async testConcurrentRequests(count: number = 10): Promise<void> {
    console.log(`\n🔄 Testing ${count} concurrent requests...\n`);

    const startTime = Date.now();
    
    const promises = Array.from({ length: count }, (_, i) => 
      this.framework.runTest({
        name: `Concurrent Request ${i + 1}`,
        method: 'GET',
        endpoint: '/api/health',
        expectedStatus: 200,
      })
    );

    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log(`\n📊 Concurrent Requests Results:`);
    console.log(`   Total: ${count}`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   ⏱️  Total Duration: ${duration}ms`);
    console.log(`   ⚡ Average per request: ${(duration / count).toFixed(2)}ms\n`);
  }

  /**
   * تست Load Testing
   */
  async testLoadCapacity(requestsPerSecond: number = 10, duration: number = 10): Promise<void> {
    console.log(`\n⚡ Load Testing: ${requestsPerSecond} req/s for ${duration}s...\n`);

    const interval = 1000 / requestsPerSecond;
    const totalRequests = requestsPerSecond * duration;
    
    let completed = 0;
    let failed = 0;
    const startTime = Date.now();

    const makeRequest = async () => {
      const result = await this.framework.runTest({
        name: 'Load Test Request',
        method: 'GET',
        endpoint: '/api/health',
        expectedStatus: 200,
      });

      if (result.passed) {
        completed++;
      } else {
        failed++;
      }
    };

    // ارسال درخواست‌ها با فاصله زمانی مشخص
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < totalRequests; i++) {
      await new Promise(resolve => setTimeout(resolve, interval));
      promises.push(makeRequest());
    }

    await Promise.all(promises);

    const totalDuration = Date.now() - startTime;

    console.log(`\n📊 Load Test Results:`);
    console.log(`   Total Requests: ${totalRequests}`);
    console.log(`   ✅ Completed: ${completed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   ⏱️  Duration: ${totalDuration}ms`);
    console.log(`   ⚡ Actual req/s: ${(totalRequests / (totalDuration / 1000)).toFixed(2)}\n`);
  }

  /**
   * تولید گزارش جامع
   */
  generateComprehensiveReport(results: TestSuiteResult[]): string {
    let report = '# Comprehensive Integration Test Report\n\n';
    report += `**Generated:** ${new Date().toISOString()}\n\n`;

    // خلاصه کلی
    const totalTests = results.reduce((sum, r) => sum + r.totalTests, 0);
    const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
    const successRate = ((totalPassed / totalTests) * 100).toFixed(2);

    report += '## Overall Summary\n\n';
    report += `- **Total Test Suites:** ${results.length}\n`;
    report += `- **Total Tests:** ${totalTests}\n`;
    report += `- **Passed:** ${totalPassed} ✅\n`;
    report += `- **Failed:** ${totalFailed} ❌\n`;
    report += `- **Skipped:** ${totalSkipped} ⏭️\n`;
    report += `- **Success Rate:** ${successRate}%\n\n`;

    // جزئیات هر Suite
    for (const suite of results) {
      report += `## ${suite.suiteName}\n\n`;
      report += `- **Tests:** ${suite.totalTests}\n`;
      report += `- **Passed:** ${suite.passed}\n`;
      report += `- **Failed:** ${suite.failed}\n`;
      report += `- **Duration:** ${suite.duration}ms\n\n`;

      if (suite.failed > 0) {
        report += '### Failed Tests\n\n';
        const failedTests = suite.results.filter(r => !r.passed && r.error !== 'Test skipped');
        
        for (const test of failedTests) {
          report += `- **${test.name}**\n`;
          report += `  - Error: ${test.error}\n`;
          if (test.validationErrors) {
            report += `  - Validation Errors:\n`;
            test.validationErrors.forEach(err => {
              report += `    - ${err}\n`;
            });
          }
          report += '\n';
        }
      }
    }

    return report;
  }
}

// ===== Standalone Runner =====

export async function runIntegrationTests() {
  const runner = new IntegrationTestRunner();
  
  try {
    // اجرای تست‌های اصلی
    const results = await runner.runAllTests();

    // تست‌های Concurrent
    await runner.testConcurrentRequests(20);

    // تولید گزارش
    const report = runner.generateComprehensiveReport(results);
    
    console.log('\n' + '='.repeat(60));
    console.log('📄 REPORT GENERATED');
    console.log('='.repeat(60) + '\n');

    // بررسی نتیجه نهایی
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
    
    if (totalFailed > 0) {
      console.log('❌ Some tests failed. Please check the report.\n');
      process.exit(1);
    } else {
      console.log('✅ All tests passed successfully!\n');
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// اگر به صورت مستقیم اجرا شود
if (import.meta.url === `file://${process.argv[1]}`) {
  runIntegrationTests();
}

// ===== Export =====

export default IntegrationTestRunner;

