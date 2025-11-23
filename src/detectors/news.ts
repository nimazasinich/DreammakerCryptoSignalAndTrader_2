import { LayerScore } from '../types/signals';
import { SentimentNewsService } from '../services/SentimentNewsService';
import { HFSentimentService } from '../services/HFSentimentService';
import { Logger } from '../core/Logger';

/**
 * News Layer - Real news sentiment analysis using HuggingFace NLP models
 *
 * Data sources:
 * - NewsAPI (crypto news aggregation)
 * - CryptoPanic (crypto-specific news)
 * - HuggingFace Sentiment Model (for title/description analysis)
 *
 * Process:
 * 1. Fetch recent crypto news (last 24-48h)
 * 2. Filter news relevant to the symbol
 * 3. Analyze sentiment using HF transformer models
 * 4. Aggregate sentiment scores
 *
 * Score range: 0-1
 * - 0.0-0.3: Very Negative News (Bearish)
 * - 0.3-0.45: Negative News
 * - 0.45-0.55: Neutral/Mixed News
 * - 0.55-0.7: Positive News
 * - 0.7-1.0: Very Positive News (Bullish)
 */
export async function newsLayer(symbol: string): Promise<LayerScore> {
  const logger = Logger.getInstance();
  const newsService = SentimentNewsService.getInstance();
  const hfService = HFSentimentService.getInstance();

  try {
    logger.debug('Analyzing news sentiment', { symbol });

    // Extract base symbol (remove USDT, USD suffix)
    const baseSymbol = symbol.replace('USDT', '').replace('USD', '').toLowerCase();

    // Fetch recent crypto news
    const allNews = await newsService.getCryptoNews(50);

    // Filter news items relevant to this symbol
    const relevantNews = allNews.filter(item => {
      const titleLower = item.title.toLowerCase();
      const descLower = ((item as any).description || '').toLowerCase();

      // Check if symbol name is mentioned
      return (
        titleLower.includes(baseSymbol) ||
        descLower.includes(baseSymbol) ||
        titleLower.includes(symbol.toLowerCase()) ||
        descLower.includes(symbol.toLowerCase())
      );
    });

    // If no relevant news found, return neutral with low confidence
    if (relevantNews.length === 0) {
      logger.warn('No relevant news found for symbol', { symbol, totalNews: allNews.length });
      return {
        score: 0.5,
        reasons: ['No recent news found', 'Using neutral baseline', 'Limited news coverage']
      };
    }

    // Extract titles for sentiment analysis
    const titles = (relevantNews || []).map(item => item.title);

    // Analyze sentiment using HuggingFace transformer model
    const hfResults = await hfService.analyzeBatch(titles);

    // HF returns sentiment in range -1 to +1
    // Convert to 0-1 scale: (vote + 1) / 2
    const normalizedScore = (hfResults.aggregate.vote + 1) / 2;

    // Build detailed reasoning
    const reasons: string[] = [];

    // Number of news items analyzed
    reasons.push(`${relevantNews.length} news items analyzed`);

    // Overall sentiment (derive label from vote)
    const vote = hfResults.aggregate.vote;
    const sentimentLabel = vote > 0.2 ? 'POSITIVE' : vote < -0.2 ? 'NEGATIVE' : 'NEUTRAL';
    reasons.push(`Sentiment: ${sentimentLabel}`);

    // Confidence level (use average as proxy)
    const confidence = Math.abs(hfResults.aggregate.average) * 100;
    reasons.push(`Confidence: ${confidence.toFixed(0)}%`);

    // Breakdown by positive/negative/neutral (use aggregate counters)
    const positiveCount = hfResults.aggregate.positive;
    const negativeCount = hfResults.aggregate.negative;
    const neutralCount = hfResults.aggregate.neutral;
    const total = relevantNews.length;

    if (total > 0) {
      const positiveRatio = (positiveCount / total) * 100;
      const negativeRatio = (negativeCount / total) * 100;

      if (positiveRatio > 60) {
        reasons.push(`${positiveRatio.toFixed(0)}% positive news`);
      } else if (negativeRatio > 60) {
        reasons.push(`${negativeRatio.toFixed(0)}% negative news`);
      } else {
        reasons.push('Mixed sentiment across sources');
      }
    }

    // Most recent news timestamp (use 'published' property)
    if ((relevantNews?.length || 0) > 0 && relevantNews[0].published) {
      const latestNewsTime = new Date(relevantNews[0].published);
      const hoursAgo = (Date.now() - latestNewsTime.getTime()) / (1000 * 60 * 60);
      reasons.push(`Latest: ${hoursAgo.toFixed(0)}h ago`);
    }

    logger.info('News sentiment analyzed successfully', {
      symbol,
      score: normalizedScore.toFixed(3),
      newsCount: relevantNews.length,
      sentiment: sentimentLabel,
      confidence: confidence.toFixed(1)
    });

    return {
      score: normalizedScore,
      reasons: reasons.slice(0, 3) // Top 3 most important insights
    };

  } catch (error) {
    logger.error('News sentiment analysis failed', { symbol }, error as Error);

    // In production, might want to gracefully degrade instead of throwing
    console.error(`News detector failed for ${symbol}: ${(error as Error).message}`);
  }
}
