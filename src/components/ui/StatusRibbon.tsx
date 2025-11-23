import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RefreshCw, WifiOff, Wifi, PlugZap, Zap, Sparkles, Moon, Sun, Gamepad2, DollarSign, AlertTriangle, Cpu, HardDrive, Clock, Activity, Server, Database, TrendingUp, BarChart3, Radio, Waves } from 'lucide-react';
import useHealthCheck from '../../lib/useHealthCheck';
import { t } from '../../i18n';
import { useMode } from '../../contexts/ModeContext';
import { useData } from '../../contexts/DataContext';
import { useLiveData } from '../LiveDataContext';
import { DataSourceIndicator } from './DataSourceBadge';
import { TradingMode, TradingMarket } from '../../types/index';
import { useDataSourceConfig } from '../../hooks/useDataSourceConfig.js';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useAutoReconnect } from '../../hooks/useAutoReconnect';
import { dismissToast, showToast } from './Toast';

const STATUS_STYLES: Record<string, string> = {
  healthy: 'bg-green-100 text-green-800 border-green-300',
  degraded: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  down: 'bg-red-100 text-red-800 border-red-300',
  unknown: 'bg-slate-100 text-slate-700 border-slate-300',
  offline: 'bg-amber-50 text-amber-900 border-amber-200',
};

const MAX_RECONNECT_ATTEMPTS = 5;

// Shimmer animation style
const shimmerStyle = `
  @keyframes shimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
  }
  .animate-shimmer {
    animation: shimmer 3s infinite linear;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.4) 50%,
      transparent 100%
    );
    background-size: 1000px 100%;
  }
`;

