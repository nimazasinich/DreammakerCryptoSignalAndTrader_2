import { LayerScore } from '../types/signals';
import { WhaleTrackerService } from '../services/WhaleTrackerService';
import { Logger } from '../core/Logger';

/**
 * Whales Layer - Real whale activity tracking using blockchain data
 *
 * Data sources:
 * - Etherscan API (Ethereum transactions)
 * - BscScan API (BSC transactions)
 * - TronScan API (Tron transactions)
 * - Exchange wallet monitoring (Binance, Coinbase, etc.)
 *
 * Metrics tracked:
 * - Large transactions (>$1M USD or threshold for symbol)
 * - Exchange flows (inflow/outflow)
 * - On-chain metrics (active addresses, holder concentration)
 *
 * Interpretation:
 * - Outflow from exchanges = Whales accumulating/holding = BULLISH
 * - Inflow to exchanges = Whales preparing to sell = BEARISH
 * - High transaction volume = High whale activity = Important signal
 * - Rising active addresses = Growing interest = BULLISH
 *
 * Score range: 0-1
 * - 0.0-0.3: Heavy Exchange Inflow (Bearish - whales selling)
 * - 0.3-0.45: Moderate Inflow (Slightly Bearish)
 * - 0.45-0.55: Neutral/Balanced Flow
 * - 0.55-0.7: Moderate Outflow (Slightly Bullish)
 * - 0.7-1.0: Heavy Exchange Outflow (Bullish - whales accumulating)
 */
export async function whalesLayer(symbol: string): Promise<LayerScore> {
  const logger = Logger.getInstance();
  const whaleService = WhaleTrackerService.getInstance();

  try {
    logger.debug('Tracking whale activity', { symbol });

    // Fetch real whale activity data from blockchain
    const whaleData = await whaleService.trackWhaleActivity(symbol);

    // Calculate score based on multiple factors
    let flowScore = 0.5; // neutral baseline
    let activityScore = 0.5;
    let onChainScore = 0.5;

    const reasons: string[] = [];

    // 1. Exchange Flow Analysis (50% weight)
    // Negative netFlow = Outflow from exchanges = Bullish (whales accumulating)
    // Positive netFlow = Inflow to exchanges = Bearish (whales dumping)
    const netFlow = whaleData.exchangeFlows.netFlow;

    if (netFlow < -1000000) {
      // Heavy outflow (> $1M) - Very Bullish
      flowScore = 0.8;
      reasons.push(`Heavy outflow: $${Math.abs(netFlow / 1000000).toFixed(1)}M (Bullish)`);
    } else if (netFlow < -100000) {
      // Moderate outflow - Bullish
      flowScore = 0.65;
      reasons.push(`Moderate outflow: $${Math.abs(netFlow / 1000).toFixed(0)}K (Bullish)`);
    } else if (netFlow > 1000000) {
      // Heavy inflow (> $1M) - Very Bearish
      flowScore = 0.2;
      reasons.push(`Heavy inflow: $${(netFlow / 1000000).toFixed(1)}M (Bearish)`);
    } else if (netFlow > 100000) {
      // Moderate inflow - Bearish
      flowScore = 0.35;
      reasons.push(`Moderate inflow: $${(netFlow / 1000).toFixed(0)}K (Bearish)`);
    } else {
      // Balanced flow
      flowScore = 0.5;
      reasons.push('Balanced exchange flow');
    }

    // 2. Large Transactions Count (30% weight)
    // More large transactions = More whale activity = Higher signal strength
    const largeTransactions = whaleData.largeTransactions.length;

    if (largeTransactions >= 10) {
      activityScore = 0.8;
      reasons.push(`${largeTransactions} whale transactions (High activity)`);
    } else if (largeTransactions >= 5) {
      activityScore = 0.65;
      reasons.push(`${largeTransactions} whale transactions (Moderate activity)`);
    } else if (largeTransactions >= 2) {
      activityScore = 0.55;
      reasons.push(`${largeTransactions} whale transactions (Low activity)`);
    } else {
      activityScore = 0.4;
      reasons.push('Minimal whale activity');
    }

    // 3. On-Chain Metrics (20% weight)
    // Rising active addresses = Growing interest = Bullish
    const activeAddresses = whaleData.onChainMetrics?.activeAddresses || 0;

    if (activeAddresses > 1000) {
      onChainScore = 0.7;
      reasons.push(`${activeAddresses} active addresses (Growing interest)`);
    } else if (activeAddresses > 500) {
      onChainScore = 0.6;
      reasons.push(`${activeAddresses} active addresses (Moderate interest)`);
    } else if (activeAddresses > 0) {
      onChainScore = 0.5;
      reasons.push(`${activeAddresses} active addresses`);
    } else {
      // On-chain data not available for this chain/symbol
      onChainScore = 0.5;
      reasons.push('On-chain metrics limited');
    }

    // Calculate holder concentration from hodler behavior if available
    if (whaleData.onChainMetrics?.hodlerBehavior) {
      const longTerm = whaleData.onChainMetrics.hodlerBehavior.longTermHolders || 0;
      const shortTerm = whaleData.onChainMetrics.hodlerBehavior.shortTermHolders || 0;
      const total = longTerm + shortTerm;

      if (total > 0) {
        // Higher long-term holder ratio is bullish
        const longTermRatio = longTerm / total;
        if (longTermRatio > 0.7) {
          onChainScore += 0.1; // Bonus for strong hands
          reasons.push('Strong long-term holders');
        } else if (longTermRatio < 0.3) {
          onChainScore -= 0.1; // Penalty for weak hands
          reasons.push('High short-term holder concentration');
        }
      }
    }

    // Weighted final score
    const finalScore = (flowScore * 0.5) + (activityScore * 0.3) + (onChainScore * 0.2);

    // Clamp to valid range
    const clampedScore = Math.max(0, Math.min(1, finalScore));

    logger.info('Whale activity tracked successfully', {
      symbol,
      score: clampedScore.toFixed(3),
      transactions: largeTransactions,
      netFlow: netFlow.toFixed(2),
      activeAddresses
    });

    return {
      score: clampedScore,
      reasons: reasons.slice(0, 3) // Top 3 most important signals
    };

  } catch (error) {
    logger.error('Whale tracking failed', { symbol }, error as Error);

    // Whale data is not critical - return neutral if blockchain APIs unavailable
    // This allows strategy to continue even if blockchain data is down
    logger.warn('Falling back to neutral whale score due to API failure', { symbol });

    return {
      score: 0.5,
      reasons: ['Blockchain data unavailable', 'Using neutral baseline', 'Non-critical failure']
    };
  }
}
