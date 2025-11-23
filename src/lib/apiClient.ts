import axios, { AxiosError } from 'axios';
import { apiUrl } from './api';

interface CacheEntry {
  data: any;
  timestamp: number;
}

class APIClient {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 10000; // 10 seconds

  private getCacheKey(endpoint: string, params?: any): string {
    return `${endpoint}:${JSON.stringify(params || {})}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async get(endpoint: string, params?: any): Promise<any> {
    const cacheKey = this.getCacheKey(endpoint, params);
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.get(apiUrl(endpoint), {
        params,
        timeout: 10000
      });

      this.setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      // Return stale cache if available
      const staleCache = this.cache.get(cacheKey);
      if (staleCache) {
        console.warn('Using stale cache due to error');
        return staleCache.data;
      }
      
      throw error;
    }
  }

  async post(endpoint: string, data?: any): Promise<any> {
    const response = await axios.post(apiUrl(endpoint), data, {
      timeout: 15000
    });
    return response.data;
  }

  // Proxy methods
  async getBinancePrice(symbol: string): Promise<any> {
    return this.get('binance/price', { symbol });
  }

  async getBinanceKlines(symbol: string, interval: string, limit: number = 100): Promise<any> {
    return this.get('binance/klines', { symbol, interval, limit });
  }

  async getCoinGeckoPrice(ids: string, vs_currencies: string = 'usd'): Promise<any> {
    return this.get('coingecko/simple/price', { ids, vs_currencies });
  }

  async getFearGreedIndex(): Promise<any> {
    return this.get('fear-greed');
  }

  async getCryptoNews(): Promise<any> {
    return this.get('cryptopanic/posts', { auth_token: 'free' });
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const apiClient = new APIClient();
export default apiClient;
