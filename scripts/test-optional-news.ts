/**
 * Test script for optional NewsAPI service
 * Requires: NEWS_API_KEY environment variable
 */
import axios from "axios";

const BASE_URL = process.env.API_BASE || "http://localhost:8001";
const NEWS_API_KEY = process.env.NEWS_API_KEY || "";

if (!NEWS_API_KEY) {
  console.error("❌ NEWS_API_KEY is not set in environment");
  console.log("   Set it in .env file or pass as environment variable");
  process.exit(1);
}

async function check(name: string, fn: () => Promise<any>) {
  const start = Date.now();
  try {
    const response = await fn();
    console.log(`✓ PASS  ${name.padEnd(30)} ${Date.now() - start}ms`);
    return response;
  } catch (error: any) {
    console.error(`✗ FAIL  ${name.padEnd(30)} ${error?.response?.data?.error || error?.message || error}`);
    process.exitCode = 1;
  }
}

(async function main() {
  console.log("Testing Optional NewsAPI Service...\n");

  // First check if API key is configured
  await check("NewsAPI Status Check", () =>
    axios.get(`${BASE_URL}/api/optional/news/status`)
  );

  // Test news search with crypto queries
  await check("NewsAPI Crypto Search", () =>
    axios.get(`${BASE_URL}/api/optional/news/search?q=cryptocurrency&pageSize=10`)
  );

  await check("NewsAPI Bitcoin Search", () =>
    axios.get(`${BASE_URL}/api/optional/news/search?q=bitcoin&pageSize=5`)
  );

  await check("NewsAPI Ethereum Search", () =>
    axios.get(`${BASE_URL}/api/optional/news/search?q=ethereum&pageSize=5`)
  );

  console.log("\nNewsAPI tests completed!");
})();
