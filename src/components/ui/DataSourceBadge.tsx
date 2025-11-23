/**
 * DataSourceBadge - Display current data source with visual indicator
 * Shows whether data is coming from real APIs, cache, or synthetic generation
 */

import React from 'react';

export type DataSource = 'real' | 'cache' | 'synthetic' | 'mock' | 'unknown';

export interface DataSourceBadgeProps {
  source: DataSource;
  className?: string;
  showWarning?: boolean;
}

const SOURCE_CONFIG: Record<DataSource, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  description: string;
}> = {
  real: {
    label: 'Real Data',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    icon: '●',
    description: 'Live data from API providers'
  },
  cache: {
    label: 'Cached',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    icon: '◐',
    description: 'Data from local cache'
  },
  synthetic: {
    label: 'Synthetic',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    icon: '⚠',
    description: 'Generated demo data - not real market data'
  },
  mock: {
    label: 'Demo Mode',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    icon: '⚠',
    description: 'Demo mode - mock data for testing'
  },
  unknown: {
    label: 'Unknown',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    icon: '?',
    description: 'Data source unknown'
  }
};

export const DataSourceBadge: React.FC<DataSourceBadgeProps> = ({
  source,
  className = '',
  showWarning = false
}) => {
  const config = SOURCE_CONFIG[source] || SOURCE_CONFIG.unknown;
  const isSyntheticOrMock = source === 'synthetic' || source === 'mock';

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Badge */}
      <div
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-full
          ${config.bgColor} ${config.color}
          text-xs font-medium
          border border-current/20
          transition-all duration-200
          hover:scale-105
        `}
        title={config.description}
      >
        <span className="text-sm">{config.icon}</span>
        <span>Data: {config.label}</span>
      </div>

      {/* Warning banner for synthetic/mock data */}
      {(showWarning && isSyntheticOrMock) && (
        <div
          className="
            flex items-start gap-2 p-3 rounded-lg
            bg-yellow-500/10 border border-yellow-500/30
            text-yellow-400 text-xs
          "
          role="alert"
        >
          <span className="text-base">⚠️</span>
          <div className="flex-1">
            <p className="font-semibold mb-1">Not Real Market Data</p>
            <p className="text-yellow-300/80">
              You are viewing {source === 'mock' ? 'demo' : 'synthetic'} data.
              Trading signals and analysis may not reflect actual market conditions.
              {source === 'synthetic' && ' This occurs when real data sources are unavailable.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Compact version for status bars
 */
export const DataSourceIndicator: React.FC<{ source: DataSource }> = ({ source }) => {
  const config = SOURCE_CONFIG[source] || SOURCE_CONFIG.unknown;

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 px-2 py-1 rounded
        ${config.bgColor} ${config.color}
        text-xs font-medium
      `}
      title={config.description}
    >
      <span>{config.icon}</span>
      <span className="hidden sm:inline">{config.label}</span>
    </div>
  );
};
