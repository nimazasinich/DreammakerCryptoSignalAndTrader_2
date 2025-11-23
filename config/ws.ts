/**
 * WebSocket Configuration
 *
 * Toggle and configuration for LastChance WebSocket integration
 */

/**
 * Enable LastChance WebSocket for real-time market data and signals
 * Set to true to use WebSocket streaming
 * Set to false to use polling (HTTP) for updates
 */
export const USE_LASTCHANCE_WS = false; // Default: false (use polling for stability)

/**
 * Optional WebSocket authentication token
 * Set this if your LastChance WS server requires authentication
 * Leave undefined for anonymous connections
 */
export const LASTCHANCE_WS_TOKEN: string | undefined = undefined;

/**
 * WebSocket reconnect configuration
 */
export const WS_RECONNECT_DELAY_MS = 3000; // 3 seconds
export const WS_MAX_RECONNECT_ATTEMPTS = 5;
