/**
 * Global API Sources Resolver
 *
 * Reads and caches API keys/endpoints from the root file (api - Copy.txt)
 * Provides a fallback mechanism: env vars > providers_config.json > api - Copy.txt > defaults
 *
 * SECURITY:
 * - Never logs sensitive values
 * - No disk writes
 * - Returns {} if file is missing/invalid
 * - Auto-detects JSON or KEY=VALUE format
 * 
 * BROWSER SAFETY:
 * - This file is safe to import in browser contexts
 * - Node.js-specific features are conditionally loaded
 */

// Check if running in Node.js environment
const isNode = typeof process !== 'undefined' && 
                process.versions != null && 
                process.versions.node != null;

// Lazy load Node.js modules only when actually needed
function getNodeModules(): { fs: any; path: any } | null {
  if (!isNode) {
    return null;
  }
  
  try {
    // Dynamically require Node.js modules
    const fs = eval('require')('fs');
    const path = eval('require')('path');
    return { fs, path };
  } catch (e) {
    // Modules not available
    return null;
  }
}

interface APISourcesCache {
  [key: string]: string;
}

let cache: APISourcesCache | null = null;
let lastReadTime = 0;
const CACHE_TTL = 300000; // 5 minutes

/**
 * Gets the path to the API sources file (computed dynamically)
 */
function getAPISourcesFilePath(): string {
  const modules = getNodeModules();
  if (!modules || !modules.path) {
    return '';
  }
  return modules.path.resolve(process.cwd(), 'api - Copy.txt');
}

/**
 * Parses the content of the API sources file
 * Supports both JSON and KEY=VALUE formats
 */
function parseContent(content: string): APISourcesCache {
  const result: APISourcesCache = {};

  // Try parsing as JSON first
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === 'object' && parsed !== null) {
      return flattenObject(parsed);
    }
  } catch {
    // Not JSON, continue with KEY=VALUE parsing
  }

  // Parse as KEY=VALUE format
  const lines = content.split('\n');

  for (let line of lines) {
    line = line.trim();

    // Skip empty lines and comments
    if (!line || line.startsWith('#') || line.startsWith('//')) {
      continue;
    }

    // Handle various KEY=VALUE or KEY:VALUE or KEY\nVALUE formats
    // Try colon separator first
    let separatorIndex = line.indexOf(':');
    let usedColon = true;

    // If no colon, try equals
    if (separatorIndex === -1) {
      separatorIndex = line.indexOf('=');
      usedColon = false;
    }

    if (separatorIndex !== -1) {
      const key = line.substring(0, separatorIndex).trim();
      const value = line.substring(separatorIndex + 1).trim();

      if (key && value) {
        // Normalize key names
        const normalizedKey = normalizeKey(key);
        result[normalizedKey] = value;
      }
    } else {
      // Check if this is a standalone key (next line might have value)
      // For now, treat standalone words as potential keys with empty values
      const potentialKey = normalizeKey(line);
      if (potentialKey && !result[potentialKey]) {
        // We'll handle adjacent line values in a second pass if needed
        // For now, just mark it as seen
      }
    }
  }

  // Second pass: handle adjacent line patterns (key on one line, value on next)
  const cleanLines = lines
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && !l.startsWith('//'));

  for (let i = 0; i < cleanLines.length - 1; i++) {
    const currentLine = cleanLines[i];
    const nextLine = cleanLines[i + 1];

    // If current line has no separator and next line looks like a value (UUID, hex, etc.)
    if (!currentLine.includes(':') && !currentLine.includes('=')) {
      if (looksLikeAPIValue(nextLine)) {
        const key = normalizeKey(currentLine);
        if (key && !result[key]) {
          result[key] = nextLine;
        }
      }
    }
  }

  return result;
}

/**
 * Checks if a string looks like an API key/value
 */
function looksLikeAPIValue(str: string): boolean {
  // UUID pattern, hex pattern, or alphanumeric with reasonable length
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const hexPattern = /^[0-9a-f]{20,}$/i;
  const alphanumPattern = /^[A-Z0-9]{20,}$/i;
  const base64Pattern = /^[A-Za-z0-9+/=]{20,}$/;

  return uuidPattern.test(str) ||
         hexPattern.test(str) ||
         alphanumPattern.test(str) ||
         base64Pattern.test(str) ||
         str.startsWith('pub_') ||
         str.startsWith('sk_') ||
         str.startsWith('pk_');
}

/**
 * Normalizes a key name to a standard format
 */
function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/[_\s-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Flattens a nested object into dot notation
 */
function flattenObject(obj: any, prefix = ''): APISourcesCache {
  const result: APISourcesCache = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(result, flattenObject(value, newKey));
      } else if (typeof value === 'string' || typeof value === 'number') {
        result[normalizeKey(newKey)] = String(value);
      }
    }
  }

  return result;
}

/**
 * Reads and caches the API sources file
 */
