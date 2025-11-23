/**
 * ChartFrame - Reusable chart wrapper with loading/error/reload states
 *
 * Features:
 * - Consistent card styling with glass effect
 * - Skeleton loader during initial load
 * - Error badge with helpful messages
 * - Reload button for manual retry
 * - Accessible with ARIA labels
 */

import React from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import SkeletonBlock from './SkeletonBlock';

export interface ChartFrameProps {
  title: string;
  subtitle?: string;
  loading: boolean;
  error: string | null;
  onReload?: () => void;
  children: React.ReactNode;
  height?: number | string;
}

const ChartFrame: React.FC<ChartFrameProps> = ({
  title,
  subtitle,
  loading,
  error,
  onReload,
  children,
  height = 500,
}) => {
  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-text-base mb-1">{title}</h2>
          {subtitle && (
            <p className="text-sm text-text-secondary">{subtitle}</p>
          )}
        </div>

        {/* Reload button */}
        {onReload && (
          <button
            onClick={onReload}
            disabled={loading}
            className="btn-ghost ml-4"
            aria-label="Reload chart data"
            title="Reload chart data"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm font-medium text-danger">{error}</p>
            {onReload && (
              <button
                onClick={onReload}
                className="mt-2 text-xs font-semibold text-danger hover:underline"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content area */}
      <div
        style={{
          height: typeof height === 'number' ? `${height}px` : height,
          minHeight: '300px',
        }}
      >
        {loading && !error ? (
          <SkeletonBlock height={typeof height === 'number' ? height : 500} />
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default ChartFrame;
