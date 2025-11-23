// adapters/BacktestAPI_from_LastChance.ts
import { API_BASE } from '../../../src/config/env';

export async function runBacktest(params: { symbol: string; timeframe: string; strategy?: string }) {
  const res = await fetch(`${API_BASE}/signals/backtest`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`backtest ${res.status}`);
  return res.json(); // expected: { equity:[], trades:[], metrics:{} }
}

export async function fetchPrediction(symbol: string) {
  const res = await fetch(`${API_BASE}/predictions/${encodeURIComponent(symbol)}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`pred ${res.status}`);
  return res.json();
}