export function StatusRibbon() {
  const { status, error, checking, refresh, fromCache, latency } = useHealthCheck(15000, 4000);
  const { state: { dataMode, tradingMode }, setDataMode, setTradingMode } = useMode();
  const { dataSource } = useData();
  const { isConnected } = useLiveData();
  const { isOnline } = useOnlineStatus();
  const autoReconnect = useAutoReconnect({ maxAttempts: MAX_RECONNECT_ATTEMPTS });
  const [systemTradingMode, setSystemTradingMode] = useState<TradingMode>('OFF');
  const [systemTradingMarket, setSystemTradingMarket] = useState<TradingMarket>('FUTURES');
  const [systemMetrics, setSystemMetrics] = useState<{
    cpu?: number;
    memory?: number;
    memoryMB?: { used: number; total: number };
    uptime?: number;
    requests?: number;
  }>({});
  const offlineToastRef = useRef<string | null>(null);
  const prevOnlineRef = useRef<boolean>(isOnline);
  const prevReconnectStatus = useRef(autoReconnect.status);
  const {
    config: dataSourceConfig,
    loading: dataSourceLoading,
    error: dataSourceError
  } = useDataSourceConfig(60000);

  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        const response = await fetch('/api/system/status');
        const data = await response.json();
        if (data.trading) {
          setSystemTradingMode(data.trading.mode || 'OFF');
          setSystemTradingMarket(data.trading.market || 'FUTURES');
        }
        if (data.system) {
          setSystemMetrics({
            cpu: data.system.cpuUsage || data.system.cpu,
            memory: data.system.memoryUsage || data.system.memory,
            memoryMB: data.system.memoryMB,
            uptime: data.performance?.uptime || data.system.uptime,
            requests: data.performance?.requestsTotal
          });
        }
      } catch (err) {
        console.error('Failed to fetch system status:', err);
      }
    };

    fetchSystemStatus();
    const interval = setInterval(fetchSystemStatus, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (prevOnlineRef.current === isOnline) return;

    if (!isOnline) {
      if (!offlineToastRef.current) {
        offlineToastRef.current = showToast(
          'warning',
          'You are offline',
          'We will retry automatically once the network is back.',
          { duration: null, position: 'bottom-right' }
        );
      }
    } else {
      if (offlineToastRef.current) {
        dismissToast(offlineToastRef.current);
        offlineToastRef.current = null;
      }
      showToast('success', 'Back online', 'Connection restored.', { position: 'bottom-right', duration: 4000 });
    }

    prevOnlineRef.current = isOnline;
  }, [isOnline]);

  useEffect(() => {
    if (!isOnline) return;
    if (prevReconnectStatus.current === autoReconnect.status) return;

    if (autoReconnect.status === 'failed') {
      showToast(
        'error',
        'Realtime reconnect failed',
        'Tap "Try now" to attempt another connection.',
        { position: 'bottom-right', duration: 6000 }
      );
    } else if (autoReconnect.status === 'connected' && prevReconnectStatus.current !== 'connected') {
      showToast('success', 'Realtime feed restored', 'WebSocket connection is healthy.', {
        position: 'bottom-right',
        duration: 4000,
      });
    }

    prevReconnectStatus.current = autoReconnect.status;
  }, [autoReconnect.status, isOnline]);

  useEffect(() => {
    if (!isOnline) return;
    refresh();
  }, [isOnline, refresh]);

  if (import.meta?.env?.VITE_SHOW_STATUS_RIBBON === 'false') {
    return null;
  }

  const derivedStatus = !isOnline ? 'offline' : status;
  const style = STATUS_STYLES[derivedStatus] ?? STATUS_STYLES.unknown;
  const primaryDataSource = dataSourceConfig?.overrides?.primarySource || dataSourceConfig?.primarySource;
  const primarySourceLabel = dataSourceLoading
    ? 'Detecting…'
    : primaryDataSource
      ? primaryDataSource.charAt(0).toUpperCase() + primaryDataSource.slice(1)
      : 'Unknown';

  const retrySeconds =
    autoReconnect.nextRetryInMs != null ? Math.ceil(autoReconnect.nextRetryInMs / 1000) : null;
  const retryProgress =
    autoReconnect.pendingDelayMs && autoReconnect.nextRetryInMs != null
      ? 1 - autoReconnect.nextRetryInMs / autoReconnect.pendingDelayMs
      : null;

  const wsStatusLabel = useMemo(() => {
    if (!isOnline) return 'Offline';
    if (isConnected) return 'Connected';
    if (autoReconnect.status === 'reconnecting') return 'Reconnecting…';
    if (autoReconnect.status === 'waiting' && retrySeconds != null) {
      return `Retry in ${retrySeconds}s`;
    }
    if (autoReconnect.status === 'failed') return 'Failed';
    return 'Disconnected';
  }, [autoReconnect.status, isConnected, isOnline, retrySeconds]);

  const reconnectionBannerVisible =
    autoReconnect.status !== 'connected' &&
    autoReconnect.status !== 'idle' &&
    isOnline &&
    !isConnected;

  return (
    <>
      <style>{shimmerStyle}</style>
    <div className="space-y-2" dir="ltr" aria-live="polite">
      {!isOnline && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/50 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4" />
            <span>Connection lost. Waiting for network…</span>
          </div>
          <button
            type="button"
            className="rounded border border-amber-400/70 px-3 py-1 text-[11px]"
            onClick={() => refresh()}
          >
            Retry anyway
          </button>
        </div>
      )}

      {reconnectionBannerVisible && (
        <div className="rounded-lg border border-blue-400/40 bg-blue-50 px-3 py-2 text-xs text-blue-900 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <PlugZap className="h-4 w-4" />
              <span>
                WebSocket {wsStatusLabel}
                {autoReconnect.attempt > 0 &&
                  ` (${Math.min(autoReconnect.attempt, MAX_RECONNECT_ATTEMPTS)}/${MAX_RECONNECT_ATTEMPTS})`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {retrySeconds != null && <span>Next in {retrySeconds}s</span>}
              <button
                type="button"
                className="rounded border border-blue-500/60 px-2 py-1 text-[11px] font-semibold text-blue-900"
                onClick={autoReconnect.triggerReconnect}
              >
                Try now
              </button>
            </div>
          </div>
          {retryProgress !== null && (
            <div className="mt-2 h-1 w-full rounded-full bg-blue-200/60">
              <div
                className="h-full rounded-full bg-blue-600 transition-[width]"
                style={{ width: `${Math.min(100, Math.max(0, retryProgress * 100))}%` }}
              />
            </div>
          )}
        </div>
      )}

      <div 
        className="w-full bg-white rounded-3xl px-6 py-4 flex flex-col gap-4 relative overflow-hidden group" 
        role="status" 
        style={{ 
          backgroundColor: '#FFFFFF',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08), 0 4px 16px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 0 rgba(0, 0, 0, 0.02)'
        }}
      >
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Header Row - Health & Network Status */}
        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          <div className="flex items-center gap-2.5 flex-wrap flex-1">
            {/* Health Status */}
            <div 
              className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl cursor-pointer group/health h-16 min-w-[160px] relative overflow-hidden"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(12px)',
                borderColor: 'rgba(229, 231, 235, 0.8)',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.1), 0 3px 12px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 0 rgba(0, 0, 0, 0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                e.currentTarget.style.borderColor = 'rgba(229, 231, 235, 1)';
                e.currentTarget.style.boxShadow = '0 10px 32px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 1), inset 0 -1px 0 rgba(0, 0, 0, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.85)';
                e.currentTarget.style.borderColor = 'rgba(229, 231, 235, 0.8)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.1), 0 3px 12px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 0 rgba(0, 0, 0, 0.05)';
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
              <div className="relative flex-shrink-0 z-10">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 group-hover:scale-110 ${
                  derivedStatus === 'healthy' ? 'bg-green-50/90 border-green-300/90 shadow-lg shadow-green-200/40' :
                  derivedStatus === 'degraded' ? 'bg-yellow-50/90 border-yellow-300/90 shadow-lg shadow-yellow-200/40' :
                  derivedStatus === 'offline' ? 'bg-amber-50/90 border-amber-300/90 shadow-lg shadow-amber-200/40' :
                  'bg-red-50/90 border-red-300/90 shadow-lg shadow-red-200/40'
                }`}
                style={{
                  backdropFilter: 'blur(8px)',
                  boxShadow: derivedStatus === 'healthy' ? '0 4px 16px rgba(34, 197, 94, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.6)' :
                             derivedStatus === 'degraded' ? '0 4px 16px rgba(234, 179, 8, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.6)' :
                             derivedStatus === 'offline' ? '0 4px 16px rgba(245, 158, 11, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.6)' :
                             '0 4px 16px rgba(239, 68, 68, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
                }}>
                  <span className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                    derivedStatus === 'healthy' ? 'bg-green-500/95 shadow-lg shadow-green-500/50' :
                    derivedStatus === 'degraded' ? 'bg-yellow-500/95 shadow-lg shadow-yellow-500/50' :
                    derivedStatus === 'offline' ? 'bg-amber-500/95 shadow-lg shadow-amber-500/50' :
                    'bg-red-500/95 shadow-lg shadow-red-500/50'
                  }`} 
                  style={{
                    filter: 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.2))',
                    opacity: 0.9
                  }} />
                </div>
              </div>
              <div className="flex flex-col justify-center min-w-0 z-10">
                <span className="text-[9px] uppercase tracking-wider text-gray-600 font-bold leading-tight mb-0.5">{t('layout.healthLabel')}</span>
                <span className="text-sm font-extrabold text-gray-900 capitalize leading-tight whitespace-nowrap transition-all duration-300 group-hover:scale-105">
                  {derivedStatus}
            </span>
              </div>
              {checking && <RefreshCw className="h-3 w-3 animate-spin text-gray-500 ml-1.5 flex-shrink-0" />}
              {error && (
                <div className="ml-1.5 px-1.5 py-0.5 rounded-md bg-red-50 border border-red-200 flex-shrink-0">
                  <AlertTriangle className="h-2.5 w-2.5 text-red-600" />
                </div>
              )}
            </div>

            {/* Latency */}
            {latency != null && (
              <div 
                className="px-4 py-2.5 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl cursor-pointer group/latency h-16 min-w-[160px] relative overflow-hidden"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(12px)',
                  borderColor: 'rgba(229, 231, 235, 0.8)',
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.1), 0 3px 12px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 0 rgba(0, 0, 0, 0.05)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                  e.currentTarget.style.borderColor = 'rgba(229, 231, 235, 1)';
                  e.currentTarget.style.boxShadow = '0 10px 32px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 1), inset 0 -1px 0 rgba(0, 0, 0, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.85)';
                  e.currentTarget.style.borderColor = 'rgba(229, 231, 235, 0.8)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.1), 0 3px 12px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 0 rgba(0, 0, 0, 0.05)';
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
                <div className="flex items-center gap-3 h-full relative z-10">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 bg-yellow-50/90 border-yellow-300/90 flex-shrink-0 transition-all duration-300 group-hover:scale-110 shadow-lg shadow-yellow-200/40"
                    style={{
                      backdropFilter: 'blur(8px)',
                      boxShadow: '0 4px 16px rgba(234, 179, 8, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
                    }}>
                    <Zap className="h-5 w-5 text-yellow-600/90 transition-all duration-300 group-hover:scale-110" style={{ filter: 'drop-shadow(0 0 4px rgba(234, 179, 8, 0.5)) opacity(0.9)' }} />
                  </div>
                  <div className="flex flex-col justify-center min-w-0 flex-1">
                    <span className="text-[9px] text-gray-600 uppercase tracking-wide font-bold leading-tight mb-0.5">Latency</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-extrabold text-gray-900 leading-tight whitespace-nowrap transition-all duration-300 group-hover:scale-105">
                        {latency.toFixed(0)}
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium">ms</span>
                    </div>
                    <span className="text-[8px] text-gray-500 mt-0.5 whitespace-nowrap font-medium">
                      {latency < 50 ? 'Excellent' : latency < 100 ? 'Good' : latency < 200 ? 'Fair' : 'Slow'}
              </span>
                  </div>
                </div>
              </div>
            )}

            {/* Network Status */}
            <div 
              className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl cursor-pointer group/network h-16 min-w-[160px] relative overflow-hidden"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(12px)',
                borderColor: 'rgba(229, 231, 235, 0.8)',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.1), 0 3px 12px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 0 rgba(0, 0, 0, 0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                e.currentTarget.style.borderColor = 'rgba(229, 231, 235, 1)';
                e.currentTarget.style.boxShadow = '0 10px 32px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 1), inset 0 -1px 0 rgba(0, 0, 0, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.85)';
                e.currentTarget.style.borderColor = 'rgba(229, 231, 235, 0.8)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.1), 0 3px 12px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 0 rgba(0, 0, 0, 0.05)';
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 flex-shrink-0 transition-all duration-300 group-hover:scale-110 z-10 ${
                isOnline 
                  ? 'bg-emerald-50/90 border-emerald-300/90 shadow-lg shadow-emerald-200/40' 
                  : 'bg-amber-50/90 border-amber-300/90 shadow-lg shadow-amber-200/40'
              }`}
              style={{
                backdropFilter: 'blur(8px)',
                boxShadow: isOnline ? '0 4px 16px rgba(16, 185, 129, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.6)' :
                             '0 4px 16px rgba(245, 158, 11, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
              }}>
                {isOnline ? (
                  <Wifi className="h-5 w-5 text-emerald-600/90 transition-all duration-300 group-hover:scale-110" style={{ filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.5)) opacity(0.9)' }} />
                ) : (
                  <WifiOff className="h-5 w-5 text-amber-600/90 transition-all duration-300 group-hover:scale-110" style={{ filter: 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.5)) opacity(0.9)' }} />
                )}
              </div>
              <div className="flex flex-col justify-center min-w-0 flex-1 z-10">
                <span className="text-[9px] uppercase tracking-wide text-gray-600 font-bold leading-tight mb-0.5">Network</span>
                <span className={`text-sm font-extrabold leading-tight whitespace-nowrap transition-all duration-300 group-hover:scale-105 ${
                  isOnline ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {isOnline ? 'Online' : 'Offline'}
              </span>
                {isOnline && (
                  <span className="text-[8px] text-emerald-600 mt-0.5 font-medium whitespace-nowrap">Connected</span>
            )}
              </div>
          </div>

            {/* WebSocket Status */}
            <div 
              className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl cursor-pointer group/ws h-16 relative overflow-hidden"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(12px)',
                borderColor: 'rgba(229, 231, 235, 0.8)',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.1), 0 3px 12px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 0 rgba(0, 0, 0, 0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                e.currentTarget.style.borderColor = 'rgba(229, 231, 235, 1)';
                e.currentTarget.style.boxShadow = '0 10px 32px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 1), inset 0 -1px 0 rgba(0, 0, 0, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.85)';
                e.currentTarget.style.borderColor = 'rgba(229, 231, 235, 0.8)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.1), 0 3px 12px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 0 rgba(0, 0, 0, 0.05)';
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 flex-shrink-0 transition-all duration-300 group-hover/ws:scale-110 z-10 ${
                isConnected 
                  ? 'bg-emerald-50/90 border-emerald-400/90 shadow-lg shadow-emerald-200/40' 
                  : 'bg-red-50/90 border-red-300/90 shadow-lg shadow-red-200/40'
              }`}
              style={isConnected ? {
                backdropFilter: 'blur(8px)',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
              } : {
                backdropFilter: 'blur(8px)',
                boxShadow: '0 4px 16px rgba(239, 68, 68, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
              }}
              >
                {isConnected ? (
                  <div className="relative">
                    <Radio className="h-5 w-5 text-emerald-600/90 transition-all duration-300 group-hover/ws:scale-110" style={{ filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.5)) opacity(0.9)' }} />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500/95 border-2 border-white animate-pulse shadow-lg shadow-emerald-500/50" />
            </div>
                ) : (
                  <Radio className="h-5 w-5 text-red-500/90 transition-all duration-300 group-hover/ws:scale-110" style={{ filter: 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.5)) opacity(0.9)' }} />
                )}
          </div>
              <div className="flex flex-col justify-center min-w-0 z-10">
                <span className="text-[9px] uppercase tracking-wide text-gray-600 font-bold leading-tight mb-0.5">WebSocket</span>
                <span className={`text-sm font-extrabold leading-tight whitespace-nowrap transition-all duration-300 group-hover:scale-105 ${
                  isConnected ? 'text-emerald-700' : 'text-red-600'
                }`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
                {isConnected && (
                  <span className="text-[8px] text-emerald-600 mt-0.5 font-medium whitespace-nowrap flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
                    Real-time
                  </span>
                )}
              </div>
            </div>

            {/* Cache Indicator */}
            {fromCache && (
              <div 
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer border-2 border-gray-700"
                style={{
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-white/10 border border-white/20">
                    <Database className="h-4 w-4" style={{ filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.3))' }} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase tracking-wide">Cached</span>
                    <span className="text-[8px] text-gray-300 mt-0.5">Fast Access</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Toggle Buttons Column */}
          <div className="flex flex-col gap-0.5" style={{ height: '4rem' }}>
            {/* Trading Mode Toggle */}
            <div className="flex overflow-hidden rounded-xl bg-gray-100 border-2 border-gray-300 shadow-lg relative flex-1"
              style={{
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.5), inset 0 -1px 0 rgba(0, 0, 0, 0.05)'
              }}
            >
              <button
                onClick={() => setTradingMode('virtual')}
                className={`px-5 py-1.5 text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden group min-w-[110px] h-full ${
                  tradingMode === 'virtual' 
                    ? 'bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white shadow-lg' 
                    : 'text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                }`}
                aria-pressed={tradingMode === 'virtual'}
                style={tradingMode === 'virtual' ? {
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25), 0 2px 6px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.15), inset 0 -1px 0 rgba(0, 0, 0, 0.2), inset 1px 0 0 rgba(255, 255, 255, 0.1)'
                } : {}}
                onMouseEnter={(e) => {
                  if (tradingMode !== 'virtual') {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                  } else {
                    e.currentTarget.style.boxShadow = '0 5px 14px rgba(0, 0, 0, 0.28), 0 2px 7px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.18), inset 0 -1px 0 rgba(0, 0, 0, 0.22)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (tradingMode !== 'virtual') {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '';
                  } else {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.25), 0 2px 6px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.15), inset 0 -1px 0 rgba(0, 0, 0, 0.2), inset 1px 0 0 rgba(255, 255, 255, 0.1)';
                  }
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Gamepad2 className={`h-4 w-4 relative z-10 transition-all duration-300 ${tradingMode === 'virtual' ? 'drop-shadow-[0_0_4px_rgba(255,255,255,0.3)] scale-110' : 'opacity-80'}`} />
                <span className={`relative z-10 transition-all duration-300 ${tradingMode === 'virtual' ? 'font-extrabold' : 'font-bold'}`}>Virtual</span>
              </button>
              <button
                onClick={() => setTradingMode('real')}
                className={`px-5 py-1.5 text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden group min-w-[110px] h-full ${
                  tradingMode === 'real' 
                    ? 'bg-gradient-to-r from-green-500 via-emerald-600 to-green-600 text-white shadow-lg' 
                    : 'text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                }`}
                aria-pressed={tradingMode === 'real'}
                style={tradingMode === 'real' ? {
                  boxShadow: '0 6px 24px rgba(16, 185, 129, 0.45), 0 2px 12px rgba(16, 185, 129, 0.35), 0 0 20px rgba(16, 185, 129, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.25), inset 0 -1px 0 rgba(0, 0, 0, 0.1), inset -1px 0 0 rgba(255, 255, 255, 0.15)'
                } : {}}
                onMouseEnter={(e) => {
                  if (tradingMode === 'real') {
                    e.currentTarget.style.boxShadow = '0 8px 28px rgba(16, 185, 129, 0.5), 0 3px 14px rgba(16, 185, 129, 0.4), 0 0 24px rgba(16, 185, 129, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0 rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.transform = 'scale(1.03)';
                  } else {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (tradingMode === 'real') {
                    e.currentTarget.style.boxShadow = '0 6px 24px rgba(16, 185, 129, 0.45), 0 2px 12px rgba(16, 185, 129, 0.35), 0 0 20px rgba(16, 185, 129, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.25), inset 0 -1px 0 rgba(0, 0, 0, 0.1), inset -1px 0 0 rgba(255, 255, 255, 0.15)';
                  } else {
                    e.currentTarget.style.boxShadow = '';
                  }
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <DollarSign className={`h-4 w-4 relative z-10 transition-all duration-300 ${tradingMode === 'real' ? 'drop-shadow-[0_0_6px_rgba(255,255,255,0.4)] scale-110' : 'opacity-80'}`} />
                <span className={`relative z-10 transition-all duration-300 ${tradingMode === 'real' ? 'font-extrabold' : 'font-bold'}`}>$ Real</span>
              </button>
            </div>

            {/* Data Mode Toggle */}
            <div className="flex overflow-hidden rounded-xl bg-gray-100 border-2 border-gray-300 shadow-lg relative flex-1"
              style={{
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.5), inset 0 -1px 0 rgba(0, 0, 0, 0.05)'
              }}
            >
              <button
                onClick={() => setDataMode('offline')}
                className={`px-5 py-1.5 text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden group min-w-[100px] h-full ${
                  dataMode === 'offline' 
                    ? 'bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white shadow-lg' 
                    : 'text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                }`}
                aria-pressed={dataMode === 'offline'}
                style={dataMode === 'offline' ? {
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25), 0 2px 6px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.15), inset 0 -1px 0 rgba(0, 0, 0, 0.2), inset 1px 0 0 rgba(255, 255, 255, 0.1)'
                } : {}}
                onMouseEnter={(e) => {
                  if (dataMode !== 'offline') {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                  } else {
                    e.currentTarget.style.boxShadow = '0 5px 14px rgba(0, 0, 0, 0.28), 0 2px 7px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.18), inset 0 -1px 0 rgba(0, 0, 0, 0.22)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (dataMode !== 'offline') {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '';
                  } else {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.25), 0 2px 6px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.15), inset 0 -1px 0 rgba(0, 0, 0, 0.2), inset 1px 0 0 rgba(255, 255, 255, 0.1)';
                  }
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Moon className={`h-4 w-4 relative z-10 transition-all duration-300 ${dataMode === 'offline' ? 'drop-shadow-[0_0_4px_rgba(255,255,255,0.3)] scale-110' : 'opacity-80'}`} />
                <span className={`relative z-10 transition-all duration-300 ${dataMode === 'offline' ? 'font-extrabold' : 'font-bold'}`}>Offline</span>
              </button>
              <button
                onClick={() => setDataMode('online')}
                className={`px-5 py-1.5 text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden group min-w-[100px] h-full ${
                  dataMode === 'online' 
                    ? 'bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white shadow-lg' 
                    : 'text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                }`}
                aria-pressed={dataMode === 'online'}
                style={dataMode === 'online' ? {
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25), 0 2px 6px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.15), inset 0 -1px 0 rgba(0, 0, 0, 0.2), inset -1px 0 0 rgba(255, 255, 255, 0.1)'
                } : {}}
                onMouseEnter={(e) => {
                  if (dataMode !== 'online') {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                  } else {
                    e.currentTarget.style.boxShadow = '0 5px 14px rgba(0, 0, 0, 0.28), 0 2px 7px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.18), inset 0 -1px 0 rgba(0, 0, 0, 0.22)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (dataMode !== 'online') {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '';
                  } else {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.25), 0 2px 6px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.15), inset 0 -1px 0 rgba(0, 0, 0, 0.2), inset -1px 0 0 rgba(255, 255, 255, 0.1)';
                  }
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Sun className={`h-4 w-4 relative z-10 transition-all duration-300 ${dataMode === 'online' ? 'drop-shadow-[0_0_4px_rgba(255,255,255,0.3)] scale-110' : 'opacity-80'}`} />
                <span className={`relative z-10 transition-all duration-300 ${dataMode === 'online' ? 'font-extrabold' : 'font-bold'}`}>Online</span>
              </button>
            </div>
          </div>
        </div>

        {/* Second Row - System Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 relative z-10">
          {/* CPU Usage */}
          {systemMetrics.cpu !== undefined && (
            <div 
              className="px-4 py-3 rounded-2xl bg-white border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer group/cpu"
              style={{
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(0, 0, 0, 0.05)'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 bg-blue-50 border-blue-300 flex-shrink-0 group-hover/cpu:scale-110 transition-transform duration-300">
                    <Cpu className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="text-[9px] uppercase tracking-wide text-gray-500 font-bold">CPU Usage</span>
            </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-extrabold text-gray-900 group-hover/cpu:scale-110 transition-transform duration-300">
                    {systemMetrics.cpu.toFixed(1)}%
                  </span>
                  <span className="text-[8px] text-gray-500 mt-0.5">
                    {systemMetrics.cpu < 50 ? 'Low' : systemMetrics.cpu < 80 ? 'Normal' : 'High'}
              </span>
                </div>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200 shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-400 rounded-full transition-all duration-700 relative group-hover/cpu:scale-105"
                  style={{ 
                    width: `${Math.min(100, systemMetrics.cpu)}%`,
                    boxShadow: '0 0 12px rgba(59, 130, 246, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </div>
              </div>
            </div>
          )}

          {/* Memory Usage */}
          {systemMetrics.memory !== undefined && (
            <div 
              className="px-4 py-3 rounded-2xl bg-white border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer group/memory"
              style={{
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(0, 0, 0, 0.05)'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 bg-purple-50 border-purple-300 flex-shrink-0 group-hover/memory:scale-110 transition-transform duration-300">
                    <HardDrive className="h-5 w-5 text-purple-600" />
                  </div>
                  <span className="text-[9px] uppercase tracking-wide text-gray-500 font-bold">Memory</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-extrabold text-gray-900 group-hover/memory:scale-110 transition-transform duration-300">
                    {systemMetrics.memory.toFixed(1)}%
                  </span>
                  {systemMetrics.memoryMB && (
                    <span className="text-[8px] text-gray-500 leading-tight mt-0.5">
                      {systemMetrics.memoryMB.used}MB / {systemMetrics.memoryMB.total}MB
                    </span>
                  )}
                </div>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200 shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-400 rounded-full transition-all duration-700 relative group-hover/memory:scale-105"
                  style={{ 
                    width: `${Math.min(100, systemMetrics.memory)}%`,
                    boxShadow: '0 0 12px rgba(168, 85, 247, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </div>
              </div>
            </div>
          )}

          {/* Uptime */}
          {systemMetrics.uptime !== undefined && (
            <div 
              className="px-4 py-3 rounded-2xl bg-white border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer group/uptime"
              style={{
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(0, 0, 0, 0.05)'
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 bg-emerald-50 border-emerald-300 flex-shrink-0 group-hover/uptime:scale-110 transition-transform duration-300">
                  <Clock className="h-5 w-5 text-emerald-600" />
                </div>
                <span className="text-[9px] uppercase tracking-wide text-gray-500 font-bold">System Uptime</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-extrabold text-gray-900 group-hover/uptime:scale-110 transition-transform duration-300">
                  {systemMetrics.uptime >= 86400 
                    ? `${Math.floor(systemMetrics.uptime / 86400)}d ${Math.floor((systemMetrics.uptime % 86400) / 3600)}h`
                    : systemMetrics.uptime >= 3600
                    ? `${Math.floor(systemMetrics.uptime / 3600)}h ${Math.floor((systemMetrics.uptime % 3600) / 60)}m`
                    : `${Math.floor(systemMetrics.uptime / 60)}m`
                  }
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <span className="text-[8px] text-gray-500 font-medium">Stable & Running</span>
              </div>
            </div>
          )}
            </div>

        {/* Error Display */}
        {error && (
          <div 
            className="px-4 py-3 rounded-2xl bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 flex items-center gap-3 shadow-lg animate-slide-in"
            style={{
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.2), 0 0 20px rgba(239, 68, 68, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
            }}
          >
            <div className="p-1.5 rounded-lg bg-red-100 border border-red-300">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" style={{ filter: 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.6))' }} />
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-xs font-bold text-red-800 uppercase tracking-wide">Error</span>
              <span className="text-sm font-semibold text-red-700 truncate">{error}</span>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

export default StatusRibbon;
