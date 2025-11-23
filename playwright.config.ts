import { defineConfig, devices } from '@playwright/test';

// Force IPv4 at Node.js level to prevent EACCES errors on Windows
// This prevents Playwright from trying to use IPv6 (::1)
// Set these BEFORE any Playwright imports or operations
if (!process.env.NODE_OPTIONS?.includes('dns-result-order')) {
    process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' --dns-result-order=ipv4first';
}
if (!process.env.NO_IPV6) {
    process.env.NO_IPV6 = '1';
}
// Force IPv4 for all network operations
process.env.PLAYWRIGHT_DISABLE_IPV6 = '1';
process.env.PLAYWRIGHT_FORCE_IPV4 = '1';
// Additional IPv6 disabling
process.env.DISABLE_IPV6 = '1';

// Override Node.js dns module to prefer IPv4
// This affects all DNS lookups in the process
const dns = require('dns');
const originalLookup = dns.lookup;
dns.lookup = function(hostname: string, options: any, callback?: any) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }
    options = options || {};
    // Force IPv4 family
    options.family = 4;
    return originalLookup.call(this, hostname, options, callback);
};

/**
 * Playwright configuration for e2e smoke tests.
 * This config automatically starts the dev server (backend + frontend)
 * before running tests, and stops it when tests are complete.
 */
export default defineConfig({
    testDir: './e2e',

    // Run tests in files in parallel
    fullyParallel: false, // غیرفعال کردن اجرای موازی برای جلوگیری از تداخل

    // Fail the build on CI if you accidentally left test.only in the source code
    forbidOnly: !!process.env.CI,

    // Retry on CI only
    retries: process.env.CI ? 2 : 1, // یک بار retry در محیط local

    // Opt out of parallel tests on CI
    workers: 1, // استفاده از یک worker برای جلوگیری از مشکلات شبکه

    // Reporter to use
    reporter: 'html',

    // Global timeout برای هر تست
    timeout: 60000,

    // Shared settings for all the projects below
    use: {
        // Base URL to use in actions like `await page.goto('/')`
        // استفاده از 127.0.0.1 برای جلوگیری از مشکلات IPv6
        baseURL: 'http://127.0.0.1:5173',

        // Collect trace when retrying the failed test
        trace: 'on-first-retry',

        // افزایش timeout برای عملیات‌های شبکه
        navigationTimeout: 30000,
        actionTimeout: 10000,

        // تنظیمات بیشتر برای پایداری
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',

        // غیرفعال کردن IPv6 برای جلوگیری از EACCES errors
        ignoreHTTPSErrors: true,
        
        // Force IPv4 only - prevent IPv6 connection attempts
        // This prevents EACCES errors on Windows when Playwright tries to use ::1
        extraHTTPHeaders: {
            'Host': '127.0.0.1',
        },
        
        // Force browser to connect via IPv4
        // This prevents Playwright from trying to use ::1 for browser WebSocket connections
        connectOptions: {
            timeout: 30000,
        },
    },

    // Configure projects for major browsers
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                // تنظیمات اضافی برای Chrome
                launchOptions: {
                    // Force browser to bind to IPv4 only
                    executablePath: undefined, // Use default
                    headless: false, // Can help with connection issues
                    args: [
                        '--disable-web-security',
                        '--disable-features=IsolateOrigins,site-per-process',
                        '--disable-ipv6', // غیرفعال کردن IPv6 برای جلوگیری از EACCES
                        '--host-rules=MAP * 127.0.0.1', // Force IPv4
                        '--host-resolver-rules=MAP * 127.0.0.1', // Additional IPv4 forcing
                        '--disable-background-networking', // Disable background networking
                        '--disable-background-timer-throttling',
                        '--disable-renderer-backgrounding',
                        '--disable-backgrounding-occluded-windows',
                        '--force-ipv4', // Force IPv4 explicitly
                        '--remote-debugging-port=0', // Let Playwright choose port
                    ],
                    // Force IPv4 for browser communication
                    env: {
                        ...process.env,
                        'PLAYWRIGHT_DISABLE_IPV6': '1',
                        'PLAYWRIGHT_FORCE_IPV4': '1',
                        'DISABLE_IPV6': '1',
                        'NO_IPV6': '1',
                    },
                    // Force browser WebSocket to use IPv4
                    handleSIGINT: true,
                    handleSIGTERM: true,
                    handleSIGHUP: true,
                },
            },
        },
    ],

    // Run your local dev server before starting the tests
    webServer: {
        // Force Vite to bind explicitly on IPv4 to avoid ::1 EACCES errors on Windows
        command: 'npm run dev -- --host 127.0.0.1 --port 5173',
        // استفاده از 127.0.0.1 برای جلوگیری از مشکلات IPv6 و EACCES
        url: 'http://127.0.0.1:5173',
        reuseExistingServer: !process.env.CI, // در CI همیشه سرور جدید
        timeout: 180000, // افزایش timeout به 3 دقیقه برای راه‌اندازی کامل
        stdout: 'ignore',
        stderr: 'pipe',
        // اضافه کردن env variables در صورت نیاز
        env: {
            HOST: '127.0.0.1',
            VITE_HOST: '127.0.0.1',
            NODE_ENV: 'development',
            // Force IPv4 and disable IPv6
            PLAYWRIGHT_DISABLE_IPV6: '1',
            PLAYWRIGHT_FORCE_IPV4: '1',
            // Node.js IPv6 disabling
            NODE_OPTIONS: '--dns-result-order=ipv4first',
        },
    },
});
