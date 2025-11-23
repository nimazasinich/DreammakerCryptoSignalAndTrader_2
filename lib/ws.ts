// Canonical WebSocket URL builder - prevents /ws/ws duplication
import { WS_BASE } from '../config/env';

/**
 * Build WebSocket URL with proper path normalization
 * Ensures proper path construction without duplication
 * @param path - WebSocket endpoint path (e.g., '/ws', '/ws/signals/live')
 * @returns Complete WebSocket URL with normalized base and path
 */
export function wsUrl(path: string): string {
  const base = WS_BASE.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  // WS paths shouldn't auto-prepend '/api'
  return `${base}${p}`;
}

// Export WS_BASE for backward compatibility
export { WS_BASE };
