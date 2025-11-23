/**
 * ConnectivityDoctor - Self-healing connectivity diagnostics
 * Detects and remediates connection issues (403, ENOTFOUND, ECONNRESET, TLS, proxy)
 */

import https from 'https';
import http from 'http';
import dns from 'dns';
import fs from 'fs';
import { execSync } from 'child_process';

type PingResult = {
  name: string;
  url: string;
  status: number | string;
  ms: number;
  note?: string;
};

type DiagnosticReport = {
  timestamp: string;
  env: Record<string, string | undefined>;
  dns: {
    resolvConf?: string;
    lookupOk: boolean;
    errors?: string[];
  };
  proxy: {
    http?: string;
    https?: string;
    no_proxy?: string;
  };
  pings: PingResult[];
  suggestions: string[];
  status: 'healthy' | 'degraded' | 'unhealthy';
};

/**
 * Perform HTTP(S) ping with timeout
 */
function ping(url: string, token?: string): Promise<PingResult> {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const lib = isHttps ? https : http;

    const opts: any = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'DreammakerCryptoSignalTrader/1.0 Self-Heal',
      },
    };

    if (token) {
      opts.headers.Authorization = `Bearer ${token}`;
    }

    const req = lib.get(opts, (res) => {
      const ms = Date.now() - t0;
      let note = '';

      if (res.statusCode === 403) {
        note = 'Access forbidden - check API token or rate limits';
      } else if (res.statusCode === 429) {
        note = 'Rate limited - throttle requests or use caching';
      } else if (res.statusCode && res.statusCode >= 500) {
        note = 'Server error - service may be down';
      }

      resolve({
        name: parsedUrl.hostname,
        url,
        status: res.statusCode || 'unknown',
        ms,
        note,
      });

      // Consume response to free up socket
      res.resume();
    });

    req.on('error', (e: any) => {
      const ms = Date.now() - t0;
      let note = '';

      if (e.code === 'ENOTFOUND') {
        note = 'DNS lookup failed - check network/DNS settings';
      } else if (e.code === 'ECONNRESET') {
        note = 'Connection reset - may be blocked by firewall/proxy';
      } else if (e.code === 'ETIMEDOUT') {
        note = 'Connection timeout - check network or proxy settings';
      } else if (e.code === 'CERT_HAS_EXPIRED' || e.message?.includes('certificate')) {
        note = 'TLS/SSL certificate issue';
      }

      resolve({
        name: parsedUrl.hostname,
        url,
        status: e.code || e.message || 'error',
        ms,
        note,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name: parsedUrl.hostname,
        url,
        status: 'ETIMEDOUT',
        ms: Date.now() - t0,
        note: 'Request timeout',
      });
    });

    req.end();
  });
}

/**
 * Run connectivity diagnostics and generate report
 */
