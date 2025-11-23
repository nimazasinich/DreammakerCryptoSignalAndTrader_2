/**
 * Data Loading State Component
 * Shows loading, error, and empty states with proper UX
 */

import React from 'react';
import { ConnectionStatus } from './ConnectionStatus';

interface DataLoadingStateProps {
  loading?: boolean;
  error?: Error | string | null;
  empty?: boolean;
  emptyMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
  children?: React.ReactNode;
  showConnectionStatus?: boolean;
}

export const DataLoadingState: React.FC<DataLoadingStateProps> = ({
  loading = false,
  error = null,
  empty = false,
  emptyMessage = 'No data available',
  errorMessage,
  onRetry,
  children,
  showConnectionStatus = true,
}) => {
  // Loading state
  if (loading) {
    return (
      <div className="data-loading-state loading">
        <div className="loading-spinner">⏳</div>
        <p className="loading-text">Loading data...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    const displayError = typeof error === 'string' ? error : error.message;
    const isConnectionError =
      displayError.includes('fetch') ||
      displayError.includes('network') ||
      displayError.includes('timeout') ||
      displayError.includes('CONNECTION') ||
      displayError.includes('UNAVAILABLE');

    return (
      <div className="data-loading-state error">
        <div className="error-icon">❌</div>
        <p className="error-title">
          {errorMessage || (isConnectionError ? 'Connection Error' : 'Error Loading Data')}
        </p>
        <p className="error-message">{displayError}</p>

        {onRetry && (
          <button onClick={onRetry} className="retry-button">
            🔄 Retry
          </button>
        )}

        {showConnectionStatus && isConnectionError && (
          <div className="error-connection-info">
            <ConnectionStatus variant="banner" showDetails />
          </div>
        )}
      </div>
    );
  }

  // Empty state
  if (empty) {
    return (
      <div className="data-loading-state empty">
        <div className="empty-icon">📭</div>
        <p className="empty-message">{emptyMessage}</p>
        {onRetry && (
          <button onClick={onRetry} className="retry-button">
            🔄 Refresh
          </button>
        )}
      </div>
    );
  }

  // Success state - show children
  return <>{children}</>;
};

export default DataLoadingState;

