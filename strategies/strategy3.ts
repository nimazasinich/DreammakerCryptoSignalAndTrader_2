import { saveStrategyOutput } from '../storage/mlOutputs';
import { FinalDecision } from '../types/signals';

type Strategy2Result = {
  symbol: string;
  decision: FinalDecision; // Updated to use full FinalDecision type
};

export async function runStrategy3({
  topFromS2
}: {
  topFromS2: Strategy2Result[];
}) {
  // Sort by finalStrategyScore (new HTS smart score) or fallback to finalScore
  const top3 = [...topFromS2].sort((a, b) => {
    const scoreA = a.decision.finalStrategyScore ?? a.decision.finalScore ?? a.decision.score;
    const scoreB = b.decision.finalStrategyScore ?? b.decision.finalScore ?? b.decision.score;
    return scoreB - scoreA;
  }).slice(0, 3);

  const entries = (top3 || []).map(t => {
    const decision = t.decision;
    const strategyScore = decision.finalStrategyScore ?? decision.finalScore ?? decision.score;

    // Build category breakdown for UI/reporting
    const categoryBreakdown = decision.categoryScores
      ? decision.categoryScores.map(cat =>
          `${cat.name.toUpperCase()}=${cat.rawScore.toFixed(2)} (w=${cat.weight.toFixed(2)})`
        ).join(', ')
      : 'N/A';

    // Check if adaptive weights were used
    const adaptiveInfo = decision.effectiveWeights?.isAdaptive
      ? ' [ADAPTIVE]'
      : '';

    return {
      symbol: t.symbol,
      action: decision.action,
      finalStrategyScore: strategyScore,
      categoryScores: decision.categoryScores || [],
      categoryBreakdown, // For easy display
      entryLevels: {
        conservative: 0.236, // relative fib placeholders
        base: 0.382,
        aggressive: 0.5
      },
      risk: {
        slAtrMult: 2, // stop-loss: 2x ATR
        rr: 2 // risk-reward ratio: 1:2
      },
      summary: `Entry plan aligned with ICT/Fib/Elliott/SAR; finalStrategyScore=${strategyScore.toFixed(2)}${adaptiveInfo}; Categories: ${categoryBreakdown}`,
      telemetry: decision.telemetrySummary
    };
  });

  await saveStrategyOutput(3, entries);
  return entries;
}
