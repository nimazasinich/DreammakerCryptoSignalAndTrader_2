// Main Signal Engine - orchestrates multi-timeframe signal generation
import { OHLC, FinalSignal } from './types';
import { scoreOneTF, buildFinal } from './AdaptiveScoringEngine';
import { sendSignalAlert } from './NotificationService';

/**
 * Generate a multi-timeframe signal for a symbol
 *
 * @param symbol - Trading symbol (e.g., 'BTCUSDT')
 * @param timeframes - Array of timeframes to analyze (e.g., ['15m', '1h', '4h'])
 * @param fetcher - Function to fetch OHLC data for a given symbol and timeframe
 * @returns Final aggregated signal
 */
export async function generateSignal(
  symbol: string,
  timeframes: string[],
  fetcher: (symbol: string, timeframe: string) => Promise<OHLC[]>
): Promise<FinalSignal> {
  const tfMap: Record<string, any> = {};

  // Analyze each timeframe
  for (const tf of timeframes) {
    try {
      const data = await fetcher(symbol, tf);

      if (!data || data.length === 0) {
        // No data available for this timeframe
        tfMap[tf] = {
          action: 'HOLD',
          score: 0.5,
          confidence: 0.3,
          reasoning: [`No data available for ${tf}`],
          detectors: [],
          risk: { atr: 0, vol: 0 },
          severity: 'low'
        };
        continue;
      }

      // Score this timeframe
      tfMap[tf] = scoreOneTF(data);
    } catch (error: any) {
      // Handle fetch errors gracefully
      tfMap[tf] = {
        action: 'HOLD',
        score: 0.5,
        confidence: 0.2,
        reasoning: [`Error fetching ${tf}: ${error.message}`],
        detectors: [],
        risk: { atr: 0, vol: 0 },
        severity: 'low'
      };
    }
  }

  // Build final signal from all timeframes
  const final = buildFinal(symbol, tfMap);

  if (final.severity === 'high') {
    await sendSignalAlert(final);
  }

  return final;
}
