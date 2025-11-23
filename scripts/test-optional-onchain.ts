/**
 * Test script for optional on-chain data providers
 * Tests: Santiment (requires SANTIMENT_KEY), WhaleAlert (requires WHALEALERT_KEY)
 */
import axios from "axios";

const BASE_URL = process.env.API_BASE || "http://localhost:8001";
const SANTIMENT_KEY = process.env.SANTIMENT_KEY || "";
const WHALEALERT_KEY = process.env.WHALEALERT_KEY || "";

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
  console.log("Testing Optional On-Chain Data Providers...\n");

  // Santiment tests
  if (SANTIMENT_KEY) {
    await check("Santiment Ping Query", () =>
      axios.post(`${BASE_URL}/api/optional/santiment/query`, {
        query: "{ ping }"
      })
    );
  } else {
    skip("Santiment (no SANTIMENT_KEY)");
  }

  // WhaleAlert tests
  if (WHALEALERT_KEY) {
    console.log("");
    await check("WhaleAlert Status", () =>
      axios.get(`${BASE_URL}/api/optional/whales/status`)
    );

    await check("WhaleAlert Transactions", () =>
      axios.get(`${BASE_URL}/api/optional/whales/transactions?limit=5`)
    );
  } else {
    skip("WhaleAlert (no WHALEALERT_KEY)");
  }

  console.log("\nOn-chain data provider tests completed!");

  if (!SANTIMENT_KEY) {
    console.log("\n💡 Tip: Set SANTIMENT_KEY in .env to test Santiment endpoints");
  }
  if (!WHALEALERT_KEY) {
    console.log("💡 Tip: Set WHALEALERT_KEY in .env to test WhaleAlert endpoints");
  }
})();
