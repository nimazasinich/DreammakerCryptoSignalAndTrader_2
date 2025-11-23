import React, { useState, useEffect } from 'react';
import { Logger } from '../../core/Logger.js';
import { NewsItem } from '../../types';
import { Newspaper, ExternalLink, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { apiUrl } from '../../lib/api';

interface NewsFeedProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}


const logger = Logger.getInstance();

export const NewsFeed: React.FC<NewsFeedProps> = ({ 
  autoRefresh = true, 
  refreshInterval = 60000 // 1 minute
}) => {
    const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');
  const [loading, setLoading] = useState(true);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl('/news/latest'), { mode: "cors", headers: { "Content-Type": "application/json" } });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.news) {
          // Convert API news format to NewsItem format
          const formattedNews: NewsItem[] = (data.news || []).map((item: Record<string, unknown>, index: number) => {
            const sentimentScore = typeof item.sentiment_score === 'number' ? item.sentiment_score : 0;
            return {
              id: item.id || `news-${index}-${Date.now()}`,
              title: item.title || item.headline || 'No title',
              description: item.description || item.summary || item.content || '',
              url: item.url || item.link || '#',
              source: item.source || item.source_name || 'Unknown',
              publishedAt: item.publishedAt || item.published_at || item.timestamp || new Date().toISOString(),
              sentiment: item.sentiment || (sentimentScore > 0.1 ? 'positive' : sentimentScore < -0.1 ? 'negative' : 'neutral'),
              impact: item.impact || (Math.abs(sentimentScore) > 0.5 ? 'high' : Math.abs(sentimentScore) > 0.2 ? 'medium' : 'low')
            };
          });
          setNews(formattedNews);
        }
      } else {
        // No mock data - show empty state
        if (import.meta.env.DEV) logger.warn('Failed to fetch real news');
        setNews([]);
      }
    } catch (error) {
      if (import.meta.env.DEV) logger.error('Failed to fetch news:', {}, error);
      // No mock data - show empty state instead
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();

    if (autoRefresh) {
      const interval = setInterval(fetchNews, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const filteredNews = filter === 'all' ? news : news.filter(item => item.sentiment === filter);

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <TrendingUp size={16} className="text-green-400" />;
      case 'negative': return <TrendingDown size={16} className="text-red-400" />;
      default: return <Minus size={16} className="text-gray-400" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'border-green-500 bg-green-900/20';
      case 'negative': return 'border-red-500 bg-red-900/20';
      default: return 'border-gray-600 bg-gray-800';
    }
  };

  const getImpactBadge = (impact: string) => {
    const colors = {
      high: 'bg-red-600 text-white',
      medium: 'bg-yellow-600 text-white',
      low: 'bg-green-600 text-white'
    };
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[impact as keyof typeof colors]}`}>
        {impact.toUpperCase()}
      </span>
    );
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours === 1) return '1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return '1 day ago';
    return `${diffInDays} days ago`;
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Newspaper className="text-blue-400" size={28} />
          <div>
            <h3 className="text-xl font-bold text-white">Market News</h3>
            {loading && <p className="text-xs text-gray-400">Loading latest news...</p>}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={fetchNews}
            disabled={loading}
            className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded border border-gray-700 transition-colors disabled:opacity-50"
            title="Refresh news"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="flex space-x-2">
          {['all', 'positive', 'negative', 'neutral'].map((sentiment) => (
            <button
              type="button"
              key={sentiment}
              onClick={() => setFilter(sentiment as 'all' | 'positive' | 'negative' | 'neutral')}
              className={`px-3 py-1 text-sm rounded font-medium transition-colors capitalize ${
                filter === sentiment
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {sentiment}
            </button>
          ))}
          </div>
        </div>
      </div>

      {loading && news.length === 0 ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading news...</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {(filteredNews || []).map((item) => (
          <div
            key={item.id}
            className={`border rounded-lg p-4 transition-colors hover:bg-gray-800/50 ${getSentimentColor(item.sentiment)}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                {getSentimentIcon(item.sentiment)}
                <span className="text-gray-400 text-sm font-medium">{item.source}</span>
                {getImpactBadge(item.impact)}
              </div>
              <span className="text-gray-500 text-xs">
                {formatTimeAgo(item.publishedAt)}
              </span>
            </div>
            
            <h4 className="text-white font-semibold mb-2 leading-tight">
              {item.title}
            </h4>
            
            <p className="text-gray-300 text-sm mb-3 leading-relaxed">
              {item.description}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${
                  item.sentiment === 'positive' ? 'bg-green-400' :
                  item.sentiment === 'negative' ? 'bg-red-400' : 'bg-gray-400'
                }`}></span>
                <span className="text-gray-400 text-xs capitalize">
                  {item.sentiment} sentiment
                </span>
              </div>
              
              <button
                type="button"
                onClick={() => window.open(item.url, '_blank')}
                className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 text-sm transition-colors"
              >
                <span>Read more</span>
                <ExternalLink size={14} />
              </button>
            </div>
          </div>
          ))}
        </div>
      )}

      {!loading && filteredNews.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          <Newspaper size={48} className="mx-auto mb-4 opacity-50" />
          <p>No news articles match the selected filter.</p>
        </div>
      )}
    </div>
  );
};