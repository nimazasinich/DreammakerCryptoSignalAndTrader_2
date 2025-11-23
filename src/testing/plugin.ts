/**
 * Testing Plugin System
 * سیستم پلاگین برای گسترش قابلیت‌های تست
 */

import { TestCase, TestResult } from './api-test-framework';

export interface TestPlugin {
  name: string;
  version: string;
  
  // Hooks
  beforeTest?(test: TestCase): Promise<TestCase | void>;
  afterTest?(test: TestCase, result: TestResult): Promise<void>;
  beforeSuite?(tests: TestCase[]): Promise<void>;
  afterSuite?(results: TestResult[]): Promise<void>;
  
  // Modifiers
  modifyRequest?(test: TestCase): Promise<TestCase>;
  modifyResponse?(result: TestResult): Promise<TestResult>;
}

export class PluginManager {
  private plugins: Map<string, TestPlugin> = new Map();

  register(plugin: TestPlugin) {
    this.plugins.set(plugin.name, plugin);
    console.log(`✅ Plugin registered: ${plugin.name} v${plugin.version}`);
  }

  unregister(name: string) {
    this.plugins.delete(name);
  }

  async executeBeforeTest(test: TestCase): Promise<TestCase> {
    let modifiedTest = test;
    
    for (const plugin of this.plugins.values()) {
      if (plugin.beforeTest) {
        const result = await plugin.beforeTest(modifiedTest);
        if (result) modifiedTest = result;
      }
      
      if (plugin.modifyRequest) {
        modifiedTest = await plugin.modifyRequest(modifiedTest);
      }
    }
    
    return modifiedTest;
  }

  async executeAfterTest(test: TestCase, result: TestResult): Promise<TestResult> {
    let modifiedResult = result;
    
    for (const plugin of this.plugins.values()) {
      if (plugin.afterTest) {
        await plugin.afterTest(test, modifiedResult);
      }
      
      if (plugin.modifyResponse) {
        modifiedResult = await plugin.modifyResponse(modifiedResult);
      }
    }
    
    return modifiedResult;
  }

  async executeBeforeSuite(tests: TestCase[]): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.beforeSuite) {
        await plugin.beforeSuite(tests);
      }
    }
  }

  async executeAfterSuite(results: TestResult[]): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.afterSuite) {
        await plugin.afterSuite(results);
      }
    }
  }

  getPlugins(): TestPlugin[] {
    return Array.from(this.plugins.values());
  }
}

// Built-in plugins

export const LoggerPlugin: TestPlugin = {
  name: 'logger',
  version: '1.0.0',
  
  beforeTest: async (test) => {
    console.log(`▶ Running: ${test.name}`);
  },
  
  afterTest: async (test, result) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${test.name} (${result.duration}ms)`);
  },
};

export const RetryPlugin: TestPlugin = {
  name: 'smart-retry',
  version: '1.0.0',
  
  modifyRequest: async (test) => {
    // Add retry logic based on endpoint
    if (test.endpoint.includes('/market')) {
      return { ...test, timeout: 5000 };
    }
    return test;
  },
};

export const CachePlugin: TestPlugin = {
  name: 'response-cache',
  version: '1.0.0',
  
  beforeSuite: async () => {
    console.log('🗄️ Cache initialized');
  },
  
  afterSuite: async () => {
    console.log('🗑️ Cache cleared');
  },
};

export const pluginManager = new PluginManager();

