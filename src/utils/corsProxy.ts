/**
 * CORS Proxy Utility
 * Handles CORS issues when calling external APIs from the browser
 */

import { Logger } from '../core/Logger.js';

const logger = Logger.getInstance();

export interface ProxyConfig {
  useProxy: boolean;
  proxyUrl?: string;
}

// CORS proxy configuration
const PROXY_CONFIG: ProxyConfig = {
  useProxy: true,
  // Using allOrigins as a free CORS proxy
  // Alternative options:
  // - https://corsproxy.io/?
  // - https://api.allorigins.win/raw?url=
  // - Your own backend proxy endpoint
  proxyUrl: 'https://api.allorigins.win/raw?url=',
};

/**
 * Fetch with CORS proxy support
 */
export async function fetchWithProxy(
  url: string,
  options?: RequestInit,
  config: ProxyConfig = PROXY_CONFIG
): Promise<Response> {
  const targetUrl = config.useProxy && config.proxyUrl
    ? `${config.proxyUrl}${encodeURIComponent(url)}`
    : url;

  logger.debug(`Fetching: ${config.useProxy ? 'via proxy' : 'direct'} - ${url}`);

  try {
    const response = await fetch(targetUrl, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...options?.headers,
      },
    });

    return response;
  } catch (error) {
    logger.error(`Fetch failed for ${url}:`, error);
    throw error;
  }
}

/**
 * Fetch with automatic CORS fallback
 * Tries direct fetch first, then falls back to proxy if CORS error occurs
 */
export async function fetchWithCORSFallback(
  url: string,
  options?: RequestInit
): Promise<Response> {
  // Try direct fetch first
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...options?.headers,
      },
    });

    if (response.ok) {
      logger.debug(`Direct fetch successful: ${url}`);
      return response;
    }

    // If not ok, try proxy
    console.error(`HTTP ${response.status}`);
  } catch (error: any) {
    // Check if it's a CORS error
    const isCORSError =
      error.message?.includes('CORS') ||
      error.message?.includes('Failed to fetch') ||
      error.name === 'TypeError';

    if (isCORSError) {
      logger.warn(`CORS error detected, trying proxy: ${url}`);
      return fetchWithProxy(url, options);
    }

    throw error;
  }
}

/**
 * Fetch JSON with CORS handling
 */
export async function fetchJSON<T = any>(
  url: string,
  options?: RequestInit,
  useProxy: boolean = true
): Promise<T> {
  const response = useProxy
    ? await fetchWithCORSFallback(url, options)
    : await fetch(url, options);

  if (!response.ok) {
    console.error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Update proxy configuration
 */
export function setProxyConfig(config: Partial<ProxyConfig>) {
  Object.assign(PROXY_CONFIG, config);
  logger.info('Proxy config updated:', config);
}

/**
 * Get current proxy configuration
 */
export function getProxyConfig(): ProxyConfig {
  return { ...PROXY_CONFIG };
}
