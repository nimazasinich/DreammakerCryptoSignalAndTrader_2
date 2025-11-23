// External HTTP client with proxy support
// Use this for calls to external APIs (Binance, Kraken, HuggingFace, etc.)
// Internal API calls should use fetch(apiUrl(...)) instead

import axios from 'axios';

/**
 * Axios instance for external API calls with proxy support
 * This instance respects HTTP_PROXY/HTTPS_PROXY environment variables
 * Use for: Binance, Kraken, HuggingFace, CoinGecko, etc.
 * Do NOT use for internal API calls (use fetch with apiUrl instead)
 */
export const externalHttp = axios.create({
  timeout: 15000,
  maxRedirects: 5,
  // No baseURL here; callers pass absolute external URLs
});

// Optional: Add request/response interceptors for logging
if (process.env.NODE_ENV === 'development') {
  externalHttp.interceptors.request.use(
    (config) => {
      console.log(`[External HTTP] ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    },
    (error) => {
      console.error('[External HTTP] Request error:', error);
      return Promise.reject(error);
    }
  );

  externalHttp.interceptors.response.use(
    (response) => {
      console.log(`[External HTTP] ${response.status} ${response.config.url}`);
      return response;
    },
    (error) => {
      console.error('[External HTTP] Response error:', error.message);
      return Promise.reject(error);
    }
  );
}
