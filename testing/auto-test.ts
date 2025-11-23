/**
 * Auto Test Module
 * اجرای خودکار تست‌ها با زمان‌بندی
 */

import * as cron from 'node-cron';
import * as fs from 'fs';
import * as path from 'path';
import SmartTestRunner from './smart-runner';
import { marketTestCases } from './market-api.test';
import { testConfig } from './config';

export class AutoTestScheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  private config: any;

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    const configPath = path.join(process.cwd(), 'config', 'testing.json');
    if (fs.existsSync(configPath)) {
      this.config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } else {
      this.config = { enabled: false };
    }
  }

  start() {
    if (!this.config.enabled || !this.config.schedule?.enabled) {
      return;
    }

    const cronExpression = this.config.schedule.cron || '0 */6 * * *';
    
    const task = cron.schedule(cronExpression, async () => {
      console.log('🔄 Running scheduled API tests...');
      await this.runScheduledTests();
    });

    this.tasks.set('main', task);

    if (this.config.schedule.onStartup) {
      this.runScheduledTests();
    }

    console.log(`✅ Test scheduler started: ${cronExpression}`);
  }

  stop() {
    this.tasks.forEach(task => task.stop());
    this.tasks.clear();
    console.log('⏹️ Test scheduler stopped');
  }

  private async runScheduledTests() {
    try {
      const runner = new SmartTestRunner({
        baseURL: this.config.baseURL,
        reportFormat: this.config.reportFormat,
        reportDir: this.config.reportDir,
      });

      const result = await runner.runTests(marketTestCases);
      
      if (result.failed > 0 && this.config.notifications?.enabled) {
        this.sendNotification('failure', result);
      }

      await runner.generateReport([result]);
    } catch (error) {
      console.error('❌ Scheduled test failed:', error);
    }
  }

  private sendNotification(type: 'success' | 'failure', result: any) {
    // Placeholder for notification logic
    console.log(`📧 Notification: ${type}`, result);
  }
}

export function initAutoTest() {
  const scheduler = new AutoTestScheduler();
  scheduler.start();
  return scheduler;
}

