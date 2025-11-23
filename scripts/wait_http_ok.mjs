import { setTimeout as wait } from "timers/promises";

const url = process.argv[2];
const timeout = Number(process.argv[3] || 30000);

const start = Date.now();

while (Date.now() - start < timeout) {
  try {
    const res = await fetch(url);
    if (res.ok) {
      console.log(`✓ ${url} is ready`);
      process.exit(0);
    }
  } catch (e) {
    // Continue waiting
  }
  await wait(600);
}

console.error(`✗ ${url} did not become ready within ${timeout}ms`);
process.exit(1);

