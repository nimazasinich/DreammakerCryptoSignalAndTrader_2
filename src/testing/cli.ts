#!/usr/bin/env node
/**
 * Testing CLI
 * ابزار خط فرمان برای اجرای تست‌های API
 * 
 * استفاده:
 * tsx src/testing/cli.ts [command] [options]
 * 
 * Commands:
 * - all: اجرای تمام تست‌ها
 * - market: تست‌های Market API
 * - integration: تست‌های یکپارچه‌سازی
 * - performance: تست‌های Performance
 * - security: تست‌های Security
 * - concurrent: تست Concurrent Requests
 * - load: تست Load Testing
 */

import { IntegrationTestRunner } from './integration-tests';
import APITestFramework from './api-test-framework';
import { marketDataFlowTests, performanceTests, securityTests } from './integration-tests';
import * as fs from 'fs';
import * as path from 'path';

// ===== Configuration =====

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8001';

// ===== CLI Commands =====

interface CLIOptions {
  baseUrl?: string;
  output?: string;
  format?: 'json' | 'markdown' | 'console';
  verbose?: boolean;
}

class TestingCLI {
  private runner: IntegrationTestRunner;
  private options: CLIOptions;

  constructor(options: CLIOptions = {}) {
    this.options = {
      baseUrl: options.baseUrl || API_BASE_URL,
      output: options.output,
      format: options.format || 'console',
      verbose: options.verbose || false,
    };

    this.runner = new IntegrationTestRunner(this.options.baseUrl);
  }

  /**
   * اجرای تمام تست‌ها
   */
  async runAll() {
    console.log('🚀 Running all tests...\n');
    const results = await this.runner.runAllTests();
    await this.saveResults(results, 'all-tests');
    return results;
  }

  /**
   * اجرای تست‌های Market
   */
  async runMarket() {
    console.log('🏪 Running Market API tests...\n');
    const framework = new APITestFramework({
      baseURL: this.options.baseUrl!,
      timeout: 15000,
      retries: 3,
    });
    const result = await framework.runSuite('Market API', marketDataFlowTests);
    await this.saveResults([result], 'market-tests');
    return [result];
  }

  /**
   * اجرای تست‌های Performance
   */
  async runPerformance() {
    console.log('⚡ Running Performance tests...\n');
    const result = await this.runner.runPerformanceTests();
    await this.saveResults([result], 'performance-tests');
    return [result];
  }

  /**
   * اجرای تست‌های Security
   */
  async runSecurity() {
    console.log('🔒 Running Security tests...\n');
    const result = await this.runner.runSecurityTests();
    await this.saveResults([result], 'security-tests');
    return [result];
  }

  /**
   * اجرای تست‌های Concurrent
   */
  async runConcurrent(count: number = 20) {
    console.log(`🔄 Running ${count} concurrent requests...\n`);
    await this.runner.testConcurrentRequests(count);
  }

  /**
   * اجرای تست‌های Load
   */
  async runLoad(rps: number = 10, duration: number = 10) {
    console.log(`⚡ Running load test: ${rps} req/s for ${duration}s...\n`);
    await this.runner.testLoadCapacity(rps, duration);
  }

  /**
   * ذخیره نتایج
   */
  private async saveResults(results: any[], filename: string) {
    if (!this.options.output) {
      return;
    }

    const outputDir = this.options.output;
    
    // ایجاد دایرکتوری در صورت عدم وجود
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (this.options.format === 'json' || this.options.format === 'console') {
      const jsonPath = path.join(outputDir, `${filename}-${timestamp}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
      console.log(`\n📄 JSON report saved to: ${jsonPath}`);
    }

    if (this.options.format === 'markdown' || this.options.format === 'console') {
      const mdPath = path.join(outputDir, `${filename}-${timestamp}.md`);
      const report = this.runner.generateComprehensiveReport(results);
      fs.writeFileSync(mdPath, report);
      console.log(`📄 Markdown report saved to: ${mdPath}`);
    }
  }

  /**
   * نمایش راهنما
   */
  static showHelp() {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    API Testing CLI Tool                        ║
╚════════════════════════════════════════════════════════════════╝

Usage: tsx src/testing/cli.ts [command] [options]

Commands:
  all                 Run all tests
  market              Run Market API tests
  integration         Run integration tests
  performance         Run performance tests
  security            Run security tests
  concurrent [count]  Run concurrent requests test (default: 20)
  load [rps] [dur]    Run load test (default: 10 req/s for 10s)
  help                Show this help message

Options:
  --base-url <url>    API base URL (default: http://localhost:8001)
  --output <dir>      Output directory for reports
  --format <format>   Report format: json, markdown, console (default: console)
  --verbose           Verbose output

Examples:
  tsx src/testing/cli.ts all
  tsx src/testing/cli.ts market --output ./reports
  tsx src/testing/cli.ts performance --format json
  tsx src/testing/cli.ts concurrent 50
  tsx src/testing/cli.ts load 20 30
  tsx src/testing/cli.ts all --base-url http://localhost:8001

Environment Variables:
  API_BASE_URL        API base URL (can be overridden with --base-url)

`);
  }
}

// ===== Main =====

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    TestingCLI.showHelp();
    process.exit(0);
  }

  // Parse options
  const options: CLIOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--base-url' && args[i + 1]) {
      options.baseUrl = args[i + 1];
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      options.output = args[i + 1];
      i++;
    } else if (args[i] === '--format' && args[i + 1]) {
      options.format = args[i + 1] as 'json' | 'markdown' | 'console';
      i++;
    } else if (args[i] === '--verbose') {
      options.verbose = true;
    }
  }

  const cli = new TestingCLI(options);
  const command = args[0];

  try {
    let exitCode = 0;

    switch (command) {
      case 'all':
        await cli.runAll();
        break;

      case 'market':
        await cli.runMarket();
        break;

      case 'integration':
        await cli.runAll();
        break;

      case 'performance':
        await cli.runPerformance();
        break;

      case 'security':
        await cli.runSecurity();
        break;

      case 'concurrent': {
        const count = parseInt(args[1]) || 20;
        await cli.runConcurrent(count);
        break;
      }

      case 'load': {
        const rps = parseInt(args[1]) || 10;
        const duration = parseInt(args[2]) || 10;
        await cli.runLoad(rps, duration);
        break;
      }

      default:
        console.error(`❌ Unknown command: ${command}`);
        console.log('Run "tsx src/testing/cli.ts help" for usage information.');
        exitCode = 1;
    }

    process.exit(exitCode);

  } catch (error) {
    console.error('❌ Error executing tests:', error);
    process.exit(1);
  }
}

// اجرای CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default TestingCLI;

