/**
 * Test script for optional keyless public providers
 * Tests: Binance, Kraken, Bitfinex, RSS News, Fear & Greed
 */
import axios from "axios";

const BASE_URL = process.env.API_BASE || "http://localhost:8001";

async function check(name: string, fn: () => Promise<any>) {
  const start = Date.now();
  try {
    await fn();
    console.log(`✓ PASS  ${name.padEnd(30)} ${Date.now() - start}ms`);
  } catch (error: any) {
    console.error(`✗ FAIL  ${name.padEnd(30)} ${error?.message || error}`);
    process.exitCode = 1;
  }
}

(async function main() {
  console.log("Testing Optional Keyless Public Providers...\n");

  await check("Binance Price", () =>
    axios.get(`${BASE_URL}/api/optional/public/binance/price?symbol=BTCUSDT`)
  );

  await check("Binance Klines", () =>
    axios.get(`${BASE_URL}/api/optional/public/binance/klines?symbol=BTCUSDT&interval=1h&limit=50`)
  );

  await check("Kraken Ticker", () =>
    axios.get(`${BASE_URL}/api/optional/public/kraken/ticker?pair=XBTUSD`)
  );

  await check("Bitfinex Ticker", () =>
    axios.get(`${BASE_URL}/api/optional/public/bitfinex/ticker?symbol=tBTCUSD`)
  );

  await check("RSS News Feed", () =>
    axios.get(`${BASE_URL}/api/optional/public/rss/news?limit=20`)
  );

  await check("Fear & Greed Index", () =>
    axios.get(`${BASE_URL}/api/optional/public/fng`)
  );

  await check("Fear & Greed History", () =>
    axios.get(`${BASE_URL}/api/optional/public/fng/history?limit=7`)
  );

  console.log("\nAll keyless provider tests completed!");
})();
