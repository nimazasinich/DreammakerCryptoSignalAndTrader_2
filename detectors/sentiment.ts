import { LayerScore } from '../types/signals';
import { SentimentAnalysisService } from '../services/SentimentAnalysisService';
import { Logger } from '../core/Logger';

/**
 * Sentiment Layer - Real sentiment analysis using multiple data sources
 *
 * Data sources:
 * - Fear & Greed Index (Alternative.me API)
 * - News sentiment (NewsAPI + HuggingFace NLP)
 * - Social media sentiment (Reddit via SocialAggregation)
 * - On-chain sentiment (via HuggingFace models)
 *
 * Score range: 0-1
 * - 0.0-0.3: Extreme Fear (Bearish)
 * - 0.3-0.4: Fear (Bearish)
 * - 0.4-0.6: Neutral
 * - 0.6-0.7: Greed (Bullish)
 * - 0.7-1.0: Extreme Greed (Bullish)
 */
export async function sentimentLayer(symbol: string): Promise<LayerScore> {
  const logger = Logger.getInstance();
  const sentimentService = SentimentAnalysisService.getInstance();

  try {
    logger.debug('Analyzing sentiment', { symbol });

    // Fetch real sentiment data from multiple sources
    const sentimentData = await sentimentService.analyzeSentiment(symbol);

    // Safety check: ensure overallScore is defined
    if (sentimentData.overallScore === undefined || sentimentData.overallScore === null) {
      logger.warn('Sentiment data missing overallScore, using neutral', { symbol, sentimentData });
      return {
        score: 0.5,
        reasons: ['Sentiment data incomplete', 'Using neutral baseline', 'API errors occurred']
      };
    }

    // Normalize sentiment score from -100~+100 to 0~1 scale
    // -100 (extreme bearish) -> 0
    // 0 (neutral) -> 0.5
    // +100 (extreme bullish) -> 1.0
    const normalizedScore = (sentimentData.overallScore + 100) / 200;

    // Build reasoning from sentiment breakdown
    const reasons: string[] = [];

    // Main sentiment classification - determine from overallScore
    let classification = 'Neutral';
    if (sentimentData.overallScore < -50) classification = 'Extreme Fear';
    else if (sentimentData.overallScore < -20) classification = 'Fear';
    else if (sentimentData.overallScore > 50) classification = 'Extreme Greed';
    else if (sentimentData.overallScore > 20) classification = 'Greed';

    reasons.push(`Overall: ${classification} (${sentimentData.overallScore.toFixed(0)})`);

    // Fear & Greed Index
    if (sentimentData.sources?.fearGreedIndex !== undefined) {
      const fgValue = sentimentData.sources.fearGreedIndex;
      let fgLabel = 'Neutral';
      if (fgValue < -50) fgLabel = 'Extreme Fear';
      else if (fgValue < -20) fgLabel = 'Fear';
      else if (fgValue > 50) fgLabel = 'Extreme Greed';
      else if (fgValue > 20) fgLabel = 'Greed';

      reasons.push(`Fear&Greed: ${fgLabel} (${fgValue.toFixed(0)})`);
    }

    // News sentiment
    if (sentimentData.sources?.news !== undefined) {
      const newsValue = sentimentData.sources.news;
      const newsLabel = newsValue > 20 ? 'Positive' : newsValue < -20 ? 'Negative' : 'Neutral';
      reasons.push(`News: ${newsLabel} (${newsValue.toFixed(0)})`);
    }

    // Social sentiment (Reddit, Twitter, etc.)
    if (sentimentData.sources?.reddit !== undefined || sentimentData.sources?.twitter !== undefined) {
      const redditValue = sentimentData.sources.reddit || 0;
      const twitterValue = sentimentData.sources.twitter || 0;
      const socialValue = (redditValue + twitterValue) / 2;
      const socialLabel = socialValue > 20 ? 'Bullish' : socialValue < -20 ? 'Bearish' : 'Neutral';
      reasons.push(`Social: ${socialLabel} (${socialValue.toFixed(0)})`);
    }

    logger.info('Sentiment analyzed successfully', {
      symbol,
      score: normalizedScore.toFixed(3),
      classification: classification,
      sources: Object.keys(sentimentData.sources || {}).length
    });

    return {
      score: normalizedScore,
      reasons: reasons.slice(0, 3) // Top 3 most important reasons
    };

  } catch (error) {
    logger.error('Sentiment analysis failed', { symbol }, error as Error);

    // In strict mode, throw error to signal pipeline
    // In production, you might want to return neutral with a warning
    console.error(`Sentiment detector failed for ${symbol}: ${(error as Error).message}`);
  }
}
