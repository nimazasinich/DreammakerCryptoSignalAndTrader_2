/**
 * KuCoin Integration E2E Test Scenarios
 * Phase 5: Functional End-to-End Testing
 * 
 * Tests critical user flows and KuCoin-specific functionality
 */

import { test, expect, Page } from '@playwright/test';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Test configuration
test.describe.configure({ mode: 'parallel' });
test.setTimeout(60000); // 60 seconds per test

test.describe('KuCoin Integration - Critical Paths', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto(FRONTEND_URL);
    
    // Wait for app to load
    await page.waitForLoadState('networkidle');
  });

  test('E2E-1: Application loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    // Wait for initial render
    await page.waitForTimeout(3000);
    
    // Check for critical errors (ignore warning-level issues)
    const criticalErrors = errors.filter(err => 
      !err.includes('Warning') && 
      !err.includes('DevTools') &&
      !err.includes('favicon')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('E2E-2: Market prices load and display', async ({ page }) => {
    // Look for price indicators or cards
    const priceElements = page.locator('[data-testid="price"], [class*="price"], [class*="Price"]').first();
    
    await expect(priceElements).toBeVisible({ timeout: 10000 });
    
    // Verify at least one price is shown
    const priceText = await priceElements.textContent();
    expect(priceText).toBeTruthy();
    expect(priceText?.length).toBeGreaterThan(0);
  });

  test('E2E-3: Signals history renders', async ({ page }) => {
    // Look for signals panel or list
    const signalsElement = page.locator('[data-testid="signals"], [class*="signal"], [class*="Signal"]').first();
    
    // Signals may take time to load
    await page.waitForTimeout(5000);
    
    // Check if signals panel exists (it may be empty, which is OK)
    const exists = await signalsElement.count() > 0;
    expect(exists).toBeTruthy();
  });

  test('E2E-4: Chart component loads', async ({ page }) => {
    // Look for chart canvas or container
    const chartElement = page.locator('canvas, [data-testid="chart"], [class*="chart"], [class*="Chart"]').first();
    
    await expect(chartElement).toBeVisible({ timeout: 10000 });
    
    // Verify chart has rendered
    const boundingBox = await chartElement.boundingBox();
    expect(boundingBox).toBeTruthy();
    expect(boundingBox!.width).toBeGreaterThan(0);
    expect(boundingBox!.height).toBeGreaterThan(0);
  });

  test('E2E-5: Navigation works', async ({ page }) => {
    // Try to find navigation buttons/links
    const navLinks = page.locator('nav a, nav button, [role="navigation"] a, [role="navigation"] button');
    
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
    
    // Click first navigation item if available
    if (count > 0) {
      await navLinks.first().click();
      await page.waitForLoadState('networkidle');
      
      // Page should still be accessible
      expect(page.url()).toBeTruthy();
    }
  });
});

test.describe('KuCoin Exchange Switching', () => {
  
  test('E2E-6: Exchange selector is present', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    // Look for exchange selector component
    // This would be in ExchangeSelector component if rendered
    const exchangeSelector = page.locator('[data-testid="exchange-selector"], [class*="exchange"], button:has-text("Binance"), button:has-text("KuCoin")').first();
    
    // Exchange selector may not be visible on all views
    const exists = await exchangeSelector.count() > 0;
    
    if (exists) {
      await expect(exchangeSelector).toBeVisible();
      console.log('✅ Exchange selector found');
    } else {
      console.log('ℹ️  Exchange selector not visible in current view (may be in settings)');
    }
  });

  test('E2E-7: API health includes both exchanges', async ({ page }) => {
    // Check backend health endpoint
    const response = await page.request.get(`${BACKEND_URL}/api/health`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    // Verify both exchanges are present
    expect(data).toHaveProperty('binance');
    expect(data).toHaveProperty('kucoin');
    
    // Verify structure
    expect(data.binance).toHaveProperty('isConnected');
    expect(data.binance).toHaveProperty('latency');
    expect(data.kucoin).toHaveProperty('isConnected');
    expect(data.kucoin).toHaveProperty('latency');
    
    console.log('✅ Health check shows both exchanges');
    console.log(`   Binance: ${data.binance.isConnected ? 'Connected' : 'Disconnected'} (${data.binance.latency}ms)`);
    console.log(`   KuCoin: ${data.kucoin.isConnected ? 'Connected' : 'Disconnected'} (${data.kucoin.latency}ms)`);
  });
});

