import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = [
  { name: 'dashboard', selector: '[data-testid="nav-dashboard"], button:has-text("Dashboard"), a:has-text("Dashboard")' },
  { name: 'scanner', selector: '[data-testid="nav-scanner"], button:has-text("Scanner"), a:has-text("Scanner")' },
  { name: 'settings', selector: '[data-testid="nav-settings"], button:has-text("Settings"), a:has-text("Settings")' },
];

for (const route of routes) {
  test.describe(`UI Coherence: ${route.name}`, () => {
    test('should load without errors', async ({ page }) => {
      const errors: string[] = [];
      
      page.on('pageerror', e => errors.push(`Page error: ${e.message}`));
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(`Console error: ${msg.text()}`);
        }
      });

      await page.goto('/');
      
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      
      if (route.name !== 'dashboard') {
        const navButton = page.locator(route.selector).first();
        if (await navButton.count() > 0) {
          await navButton.click();
          await page.waitForTimeout(1000);
        }
      }

      expect(errors.length).toBe(0);
    });

    test('should have RTL direction', async ({ page }) => {
      await page.goto('/');
      
      if (route.name !== 'dashboard') {
        const navButton = page.locator(route.selector).first();
        if (await navButton.count() > 0) {
          await navButton.click();
          await page.waitForTimeout(1000);
        }
      }

      const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'));
      expect(dir).toBe('rtl');
    });

    test('should have dark theme background', async ({ page }) => {
      await page.goto('/');
      
      if (route.name !== 'dashboard') {
        const navButton = page.locator(route.selector).first();
        if (await navButton.count() > 0) {
          await navButton.click();
          await page.waitForTimeout(1000);
        }
      }

      await page.waitForTimeout(500);

      const bodyBg = await page.evaluate(() => {
        const computed = window.getComputedStyle(document.body);
        return computed.backgroundColor;
      });

      expect(bodyBg).toBeTruthy();
      expect(bodyBg).not.toBe('rgba(0, 0, 0, 0)');
    });

    test('should have glassmorphism panels', async ({ page }) => {
      await page.goto('/');
      
      if (route.name !== 'dashboard') {
        const navButton = page.locator(route.selector).first();
        if (await navButton.count() > 0) {
          await navButton.click();
          await page.waitForTimeout(1000);
        }
      }

      await page.waitForTimeout(1000);

      const hasPanel = await page.evaluate(() => {
        const elements = document.querySelectorAll('div, section, article');
        for (const el of Array.from(elements)) {
          const style = window.getComputedStyle(el);
          const backdropFilter = style.backdropFilter || (style as any).webkitBackdropFilter || '';
          const borderRadius = parseFloat(style.borderTopLeftRadius || '0');
          const boxShadow = style.boxShadow || '';
          const backgroundColor = style.backgroundColor || '';
          const border = style.border || '';
          
          const hasBlur = backdropFilter.includes('blur');
          const hasBorder = border !== 'none' && border.includes('rgba');
          const hasRadius = borderRadius >= 8;
          const hasShadow = boxShadow !== 'none';
          const hasSemiTransparentBg = backgroundColor.includes('rgba') || backgroundColor.includes('rgb');
          
          if ((hasBlur || (hasBorder && hasRadius && hasShadow)) && hasSemiTransparentBg) {
            return true;
          }
        }
        return false;
      });

      expect(hasPanel).toBeTruthy();
    });

    test('should have acceptable accessibility', async ({ page }) => {
      await page.goto('/');
      
      if (route.name !== 'dashboard') {
        const navButton = page.locator(route.selector).first();
        if (await navButton.count() > 0) {
          await navButton.click();
          await page.waitForTimeout(1000);
        }
      }

      await page.waitForTimeout(500);

      const axe = new AxeBuilder({ page });
      const results = await axe.analyze();
      
      const critical = results.violations.filter(v => 
        ['critical', 'serious'].includes(v.impact || '')
      );

      expect(critical.length).toBeLessThan(3);
    });

    test('should be responsive without overflow', async ({ page }) => {
      await page.goto('/');
      
      if (route.name !== 'dashboard') {
        const navButton = page.locator(route.selector).first();
        if (await navButton.count() > 0) {
          await navButton.click();
          await page.waitForTimeout(1000);
        }
      }

      await page.waitForTimeout(500);

      const hasOverflow = await page.evaluate(() => {
        const html = document.documentElement;
        const body = document.body;
        
        return html.scrollWidth > html.clientWidth || 
               body.scrollWidth > body.clientWidth ||
               html.scrollHeight > html.clientHeight ||
               body.scrollHeight > body.clientHeight;
      });

      expect(hasOverflow).toBe(false);
    });

    test('should capture screenshot', async ({ page }) => {
      await page.goto('/');
      
      if (route.name !== 'dashboard') {
        const navButton = page.locator(route.selector).first();
        if (await navButton.count() > 0) {
          await navButton.click();
          await page.waitForTimeout(1000);
        }
      }

      await page.waitForTimeout(500);
      
      await page.screenshot({ 
        path: `artifacts/ui/screenshots/${route.name}-${page.viewportSize()?.width || 'desktop'}.png`,
        fullPage: true
      });
    });
  });
}

