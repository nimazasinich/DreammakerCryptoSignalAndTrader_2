export async function saveStrategyOutput(stage: 1 | 2 | 3, payload: unknown) {
  // Frontend-only implementation: persist to localStorage/indexedDB for now.
  // If backend FS endpoints exist, switch to POST /api/ml/outputs/:stage.
  try {
    const key = `ml.strategy.${stage}.latest`;
    localStorage.setItem(
      key,
      JSON.stringify({ at: new Date().toISOString(), data: payload })
    );
  } catch (err) {
    console.warn(`Failed to save strategy ${stage} output:`, err);
  }
}

export async function loadStrategyOutput(stage: 1 | 2 | 3): Promise<unknown | null> {
  try {
    const key = `ml.strategy.${stage}.latest`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed.data;
  } catch (err) {
    console.warn(`Failed to load strategy ${stage} output:`, err);
    return null;
  }
}
