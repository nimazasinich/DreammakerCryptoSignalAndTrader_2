import { test, expect } from '@playwright/test';

/**
 * E2E Smoke Test for UI and API Integration
 *
 * This test verifies:
 * 1. UI loads successfully without errors
 * 2. Frontend can reach the backend API (health check)
 * 3. Frontend can fetch real candlestick data from backend
 *
 * The test runs in the browser context, ensuring CORS and
 * network configuration are correct.
 */

const APP_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:8000';

test.describe('Smoke Test - UI & API Integration', () => {
  test('UI loads and can reach API', async ({ page }) => {
    // Navigate to the application
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

    // Verify the page loaded (body should be visible)
    await expect(page.locator('body')).toBeVisible();

    // Test 1: Verify frontend can reach backend health endpoint
    const healthOk = await page.evaluate(async (apiUrl) => {
      try {
        const response = await fetch(`${apiUrl}/health`);
        return response.ok;
      } catch (error) {
        console.error('Health check failed:', error);
        return false;
      }
    }, API_URL);

    expect(healthOk).toBe(true);

    // Test 2: Verify frontend can fetch real candlestick data
    const candleDataValid = await page.evaluate(async (apiUrl) => {
      try {
        const response = await fetch(`${apiUrl}/market/candlestick/BTCUSDT?interval=1m&limit=1`);
        if (!response.ok) return false;

        const data = await response.json();

        // Validate response is an array with valid data
        return (
          Array.isArray(data) &&
          data.length > 0 &&
          typeof data[0].c === 'number' &&
          data[0].c > 0
        );
      } catch (error) {
        console.error('Candlestick fetch failed:', error);
        return false;
      }
    }, API_URL);

    expect(candleDataValid).toBe(true);
  });

  test('Frontend can fetch multiple symbols prices', async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

    const pricesValid = await page.evaluate(async (apiUrl) => {
      try {
        const response = await fetch(`${apiUrl}/market/prices?symbols=BTCUSDT,ETHUSDT`);
        if (!response.ok) return false;

        const data = await response.json();

        // Validate response has both symbols with valid prices
        return (
          typeof data.BTCUSDT === 'number' &&
          typeof data.ETHUSDT === 'number' &&
          data.BTCUSDT > 0 &&
          data.ETHUSDT > 0
        );
      } catch (error) {
        console.error('Prices fetch failed:', error);
        return false;
      }
    }, API_URL);

    expect(pricesValid).toBe(true);
  });

  test('No console errors during page load', async ({ page }) => {
    const errors: string[] = [];

    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Listen for page errors
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

    // Wait a bit for any async errors
    await page.waitForTimeout(2000);

    // Filter out known safe errors (if any)
    const criticalErrors = errors.filter(
      (error) =>
        !error.includes('favicon.ico') && // Ignore missing favicon
        !error.includes('Extension') // Ignore browser extension errors
    );

    if (criticalErrors.length > 0) {
      console.log('Console errors detected:', criticalErrors);
    }

    // Expect no critical errors (allow warning level or non-critical)
    expect(criticalErrors.length).toBe(0);
  });
});
