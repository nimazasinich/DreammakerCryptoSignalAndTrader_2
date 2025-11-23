export type Bar = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export function generateOHLCV(
  symbol: string,
  timeframe: string,
  bars = 200,
  seed = 'offline'
): Bar[] {
  let x = [...seed, symbol, timeframe].reduce(
    (a, c) => (a * 31 + c.charCodeAt(0)) % 1_000_003,
    7
  );
  const rnd = () => (x = ((1103515245 * x + 12345) % 2 ** 31) / 2 ** 31);
  const out: Bar[] = [];
  let p = 100 + rnd() * 10;
  const step =
    timeframe === '1m'
      ? 60_000
      : timeframe === '5m'
      ? 300_000
      : timeframe === '1h'
      ? 3_600_000
      : 86_400_000;
  let t = Date.now() - bars * step;
  for (let i = 0; i < bars; i++, t += step) {
    const drift = (rnd() - 0.5) * 0.8;
    const open = p;
    const close = Math.max(0.0001, open + drift);
    const high = Math.max(open, close) + rnd() * 0.5;
    const low = Math.min(open, close) - rnd() * 0.5;
    const volume = Math.floor(100 + rnd() * 900);
    p = close;
    out.push({ timestamp: t, open, high, low, close, volume });
  }
  return out.slice(-bars);
}
