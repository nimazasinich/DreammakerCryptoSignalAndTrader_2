import React, { useEffect, useState } from 'react';
import { Logger } from '../../core/Logger.js';
import { Newspaper, Smile, Frown, AlertCircle, TrendingUp } from 'lucide-react';
import { useTheme } from '../Theme/ThemeProvider';
import { dataManager } from '../../services/dataManager';
import { NewsItem } from '../../types';

interface SentimentData {
  symbol: string;
  sentiment: number; // -100 to +100
  sentimentLabel: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  news: NewsItem[];
  fearGreedIndex?: number;
}


const logger = Logger.getInstance();

export const NewsSentimentScanner: React.FC = () => {
  const { theme } = useTheme();
  const [sentiments, setSentiments] = useState<Record<string, SentimentData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSymbols] = useState<string[]>(['BTCUSDT', 'ETHUSDT', 'SOLUSDT']);

  useEffect(() => {
    const scanSentiment = async () => {
      try {
        setIsLoading(true);
        const results: Record<string, SentimentData> = {};

        for (const symbol of selectedSymbols) {
          try {
            const sentimentResponse = await dataManager.analyzeSentiment(symbol.replace('USDT', ''));
            const sentimentResult = sentimentResponse?.sentiment || sentimentResponse;
            
            if (sentimentResult) {
              const sentimentScore = sentimentResult.overallScore || sentimentResult.sentiment || 0;
              results[symbol] = {
                symbol,
                sentiment: sentimentScore,
                sentimentLabel: sentimentScore > 20 ? 'BULLISH' : sentimentScore < -20 ? 'BEARISH' : 'NEUTRAL',
                news: sentimentResult.newsImpact?.map((item: any, idx: number) => ({
                    id: `news-${item.timestamp}-${idx}`,
                  title: item.headline || item.title || 'No title',
                  description: '',
                  url: '#',
                  source: item.source || 'Unknown',
                  publishedAt: new Date(item.timestamp || Date.now()).toISOString(),
                  sentiment: sentimentScore > 0.1 ? 'positive' : sentimentScore < -0.1 ? 'negative' : 'neutral',
                  impact: item.impact || item.category || 'medium'
                })) || sentimentResult.news || [],
                fearGreedIndex: sentimentResult.sources?.fearGreedIndex || sentimentResult.fearGreedIndex
              };
            }
          } catch (error) {
            logger.error(`Failed to scan sentiment for ${symbol}:`, {}, error);
          }
        }

        setSentiments(results);
      } catch (error) {
        logger.error('Failed to scan news sentiment:', {}, error);
      } finally {
        setIsLoading(false);
      }
    };

    scanSentiment();
    const interval = setInterval(scanSentiment, 180000); // Refresh every 3 minutes

    return () => clearInterval(interval);
  }, [selectedSymbols]);

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 20) return 'text-green-400';
    if (sentiment < -20) return 'text-red-400';
    return 'text-gray-400';
  };

  const getSentimentBg = (sentiment: number) => {
    if (sentiment > 20) return theme === 'dark' ? 'bg-green-900/20 border-green-800/30' : 'bg-green-50 border-green-200';
    if (sentiment < -20) return theme === 'dark' ? 'bg-red-900/20 border-red-800/30' : 'bg-red-50 border-red-200';
    return theme === 'dark' ? 'bg-gray-800/20 border-gray-700/30' : 'bg-gray-50 border-gray-200';
  };

  const getSentimentIcon = (sentiment: number) => {
    if (sentiment > 20) return <Smile className="w-5 h-5 text-green-400" />;
    if (sentiment < -20) return <Frown className="w-5 h-5 text-red-400" />;
    return <Newspaper className="w-5 h-5 text-gray-400" />;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Newspaper className="w-6 h-6 text-blue-400" />
          <h3 className={`text-xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            News Sentiment Scanner
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {isLoading ? 'Scanning...' : `${Object.keys(sentiments).length} assets tracked`}
          </span>
        </div>
      </div>

      {/* Fear & Greed Index */}
      {Object.values(sentiments).length > 0 && Object.values(sentiments)[0]?.fearGreedIndex !== undefined && (
        <div className={`${
          theme === 'dark' 
            ? 'bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-yellow-800/30' 
            : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
        } backdrop-blur-md rounded-xl p-6 border`}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className={`text-lg font-bold mb-1 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Fear & Greed Index
              </h4>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Market sentiment indicator
              </p>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${
                Object.values(sentiments)[0]!.fearGreedIndex! >= 50 
                  ? 'text-green-400' 
                  : Object.values(sentiments)[0]!.fearGreedIndex! >= 25
                    ? 'text-yellow-400'
                    : 'text-red-400'
              }`}>
                {Object.values(sentiments)[0]!.fearGreedIndex}
              </div>
              <div className={`text-xs ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {Object.values(sentiments)[0]!.fearGreedIndex! >= 75 ? 'Extreme Greed' :
                 Object.values(sentiments)[0]!.fearGreedIndex! >= 50 ? 'Greed' :
                 Object.values(sentiments)[0]!.fearGreedIndex! >= 25 ? 'Fear' : 'Extreme Fear'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sentiment Cards */}
      {isLoading && Object.keys(sentiments).length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-body text-text-tertiary">
              Scanning news and sentiment...
            </p>
          </div>
        </div>
      ) : Object.keys(sentiments).length === 0 ? (
        <div className={`${
          theme === 'dark' 
            ? 'bg-white/5 border-blue-800/30' 
            : 'bg-white/80 border-blue-200/50'
        } backdrop-blur-md rounded-xl p-8 border text-center`}>
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            No sentiment data available.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(sentiments).map((sentimentData) => (
            <div
              key={sentimentData.symbol}
              className={`${
                theme === 'dark' 
                  ? 'bg-white/10 border-blue-800/30' 
                  : 'bg-white/80 border-blue-200/50'
              } ${getSentimentBg(sentimentData.sentiment)} backdrop-blur-md rounded-xl p-6 border transition-all hover:scale-105`}
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className={`text-lg font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {sentimentData.symbol.replace('USDT', '')}
                </h4>
                {getSentimentIcon(sentimentData.sentiment)}
              </div>

              <div className="space-y-4">
                {/* Sentiment Score */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      Sentiment Score
                    </span>
                    <span className={`text-xl font-bold ${getSentimentColor(sentimentData.sentiment)}`}>
                      {sentimentData.sentiment > 0 ? '+' : ''}{sentimentData.sentiment.toFixed(1)}
                    </span>
                  </div>
                  <div className={`w-full ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                  } rounded-full h-3`}>
                    <div
                      className={`h-3 rounded-full transition-all ${
                        sentimentData.sentiment > 20 ? 'bg-green-500' :
                        sentimentData.sentiment < -20 ? 'bg-red-500' : 'bg-gray-500'
                      }`}
                      style={{ 
                        width: `${Math.abs(sentimentData.sentiment)}%`,
                        marginLeft: sentimentData.sentiment < 0 ? 'auto' : '0'
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-red-400">-100</span>
                    <span className="text-xs text-gray-400">0</span>
                    <span className="text-xs text-green-400">+100</span>
                  </div>
                </div>

                {/* Sentiment Label */}
                <div className={`${
                  theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'
                } rounded-lg p-3 text-center`}>
                  <span className={`font-bold ${
                    sentimentData.sentimentLabel === 'BULLISH' ? 'text-green-400' :
                    sentimentData.sentimentLabel === 'BEARISH' ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {sentimentData.sentimentLabel}
                  </span>
                </div>

                {/* Recent News Count */}
                {sentimentData.news && (sentimentData.news?.length || 0) > 0 && (
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      Recent News
                    </span>
                    <span className={`font-semibold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {sentimentData.news.length} articles
                    </span>
                  </div>
                )}

                {/* Top News Item */}
                {sentimentData.news && (sentimentData.news?.length || 0) > 0 && (
                  <div className={`${
                    theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'
                  } rounded-lg p-3`}>
                    <div className={`text-xs mb-1 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Latest:
                    </div>
                    <div className={`text-sm font-medium line-clamp-2 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {sentimentData.news[0].title}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

