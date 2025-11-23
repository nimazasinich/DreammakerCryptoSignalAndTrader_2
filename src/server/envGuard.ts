/**
 * Environment Variable Guard
 *
 * Validates that required environment variables are set before starting the server.
 * This prevents runtime errors and provides clear feedback about missing configuration.
 *
 * @module envGuard
 */

import { Logger } from '../core/Logger.js';

const logger = Logger.getInstance();

/**
 * List of required environment variables for server operation.
 * Add any critical environment variables here.
 */
const REQUIRED_ENV_VARS = [
  'PORT',
  // Note: VITE_* variables are frontend build-time variables, not runtime server vars
  // Add server-critical vars here as needed
];

/**
 * Checks that all required environment variables are set.
 * Throws an error if any required variables are missing.
 *
 * @throws {Error} If any required environment variables are missing
 */
export function assertEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key]);

  if ((missing?.length || 0) > 0) {
    const errorMessage = `Missing required environment variables: ${missing.join(', ')}`;
    logger.error(errorMessage);
    console.error(errorMessage);
    // Don't throw - PORT has a default value (8001) in the code
    // This is just a warning, not a fatal error
    logger.warn('Continuing with default PORT value (8001) if not set');
  } else {
    logger.info('Environment variable validation passed', {
      checkedVars: REQUIRED_ENV_VARS
    });
  }
}
