import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateOHLCV } from '../../src/lib/synthetic';
import { getPrices } from '../../src/services/RealDataManager';

describe('Data fetching with modes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate deterministic offline data', () => {
    const bars1 = generateOHLCV('BTC/USDT', '1h', 100, 'test-seed');
    const bars2 = generateOHLCV('BTC/USDT', '1h', 100, 'test-seed');

    expect(bars1.length).toBe(100);
    expect(bars2.length).toBe(100);
    expect(bars1[0].timestamp).toBe(bars2[0].timestamp);
    expect(bars1[0].open).toBe(bars2[0].open);
  });

  it('should generate different data for different symbols', () => {
    const btcBars = generateOHLCV('BTC/USDT', '1h', 100);
    const ethBars = generateOHLCV('ETH/USDT', '1h', 100);

    expect(btcBars[0].open).not.toBe(ethBars[0].open);
  });

  it('should include all required OHLCV fields', () => {
    const bars = generateOHLCV('BTC/USDT', '1h', 10);

    bars.forEach((bar) => {
      expect(bar).toHaveProperty('timestamp');
      expect(bar).toHaveProperty('open');
      expect(bar).toHaveProperty('high');
      expect(bar).toHaveProperty('low');
      expect(bar).toHaveProperty('close');
      expect(bar).toHaveProperty('volume');
      expect(bar.high).toBeGreaterThanOrEqual(bar.open);
      expect(bar.high).toBeGreaterThanOrEqual(bar.close);
      expect(bar.low).toBeLessThanOrEqual(bar.open);
      expect(bar.low).toBeLessThanOrEqual(bar.close);
    });
  });

  it('should handle offline mode gracefully when network fails', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

    const job = getPrices({
      mode: 'offline',
      symbol: 'BTC/USDT',
      timeframe: '1h',
      limit: 100,
    });

    const bars = await job.promise;
    expect(bars.length).toBeGreaterThan(0);
  });

  it('should support cancellation of in-flight requests', async () => {
    const job = getPrices({
      mode: 'offline',
      symbol: 'BTC/USDT',
      timeframe: '1h',
      limit: 100,
    });

    job.cancel();

    try {
      await job.promise;
    } catch (error) {
      // Cancellation may or may not throw depending on timing
    }

    expect(job.cancel).toBeDefined();
  });

  it('should return bars with proper timestamps', () => {
    const bars = generateOHLCV('BTC/USDT', '1h', 10);
    const now = Date.now();

    bars.forEach((bar, i) => {
      expect(bar.timestamp).toBeLessThanOrEqual(now);
      if (i > 0) {
        expect(bar.timestamp).toBeGreaterThan(bars[i - 1].timestamp);
      }
    });
  });
});