function readAPISourcesFile(): APISourcesCache {
  const now = Date.now();

  // Return cache if still valid
  if (cache !== null && now - lastReadTime < CACHE_TTL) {
    return cache;
  }

  // Get Node.js modules
  const modules = getNodeModules();
  
  // Return empty object if not in Node.js environment or modules unavailable
  if (!modules) {
    cache = {};
    lastReadTime = now;
    return cache;
  }

  const API_SOURCES_FILE = getAPISourcesFilePath();
  if (!API_SOURCES_FILE) {
    cache = {};
    lastReadTime = now;
    return cache;
  }

  // Try to read the file
  try {
    if (!modules.fs.existsSync(API_SOURCES_FILE)) {
      cache = {};
      lastReadTime = now;
      return cache;
    }

    const content = modules.fs.readFileSync(API_SOURCES_FILE, 'utf-8');
    cache = parseContent(content);
    lastReadTime = now;

    return cache;
  } catch (error) {
    // Silent fail - return empty object
    cache = {};
    lastReadTime = now;
    return cache;
  }
}

/**
 * Resolves an API key or endpoint using the fallback chain:
 * 1. Environment variables (process.env)
 * 2. Provided config object
 * 3. API sources file (api - Copy.txt)
 * 4. Default value
 *
 * @param key - The key to resolve (e.g., 'COINMARKETCAP_KEY', 'tronscan')
 * @param config - Optional config object from providers_config.json
 * @param defaultValue - Default value if not found anywhere
 * @returns The resolved value or default
 */
export function resolveAPIKey(
  key: string,
  config?: any,
  defaultValue: string = ''
): string {
  const normalizedKey = normalizeKey(key);

  // 1. Check environment variables
  const envKey = key.toUpperCase().replace(/[.-]/g, '_');
  if (process.env[envKey]) {
    return process.env[envKey]!;
  }

  // 2. Check provided config object
  if (config) {
    if (typeof config === 'string') {
      return config;
    }
    if (config.key !== undefined && config.key !== '') {
      return config.key;
    }
    if (config[key]) {
      return config[key];
    }
  }

  // 3. Check API sources file
  const sources = readAPISourcesFile();

  // Try exact match first
  if (sources[normalizedKey]) {
    return sources[normalizedKey];
  }

  // Try common variations
  const variations = [
    normalizedKey,
    normalizedKey.replace(/_key$/, ''),
    normalizedKey.replace(/_api_key$/, ''),
    normalizedKey + '_key',
    normalizedKey + '_api_key',
    normalizedKey.replace(/api$/, ''),
    normalizedKey.replace(/^api_/, '')
  ];

  for (const variant of variations) {
    if (sources[variant]) {
      return sources[variant];
    }
  }

  // 4. Return default
  return defaultValue;
}

/**
 * Resolves an API endpoint/baseUrl using the fallback chain
 */
export function resolveAPIEndpoint(
  key: string,
  config?: any,
  defaultValue: string = ''
): string {
  const normalizedKey = normalizeKey(key);

  // 1. Check environment variables for endpoint
  const envKey = `${key.toUpperCase()}_ENDPOINT`.replace(/[.-]/g, '_');
  if (process.env[envKey]) {
    return process.env[envKey]!;
  }

  const envBaseUrl = `${key.toUpperCase()}_BASE_URL`.replace(/[.-]/g, '_');
  if (process.env[envBaseUrl]) {
    return process.env[envBaseUrl]!;
  }

  // 2. Check provided config
  if (config) {
    if (config.baseUrl) {
      return config.baseUrl;
    }
    if (config.endpoint) {
      return config.endpoint;
    }
    if (config.url) {
      return config.url;
    }
  }

  // 3. Check API sources file
  const sources = readAPISourcesFile();

  const endpointVariations = [
    normalizedKey + '_endpoint',
    normalizedKey + '_base_url',
    normalizedKey + '_url',
    normalizedKey + '_api'
  ];

  for (const variant of endpointVariations) {
    if (sources[variant]) {
      return sources[variant];
    }
  }

  // 4. Return default
  return defaultValue;
}

/**
 * Resolves a complete API config object using the fallback chain
 */
export function resolveAPIConfig(
  providerName: string,
  config?: any
): { key: string; baseUrl: string; enabled: boolean } {
  const key = resolveAPIKey(providerName, config?.key || config);
  const baseUrl = resolveAPIEndpoint(providerName, config);

  // If we have a key from sources file or env, consider it enabled
  const hasLiveSource = key !== '' && key !== (config?.key || '');
  const enabled = hasLiveSource || (config?.enabled ?? true);

  return {
    key,
    baseUrl: baseUrl || config?.baseUrl || '',
    enabled
  };
}

/**
 * Clears the cache (useful for testing or forced refresh)
 */
export function clearCache(): void {
  cache = null;
  lastReadTime = 0;
}

/**
 * Gets all available API sources (for debugging/inspection)
 * SECURITY: Be careful not to log this in production
 */
export function getAllSources(): APISourcesCache {
  return readAPISourcesFile();
}

/**
 * Masks sensitive values for logging
 */
export function maskValue(value: string): string {
  if (!value || value.length < 8) {
    return '***';
  }
  return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
}
