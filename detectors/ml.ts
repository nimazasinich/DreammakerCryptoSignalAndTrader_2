import { MLScore, CoreSignal, LayerScore, PatternScores, SentimentScores, AuxScores } from '../types/signals';

type MLInput = {
  symbol: string;
  core: CoreSignal;
  smc: LayerScore;
  patterns: PatternScores;
  sentiment: SentimentScores;
  aux: AuxScores;
};

export async function mlPredict(input: MLInput): Promise<MLScore> {
  // Placeholder: ML prediction shim + GA/RL hooks (loader only; no heavy training here)
  // In production, this would load a trained model and run inference

  const reasons: string[] = [];
  let score = 0.5; // neutral default

  // Simple heuristic: combine all input scores as a weighted average
  const weights = {
    core: 0.5,
    smc: 0.2,
    patterns: 0.15,
    sentiment: 0.1,
    aux: 0.05,
  };

  const combinedScore =
    weights.core * input.core.score +
    weights.smc * input.smc.score +
    weights.patterns * input.patterns.combined.score +
    weights.sentiment * input.sentiment.combined.score +
    weights.aux * ((input.aux.fibonacci.score + input.aux.sar.score + input.aux.rpercent.score) / 3);

  score = Math.min(1, Math.max(0, combinedScore));

  if (score > 0.7) {
    reasons.push('ML: high confidence prediction');
  } else if (score < 0.3) {
    reasons.push('ML: low confidence prediction');
  } else {
    reasons.push('ML: moderate confidence');
  }

  return { score, reasons: reasons.slice(0, 3) };
}
