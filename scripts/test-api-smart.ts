#!/usr/bin/env tsx
/**
 * Smart API Test Runner
 * اجرای هوشمند تست‌ها با تنظیمات از فایل config
 */

import { SmartTestRunner } from '../src/testing/smart-runner';
import { marketTestCases } from '../src/testing/market-api.test';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('🚀 Starting Smart API Tests...\n');

  // Load config
  const configPath = path.join(process.cwd(), 'config', 'testing.json');
  let config: any = {};
  
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    console.log('✅ Loaded config from:', configPath);
  } else {
    console.log('⚠️ No config found, using defaults');
  }

  if (!config.enabled) {
    console.log('❌ Testing is disabled in config');
    process.exit(0);
  }

  // Create runner
  const runner = new SmartTestRunner({
    baseURL: config.baseURL,
    timeout: config.timeout,
    retries: config.retries,
    parallelTests: config.parallelTests,
    maxParallel: config.maxParallel,
    failFast: config.failFast,
    reportFormat: config.reportFormat,
    reportDir: config.reportDir,
    saveOnFail: config.saveOnFail,
  });

  // Run tests
  const result = await runner.runTests(marketTestCases);

  // Generate report
  await runner.generateReport([result]);

  // Exit code
  const exitCode = result.failed > 0 ? 1 : 0;
  process.exit(exitCode);
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

