// Canonical API URL builder - prevents /api/api duplication
import { API_BASE } from '../config/env';

/**
 * Build API URL with proper path normalization
 * Ensures exactly one '/api' segment, preventing /api/api duplication
 * @param path - API endpoint path (e.g., '/health', 'health', '/market/candlestick')
 * @returns Complete API URL with normalized base and path
 */
export function apiUrl(path: string): string {
  const base = API_BASE.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  // Ensure exactly one '/api' segment
  const withApi = p.startsWith('/api/') ? p : `/api${p}`;
  return `${base}${withApi}`;
}

// Export API_BASE for backward compatibility
export { API_BASE };

/**
 * Generic API GET request
 */
export async function apiGet<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = apiUrl(path);
  const res = await fetch(url, init);
  if (!res.ok) {
    console.error(`API GET ${url}: ${res.status} ${res.statusText}`);
    throw new Error(`API request failed: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Generic API POST request
 */
export async function apiPost<T = unknown>(
  path: string,
  body?: unknown,
  init?: RequestInit
): Promise<T> {
  const url = apiUrl(path);
  const res = await fetch(url, {
    ...init,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    console.error(`API POST ${url}: ${res.status} ${res.statusText}`);
    throw new Error(`API request failed: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Generic API PUT request
 */
export async function apiPut<T = unknown>(
  path: string,
  body?: unknown,
  init?: RequestInit
): Promise<T> {
  const url = apiUrl(path);
  const res = await fetch(url, {
    ...init,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    console.error(`API PUT ${url}: ${res.status} ${res.statusText}`);
    throw new Error(`API request failed: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Generic API DELETE request
 */
export async function apiDelete<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = apiUrl(path);
  const res = await fetch(url, {
    ...init,
    method: 'DELETE',
  });
  if (!res.ok) {
    console.error(`API DELETE ${url}: ${res.status} ${res.statusText}`);
    throw new Error(`API request failed: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}