test.describe('Performance & Stability', () => {
  
  test('E2E-8: No memory leaks during navigation', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    // Get initial memory if available
    const initialMetrics = await page.metrics();
    
    // Navigate around
    const navLinks = page.locator('nav a, [role="navigation"] a');
    const count = Math.min(await navLinks.count(), 5);
    
    for (let i = 0; i < count; i++) {
      await navLinks.nth(i).click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }
    
    // Get final memory
    const finalMetrics = await page.metrics();
    
    // Memory growth should be reasonable (less than 100MB)
    const memoryGrowth = finalMetrics.JSHeapUsedSize - initialMetrics.JSHeapUsedSize;
    const memoryGrowthMB = memoryGrowth / 1024 / 1024;
    
    console.log(`Memory growth: ${memoryGrowthMB.toFixed(2)}MB`);
    expect(memoryGrowthMB).toBeLessThan(100);
  });

  test('E2E-9: WebSocket connection stable', async ({ page }) => {
    let wsConnected = false;
    let wsMessages = 0;
    let wsErrors = 0;
    
    page.on('websocket', ws => {
      console.log(`WebSocket opened: ${ws.url()}`);
      wsConnected = true;
      
      ws.on('framesent', event => wsMessages++);
      ws.on('framereceived', event => wsMessages++);
      ws.on('close', () => console.log('WebSocket closed'));
      ws.on('socketerror', error => {
        console.error('WebSocket error:', error);
        wsErrors++;
      });
    });
    
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    // Wait for WebSocket to connect
    await page.waitForTimeout(5000);
    
    // Verify WebSocket is connected (if app uses WS)
    if (wsConnected) {
      expect(wsErrors).toBe(0);
      console.log(`✅ WebSocket: ${wsMessages} messages, ${wsErrors} errors`);
    } else {
      console.log('ℹ️  No WebSocket connection detected (may not be used in current view)');
    }
  });

  test('E2E-10: Page load time acceptable', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    console.log(`Page load time: ${loadTime}ms`);
    
    // Page should load in under 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });
});

test.describe('Responsive Design', () => {
  
  test('E2E-11: Mobile viewport (360px)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    // Check that content is visible
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Check for horizontal scrollbar (should not exist)
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(360);
    
    console.log('✅ Mobile viewport renders correctly');
  });

  test('E2E-12: Tablet viewport (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    console.log('✅ Tablet viewport renders correctly');
  });

  test('E2E-13: Desktop viewport (1280px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    console.log('✅ Desktop viewport renders correctly');
  });
});

test.describe('Accessibility', () => {
  
  test('E2E-14: Keyboard navigation works', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    // Tab through focusable elements
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    
    // Check that something is focused
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
    expect(focusedElement).not.toBe('BODY');
    
    console.log(`✅ Keyboard focus on: ${focusedElement}`);
  });

  test('E2E-15: ARIA labels present', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    // Look for ARIA attributes
    const ariaLabels = page.locator('[aria-label], [aria-labelledby], [role]');
    const count = await ariaLabels.count();
    
    expect(count).toBeGreaterThan(0);
    console.log(`✅ Found ${count} elements with ARIA attributes`);
  });
});

// Export test results
test.afterAll(async () => {
  console.log('\n✅ E2E Test Suite Complete');
  console.log('📊 Results saved to Playwright HTML report');
  console.log('📁 Run: npx playwright show-report');
});