export async function runConnectivityDoctor(): Promise<DiagnosticReport> {
  // Gather environment variables
  const env = {
    HF_TOKEN: process.env.HF_TOKEN,
    HUGGINGFACEHUB_API_TOKEN: process.env.HUGGINGFACEHUB_API_TOKEN,
    HTTP_PROXY: process.env.HTTP_PROXY || process.env.http_proxy,
    HTTPS_PROXY: process.env.HTTPS_PROXY || process.env.https_proxy,
    NO_PROXY: process.env.NO_PROXY || process.env.no_proxy,
    ENABLE_HF: process.env.ENABLE_HF,
    OFFLINE_ALLOW: process.env.OFFLINE_ALLOW,
  };

  // Check DNS configuration
  let resolvConf = '';
  try {
    if (fs.existsSync('/etc/resolv.conf')) {
      resolvConf = fs.readFileSync('/etc/resolv.conf', 'utf8');
    }
  } catch {
    // Windows or restricted environment
  }

  const dnsErrors: string[] = [];
  let lookupOk = true;

  // Test DNS lookups for critical hosts
  const criticalHosts = [
    'api.coingecko.com',
    'api.binance.com',
    'huggingface.co',
    'datasets-server.huggingface.co',
  ];

  for (const host of criticalHosts) {
    try {
      await dns.promises.lookup(host);
    } catch (err: any) {
      lookupOk = false;
      dnsErrors.push(`${host}: ${err.code || err.message}`);
    }
  }

  // Ping critical endpoints
  const token = env.HF_TOKEN || env.HUGGINGFACEHUB_API_TOKEN;
  const pings = await Promise.all([
    ping('https://api.coingecko.com/api/v3/ping'),
    ping('https://api.binance.com/api/v3/ping'),
    ping('https://datasets-server.huggingface.co/is-valid', token),
    ping('https://huggingface.co/api/models?limit=1', token),
  ]);

  // Generate suggestions based on results
  const suggestions: string[] = [];
  const blocked = pings.filter(
    (p) => String(p.status).startsWith('4') || String(p.status).startsWith('E')
  );

  if ((blocked?.length || 0) > 0) {
    const has403 = blocked.some((p) => p.status === 403);
    const hasECONNRESET = blocked.some((p) => String(p.status).includes('ECONNRESET'));
    const hasETIMEDOUT = blocked.some((p) => String(p.status).includes('ETIMEDOUT'));

    if (has403) {
      suggestions.push(
        'HTTP 403 detected: Verify API tokens are valid and not rate-limited',
        'For HuggingFace: Ensure HF_TOKEN is set correctly and has proper permissions',
        'Consider setting HF_HUB_DISABLE_TELEMETRY=1 to reduce API calls'
      );
    }

    if (hasECONNRESET || hasETIMEDOUT) {
      suggestions.push(
        'Connection issues detected: Check if corporate proxy/firewall is blocking requests',
        'Try adding to NO_PROXY: api.coingecko.com,api.binance.com,huggingface.co,datasets-server.huggingface.co',
        'Or unset HTTP_PROXY/HTTPS_PROXY environment variables for direct connection'
      );
    }

    suggestions.push(
      'Enable offline fallback mode: OFFLINE_ALLOW=1 to use cached/synthetic data',
      'Seed local cache using: npm run seed -- BTCUSDT 15m 1000'
    );
  }

  if (!lookupOk) {
    suggestions.push(
      'DNS lookup failures detected: Check /etc/resolv.conf or network settings',
      'Try using public DNS servers: 1.1.1.1 (Cloudflare) or 8.8.8.8 (Google)',
      'On Linux: Add "nameserver 1.1.1.1" to /etc/resolv.conf'
    );
  }

  // Check for common tools
  try {
    execSync('which patch-package', { stdio: 'ignore' });
  } catch {
    suggestions.push(
      'patch-package not found: Install globally with "npm install -g patch-package"'
    );
  }

  // Determine overall health status
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  const failedPings = pings.filter((p) => typeof p.status !== 'number' || p.status >= 400);

  if (failedPings.length === pings.length) {
    status = 'unhealthy';
  } else if ((failedPings?.length || 0) > 0) {
    status = 'degraded';
  }

  return {
    timestamp: new Date().toISOString(),
    env,
    dns: {
      resolvConf,
      lookupOk,
      errors: (dnsErrors?.length || 0) > 0 ? dnsErrors : undefined,
    },
    proxy: {
      http: env.HTTP_PROXY,
      https: env.HTTPS_PROXY,
      no_proxy: env.NO_PROXY,
    },
    pings,
    suggestions,
    status,
  };
}

/**
 * Apply automatic remediation based on diagnostics
 * Returns list of actions taken
 */
export async function autoRemediate(report: DiagnosticReport): Promise<string[]> {
  const actions: string[] = [];

  // If all pings failed and proxy is set, suggest bypass
  const allFailed = report.pings.every((p) => typeof p.status !== 'number' || p.status >= 400);

  if (allFailed && (report.proxy.http || report.proxy.https)) {
    actions.push(
      'Detected proxy interference with all endpoints',
      'Recommendation: Set NO_PROXY=api.coingecko.com,api.binance.com,huggingface.co,datasets-server.huggingface.co',
      'Or unset HTTP_PROXY and HTTPS_PROXY for direct connection'
    );
  }

  // If HF is failing with 403, suggest token check
  const hfFailed = report.pings
    .filter((p) => p.url.includes('huggingface'))
    .some((p) => p.status === 403);

  if (hfFailed) {
    actions.push(
      'HuggingFace returning 403: Verify HF_TOKEN is valid',
      'Get a token from: https://huggingface.co/settings/tokens',
      'Set in .env.local: HF_TOKEN=hf_...'
    );
  }

  // If DNS is failing, suggest public DNS
  if (!report.dns.lookupOk) {
    actions.push(
      'DNS lookup failures detected',
      'Add public DNS to /etc/resolv.conf: nameserver 1.1.1.1',
      'Or configure your system to use 1.1.1.1 or 8.8.8.8'
    );
  }

  // Always suggest offline mode as ultimate fallback
  if (report.status !== 'healthy') {
    actions.push(
      'For guaranteed operation, enable offline mode: OFFLINE_ALLOW=1',
      'This will use cached data or synthetic data as fallback'
    );
  }

  return actions;
}
