/**
 * Connection Status Component
 * Displays real-time connection health and provides visual feedback
 */

import React from 'react';
import { useConnectionStatus } from '../hooks/useConnectionStatus';

interface ConnectionStatusProps {
  variant?: 'badge' | 'banner' | 'indicator';
  showDetails?: boolean;
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  variant = 'indicator',
  showDetails = false,
  className = '',
}) => {
  const { health, status, statusMessage, isHealthy, isDegraded, isOffline, refresh, loading } =
    useConnectionStatus();

  if (loading) {
    return (
      <div className={`connection-status loading ${className}`}>
        <span className="spinner">⏳</span>
        <span>Checking connection...</span>
      </div>
    );
  }

  // Badge variant - compact status indicator
  if (variant === 'badge') {
    return (
      <div
        className={`connection-badge ${isOffline ? 'offline' : isDegraded ? 'degraded' : 'healthy'} ${className}`}
        title={statusMessage}
      >
        <span className="status-dot" />
        {showDetails && <span className="status-text">{statusMessage}</span>}
      </div>
    );
  }

  // Banner variant - full-width alert banner
  if (variant === 'banner' && (isDegraded || isOffline)) {
    return (
      <div className={`connection-banner ${isOffline ? 'offline' : 'degraded'} ${className}`}>
        <div className="banner-content">
          <span className="banner-icon">{isOffline ? '❌' : '⚠️'}</span>
          <div className="banner-text">
            <div className="banner-message">{statusMessage}</div>
            {showDetails && status?.message && (
              <div className="banner-details">{status.message}</div>
            )}
          </div>
          <button
            className="banner-action"
            onClick={refresh}
            title="Retry connection"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  // Indicator variant - detailed status card
  if (variant === 'indicator') {
    return (
      <div className={`connection-indicator ${className}`}>
        <div className="indicator-header">
          <h3>Connection Status</h3>
          <button onClick={refresh} className="refresh-btn" title="Refresh status">
            🔄
          </button>
        </div>

        <div className="indicator-body">
          <div className="status-summary">
            <span className={`status-icon ${isOffline ? 'offline' : isDegraded ? 'degraded' : 'healthy'}`}>
              {isOffline ? '❌' : isDegraded ? '⚠️' : '✅'}
            </span>
            <span className="status-message">{statusMessage}</span>
          </div>

          {showDetails && health && (
            <div className="status-details">
              <div className="status-item">
                <span className="item-label">Backend:</span>
                <span className={`item-value ${health.backend ? 'connected' : 'disconnected'}`}>
                  {health.backend ? '✅ Connected' : '❌ Offline'}
                </span>
              </div>

              <div className="status-item">
                <span className="item-label">HuggingFace:</span>
                <span className={`item-value ${health.huggingface ? 'connected' : 'disconnected'}`}>
                  {health.huggingface ? '✅ Connected' : '❌ Offline'}
                </span>
              </div>

              <div className="status-item">
                <span className="item-label">WebSocket:</span>
                <span className={`item-value ${health.websocket ? 'connected' : 'disconnected'}`}>
                  {health.websocket ? '✅ Connected' : '⚠️ Offline'}
                </span>
              </div>

              {status?.available && status.available.length > 0 && (
                <div className="status-item">
                  <span className="item-label">Available Sources:</span>
                  <span className="item-value">{status.available.join(', ')}</span>
                </div>
              )}
            </div>
          )}

          {isDegraded && status?.message && (
            <div className="degraded-notice">
              <span className="notice-icon">ℹ️</span>
              <span className="notice-text">{status.message}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default ConnectionStatus;

