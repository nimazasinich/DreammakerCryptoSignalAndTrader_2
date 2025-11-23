// adapters/WSClient_from_LastChance.ts
import { WS_BASE } from '../../../src/config/env';

export function openLastChanceWS(token?: string) {
  const url = `${WS_BASE}/ws`;
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const socket = new WebSocket(url, token ? [] : undefined);
  // Note: If your server expects token via headers, adjust to query param: `${url}?token=${token}`
  return socket;
}
