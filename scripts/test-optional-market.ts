/**
 * Test script for optional market data providers
 * Tests: CoinMarketCap (requires CMC_API_KEY), CryptoCompare (optional key)
 */
import axios from "axios";

const BASE_URL = process.env.API_BASE || "http://localhost:8001";
const CMC_API_KEY = process.env.CMC_API_KEY || "";
const CRYPTOCOMPARE_KEY = process.env.CRYPTOCOMPARE_KEY || "";

function skip(name: string) {
  console.log(`⊘ SKIP  ${name.padEnd(30)} (API key not configured)`);
}

async function check(name: string, fn: () => Promise<any>) {
  const start = Date.now();
  try {
    await fn();
    console.log(`✓ PASS  ${name.padEnd(30)} ${Date.now() - start}ms`);
  } catch (error: any) {
    console.error(`✗ FAIL  ${name.padEnd(30)} ${error?.response?.data?.error || error?.message || error}`);
    process.exitCode = 1;
  }
}

(async function main() {
  console.log("Testing Optional Market Data Providers...\n");

  // CoinMarketCap tests
  if (CMC_API_KEY) {
    await check("CMC Listings", () =>
      axios.get(`${BASE_URL}/api/optional/cmc/listings?limit=5`)
    );

    await check("CMC BTC Quote", () =>
      axios.get(`${BASE_URL}/api/optional/cmc/quote?symbol=BTC&convert=USD`)
    );

    await check("CMC ETH Info", () =>
      axios.get(`${BASE_URL}/api/optional/cmc/info?symbol=ETH`)
    );
  } else {
    skip("CoinMarketCap (no CMC_API_KEY)");
  }

  // CryptoCompare tests (works without key but lower rate limits)
  console.log("");
  await check("CryptoCompare Price Multi", () =>
    axios.get(`${BASE_URL}/api/optional/cc/pricemulti?fsyms=BTC,ETH&tsyms=USD`)
  );

  await check("CryptoCompare Histo Hour", () =>
    axios.get(`${BASE_URL}/api/optional/cc/histohour?fsym=BTC&tsym=USD&limit=24`)
  );

  console.log("\nMarket data provider tests completed!");
  if (!CMC_API_KEY) {
    console.log("\n💡 Tip: Set CMC_API_KEY in .env to test CoinMarketCap endpoints");
  }
})();
