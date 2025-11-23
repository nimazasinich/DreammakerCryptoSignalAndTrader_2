import { getOHLCV } from '../services/marketData';
import { runStrategyPipeline } from '../engine/pipeline';
import { saveStrategyOutput } from '../storage/mlOutputs';

type SymbolInfo = {
  symbol: string;
  rank: number;
  volumeUsd24h: number;
  priceUsd: number;
};

export async function runStrategy1({
  symbols,
  timeframe = '1h',
  mode = 'offline' as const
}: {
  symbols: SymbolInfo[];
  timeframe?: string;
  mode?: 'offline' | 'online';
}) {
  const filtered = symbols.filter(s => s.rank >= 5 && s.rank <= 300 && s.volumeUsd24h > 5_000_000);
  const results = [];

  for (const s of filtered) {
    try {
      const ohlcv = await getOHLCV({ symbol: s.symbol, timeframe, mode, limit: 300 });
      const decision = await runStrategyPipeline(ohlcv, s.symbol);
      results.push({ symbol: s.symbol, priceUsd: s.priceUsd, decision });
    } catch (err) {
      console.warn(`Strategy1: Failed to process ${s.symbol}:`, err);
    }
  }

  // Sort by finalStrategyScore (HTS smart score) or fallback to finalScore/score
  results.sort((a, b) => {
    const scoreA = a.decision.finalStrategyScore ?? a.decision.finalScore ?? a.decision.score;
    const scoreB = b.decision.finalStrategyScore ?? b.decision.finalScore ?? b.decision.score;
    return scoreB - scoreA;
  });

  const top10 = results.slice(0, 10);
  await saveStrategyOutput(1, top10);
  return top10;
}
