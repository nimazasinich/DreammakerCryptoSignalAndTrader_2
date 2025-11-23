import React from 'react';
import NewsCard from './NewsCard';
import type { NewsArticle } from '../../services/enhanced/newsProvider';

export default function NewsPanel({
  items,
  loading,
  error,
  onRetry,
}: {
  items: NewsArticle[];
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
}) {
  if (error) {
    return (
      <div
        className="rounded-xl p-3 text-xs flex items-center justify-between gap-2"
        style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: 'rgb(251, 113, 133)'
        }}
      >
        <span>News unavailable: {error}</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-2 py-1 text-xs rounded transition-colors"
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'rgb(239, 68, 68)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)';
            }}
          >
            Retry
          </button>
        )}
      </div>
    );
  }
  if (loading) {
    return (
      <div
        className="animate-pulse h-24 rounded-xl"
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}
        aria-busy
      >
        <div className="flex items-center justify-center h-full text-slate-400 text-sm">
          Loading news…
        </div>
      </div>
    );
  }
  if (!items?.length) return null;
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {(items || []).map(n => <NewsCard key={n.id} {...n} />)}
    </div>
  );
}
