import { getOHLCV } from '../services/marketData';
import { runStrategyPipeline } from '../engine/pipeline';
import { saveStrategyOutput } from '../storage/mlOutputs';
import { FinalDecision } from '../types/signals';

type Strategy1Result = {
  symbol: string;
  priceUsd: number;
  decision: FinalDecision; // Updated to use full FinalDecision type
};

export async function runStrategy2({
  topFromS1,
  timeframe = '15m',
  mode = 'offline' as const
}: {
  topFromS1: Strategy1Result[];
  timeframe?: string;
  mode?: 'offline' | 'online';
}) {
  const rows = [];

  for (const r of topFromS1) {
    try {
      const ohlcv = await getOHLCV({ symbol: r.symbol, timeframe, mode, limit: 300 });
      const decision = await runStrategyPipeline(ohlcv, r.symbol);

      // Use finalStrategyScore (HTS smart score) or fallback to finalScore/score
      const strategyScore = decision.finalStrategyScore ?? decision.finalScore ?? decision.score;

      // Placeholder ETA model: higher score = sooner entry opportunity
      const etaMinutes = Math.max(5, Math.round((1 - strategyScore) * 120));

      rows.push({ symbol: r.symbol, decision, etaMinutes });
    } catch (err) {
      console.warn(`Strategy2: Failed to process ${r.symbol}:`, err);
    }
  }

  await saveStrategyOutput(2, rows);
  return rows;
}
