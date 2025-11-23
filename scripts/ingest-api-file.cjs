/**
 * API File Ingestion Script
 * Parses "api - Copy.txt" and merges tokens/endpoints into .env.local and config/providers.override.json
 */

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const API_FILE = path.join(ROOT, "api - Copy.txt");
const ENV_PATH = path.join(ROOT, ".env.local");
const CFG_DIR = path.join(ROOT, "config");
const OVERRIDE_PATH = path.join(CFG_DIR, "providers.override.json");

/**
 * Parse text content as key-value pairs
 */
function asKv(str) {
  const kv = {};
  for (const line of str.split(/\r?\n/)) {
    // Match key=value format (flexible whitespace)
    const m = line.match(/^\s*([A-Za-z0-9_\.:-]+)\s*=\s*(.+?)\s*$/);
    if (m) {
      kv[m[1]] = m[2];
    }
  }
  return kv;
}

/**
 * Merge key-value pairs into existing .env content
 */
function mergeEnv(env, kv) {
  const lines = env.split(/\r?\n/).filter(Boolean);
  const map = Object.fromEntries(
    lines
      .filter((l) => l.includes("="))
      .map((l) => {
        const [key, ...rest] = l.split("=");
        return [key, rest.join("=")];
      })
  );

  // Merge new values (override existing)
  for (const [k, v] of Object.entries(kv)) {
    map[k] = v;
  }

  return Object.entries(map)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n") + "\n";
}

/**
 * Merge object into JSON file
 */
function mergeJson(filePath, obj) {
  let cur = {};
  try {
    if (fs.existsSync(filePath)) {
      cur = JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
  } catch (err) {
    console.warn(`Warning: Could not parse existing ${filePath}:`, err.message);
  }

  const out = { ...cur, ...obj };
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(out, null, 2));
}

// Main execution
if (!fs.existsSync(API_FILE)) {
  console.log(`INFO: "${API_FILE}" not found. Skipping ingestion.`);
  process.exit(0);
}

console.log(`Reading API configuration from: ${API_FILE}`);
const raw = fs.readFileSync(API_FILE, "utf8").trim();

// Try to parse as JSON first, fallback to key-value
let kv = {};
try {
  const json = JSON.parse(raw);
  // Convert all values to strings
  for (const [k, v] of Object.entries(json)) {
    kv[k] = String(v);
  }
  console.log("Parsed API file as JSON");
} catch {
  kv = asKv(raw);
  console.log("Parsed API file as key-value pairs");
}

if (Object.keys(kv).length === 0) {
  console.log("INFO: No valid key-value pairs found in API file");
  process.exit(0);
}

console.log(`Found ${Object.keys(kv).length} configuration entries`);

// Merge into .env.local
let baseEnv = "";
try {
  if (fs.existsSync(ENV_PATH)) {
    baseEnv = fs.readFileSync(ENV_PATH, "utf8");
  }
} catch (err) {
  console.warn("Warning: Could not read existing .env.local:", err.message);
}

const merged = mergeEnv(baseEnv, kv);
fs.writeFileSync(ENV_PATH, merged);
console.log(`✓ Updated ${ENV_PATH}`);

// Extract provider-related configurations
const override = {};
for (const [k, v] of Object.entries(kv)) {
  // Match keys related to endpoints, URLs, base URLs, or provider settings
  if (/endpoint|base|url|provider|api_key|token/i.test(k)) {
    override[k] = v;
  }
}

if (Object.keys(override).length > 0) {
  mergeJson(OVERRIDE_PATH, override);
  console.log(`✓ Updated ${OVERRIDE_PATH} with ${Object.keys(override).length} provider settings`);
}

console.log("\n✅ API file ingestion complete");
console.log("   Tokens and endpoints have been synchronized to .env.local and provider overrides");
