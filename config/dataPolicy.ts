/**
 * Data Policy - Single Source of Truth
 *
 * This module enforces strict data usage rules across the entire application:
 * - Online mode: Real data only (no mock, no synthetic)
 * - Demo mode: Mock fixtures only (recorded, deterministic datasets)
 * - Test mode: Mock or synthetic (if explicitly allowed)
 */

export type AppMode = 'online' | 'demo' | 'test';

/**
 * Get environment variable (works in both Vite frontend and Node backend)
 */
function getEnv(key: string): string | undefined {
  // Frontend (Vite)
  if (typeof import.meta?.env !== 'undefined') {
    return import.meta.env[key];
  }
  // Backend (Node.js)
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
}

/**
 * Application Mode
 * - online: Production mode with real data only
 * - demo: Demo mode with mock fixtures
 * - test: Test mode with flexible data sources
 */
export const APP_MODE: AppMode =
  (getEnv('VITE_APP_MODE') as AppMode) || (getEnv('APP_MODE') as AppMode) || 'online';

/**
 * Strict Real Data Mode
 * When true: Only real data is allowed, fail fast on errors
 * When false: Allow fallbacks based on mode
 */
export const STRICT_REAL_DATA =
  (getEnv('VITE_STRICT_REAL_DATA') === 'true') || (getEnv('STRICT_REAL_DATA') === 'true') || APP_MODE === 'online';

/**
 * Use Mock Data
 * When true: Use mock fixtures instead of real APIs
 * Automatically enabled in demo mode
 */
export const USE_MOCK_DATA =
  (getEnv('VITE_USE_MOCK_DATA') === 'true') || (getEnv('USE_MOCK_DATA') === 'true') || APP_MODE === 'demo';

/**
 * Allow Fake/Synthetic Data
 * When true: Allow generation of synthetic data
 * Only allowed in test mode with explicit flag
 */
export const ALLOW_FAKE_DATA =
  ((getEnv('VITE_ALLOW_FAKE_DATA') === 'true') || (getEnv('ALLOW_FAKE_DATA') === 'true')) && APP_MODE === 'test';

/**
 * Hard Guardrails - Policy Enforcement
 * Throws errors if policy is violated at startup
 */
export function assertPolicy(): void {
  if (APP_MODE === 'online') {
    if (USE_MOCK_DATA) {
      console.error(
        '[DATA POLICY VIOLATION] Mock data is forbidden in online mode. ' +
        'Set VITE_USE_MOCK_DATA=false or use VITE_APP_MODE=demo'
      );
    }
    if (ALLOW_FAKE_DATA) {
      console.error(
        '[DATA POLICY VIOLATION] Fake/synthetic data is forbidden in online mode. ' +
        'Set VITE_ALLOW_FAKE_DATA=false'
      );
    }
  }

  if (APP_MODE === 'demo') {
    if (!USE_MOCK_DATA) {
      console.warn(
        '[DATA POLICY WARNING] Demo mode should use mock data. ' +
        'Consider setting VITE_USE_MOCK_DATA=true'
      );
    }
    if (ALLOW_FAKE_DATA) {
      console.warn(
        '[DATA POLICY WARNING] Synthetic data should not be used in demo mode. ' +
        'Demo mode uses mock fixtures only.'
      );
    }
  }
}

/**
 * Get data source label for UI display
 */
export function getDataSourceLabel(): string {
  if (APP_MODE === 'demo' || USE_MOCK_DATA) {
    return 'Mock (Demo)';
  }
  if (ALLOW_FAKE_DATA) {
    return 'Synthetic (Test Only)';
  }
  return 'Real';
}

/**
 * Check if synthetic data generation is allowed
 */
export function canUseSyntheticData(): boolean {
  return ALLOW_FAKE_DATA && APP_MODE === 'test';
}

/**
 * Check if mock fixtures should be used
 */
export function shouldUseMockFixtures(): boolean {
  return USE_MOCK_DATA || APP_MODE === 'demo';
}

/**
 * Check if only real data is allowed
 */
export function requiresRealData(): boolean {
  return STRICT_REAL_DATA || APP_MODE === 'online';
}

// Log policy configuration on module load
console.log('[DATA POLICY] Configuration:', {
  APP_MODE,
  STRICT_REAL_DATA,
  USE_MOCK_DATA,
  ALLOW_FAKE_DATA,
});
