import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCcw, ShieldCheck } from 'lucide-react';
import { useDataSourceConfig, PrimarySourceOverride } from '../../hooks/useDataSourceConfig.js';
import { showToast } from '../ui/Toast';
import {
  HuggingFaceIcon,
  BinanceIcon,
  KuCoinIcon,
  MixedIcon,
  EnvironmentIcon,
  DatabaseIcon,
  SparklesIcon,
  CheckIcon,
  WarningIcon,
  SuccessIcon,
  InfoIcon,
} from '../ui/DataSourceIcons';

const SOURCE_METADATA: Record<string, { 
  label: string; 
  description: string; 
  accent?: string; 
  recommended?: boolean;
  IconComponent: React.FC<{ className?: string; size?: number }>;
  gradient?: string;
}> = {
  huggingface: {
    label: 'HuggingFace Engine',
    description: 'AI-powered aggregated market data with smart caching',
    accent: 'from-purple-500 to-pink-500',
    gradient: 'bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-purple-600/20',
    recommended: true,
    IconComponent: HuggingFaceIcon,
  },
  binance: {
    label: 'Binance Direct',
    description: 'Direct connection to Binance REST/WebSocket feeds',
    accent: 'from-yellow-500 to-orange-500',
    gradient: 'bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-yellow-600/20',
    IconComponent: BinanceIcon,
  },
  kucoin: {
    label: 'KuCoin Direct',
    description: 'Direct connection to KuCoin REST/WebSocket feeds',
    accent: 'from-green-500 to-emerald-500',
    gradient: 'bg-gradient-to-br from-green-500/20 via-emerald-500/20 to-green-600/20',
    IconComponent: KuCoinIcon,
  },
  mixed: {
    label: 'Mixed Strategy',
    description: 'Intelligent hybrid failover mixing multiple exchanges',
    accent: 'from-blue-500 to-cyan-500',
    gradient: 'bg-gradient-to-br from-blue-500/20 via-cyan-500/20 to-blue-600/20',
    IconComponent: MixedIcon,
  },
  env: {
    label: 'Environment Config',
    description: 'Follow PRIMARY_DATA_SOURCE from server environment',
    accent: 'from-gray-500 to-slate-500',
    gradient: 'bg-gradient-to-br from-gray-500/20 via-slate-500/20 to-gray-600/20',
    IconComponent: EnvironmentIcon,
  }
};

const formatSourceLabel = (value?: string): string =>
  value ? SOURCE_METADATA[value]?.label || value : 'unknown';

const isRuntimeSupported = (source: string): boolean => source === 'huggingface';

const DataSourceSettingsCard: React.FC = () => {
  const {
    config,
    loading,
    error,
    isUpdating,
    refresh,
    updatePrimarySource
  } = useDataSourceConfig();
  const [selection, setSelection] = useState<PrimarySourceOverride>('env');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!config) return;
    setSelection(config.overrides?.primarySource || 'env');
  }, [config]);

  const availableOptions = useMemo(() => {
    const sources = config?.availableSources ?? ['huggingface'];
    const set = Array.from(new Set([...sources, 'env']));
    return set;
  }, [config?.availableSources]);

  const activeSource = selection === 'env'
    ? config?.primarySource
    : selection;
  const overrideActive = Boolean(config?.overrides?.primarySource);

  const canEdit = config?.runtimeOverrideSupported !== false;

  const isSaveDisabled = useMemo(() => {
    if (!canEdit) return true;
    if (selection === 'env' && !overrideActive) return true;
    if (selection === config?.overrides?.primarySource) return true;
    return saving || isUpdating;
  }, [canEdit, selection, overrideActive, config?.overrides?.primarySource, saving, isUpdating]);

  const handleSave = async () => {
    if (!canEdit) {
      showToast('info', 'Server Controlled', 'PRIMARY_DATA_SOURCE is locked in the environment.');
      return;
    }

    setSaving(true);
    try {
      await updatePrimarySource(selection);
      showToast(
        'success',
        'Primary data source updated',
        selection === 'env'
          ? 'Using PRIMARY_DATA_SOURCE from environment'
          : `Primary source set to ${formatSourceLabel(selection)}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showToast('error', 'Update failed', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="w-full rounded-3xl glass-purple border border-purple-200/40 p-8 shadow-glass-xl relative overflow-hidden"
    >
      {/* هاله‌های بنفش پس‌زمینه */}
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-purple-400/20 rounded-full blur-3xl animate-pulse-slow pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-purple-500/15 rounded-full blur-3xl animate-pulse-slow pointer-events-none" style={{ animationDelay: '2s' }} />
      
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between relative z-10">
        <div>
          <h2 className="text-3xl font-bold text-purple-900 flex items-center gap-3 mb-2">
            <span className="animate-float">🎯</span>
            Data Source Selection
            <span className="animate-float" style={{ animationDelay: '0.5s' }}>✨</span>
          </h2>
          <p className="text-sm text-purple-600 font-medium">
            Choose your primary data provider for market data, health checks, and real-time feeds
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-2xl glass border border-purple-300/40 px-4 py-2.5 text-sm font-semibold text-purple-700 transition-all duration-300 hover:shadow-purple-glow-sm hover:scale-105 hover:border-purple-400/60 disabled:opacity-50 disabled:hover:scale-100"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleSave}
            disabled={isSaveDisabled}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-purple px-5 py-2.5 text-sm font-bold text-white shadow-purple-glow-sm transition-all duration-300 hover:shadow-purple-glow hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            {saving || isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
            Apply Selection
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 relative z-10">
        {availableOptions.map((value) => {
          const metadata = SOURCE_METADATA[value] ?? { 
            label: value, 
            description: '', 
            IconComponent: EnvironmentIcon 
          };
          const isSelected = selection === value;
          const disabled = value !== 'env' && (!canEdit || !isRuntimeSupported(value));
          const IconComponent = metadata.IconComponent;

          return (
            <label
              key={value}
              className={`group relative flex cursor-pointer flex-col gap-3 rounded-3xl border p-6 transition-all duration-500 overflow-hidden ${
                isSelected
                  ? 'border-purple-400/60 shadow-purple-glow-sm scale-105'
                  : 'border-purple-200/30 hover:border-purple-300/50 hover:shadow-glass'
              } ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:scale-102'}`}
              style={{
                background: isSelected 
                  ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(126, 34, 206, 0.1) 100%)'
                  : 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(16px)',
              }}
            >
              {/* هاله متحرک برای آیتم انتخاب شده */}
              {isSelected && (
                <>
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-400/30 rounded-full blur-2xl animate-pulse-purple" />
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl animate-pulse-purple" style={{ animationDelay: '1s' }} />
                </>
              )}
              
              {/* افکت درخشش */}
              <div className={`absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${isSelected ? 'opacity-50' : ''}`} />
              
              {/* محتوا */}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-500 ${
                      isSelected 
                        ? 'bg-gradient-purple text-white shadow-purple-glow-sm animate-float' 
                        : 'glass border border-purple-200/40 text-purple-600 group-hover:border-purple-300/60 group-hover:shadow-purple-glow-sm'
                    }`}>
                      <IconComponent size={28} className="transition-transform duration-500 group-hover:scale-110" />
                    </div>
                    <div className="font-bold text-lg text-purple-900">{metadata.label}</div>
                  </div>
                  {metadata.recommended && (
                    <span className="rounded-full bg-gradient-purple text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide shadow-purple-glow-sm animate-pulse-slow flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      Best
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-purple-700 font-medium leading-relaxed mb-3">
                  {metadata.description}
                </p>
                
                {disabled && value !== 'env' && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-400/30">
                    <WarningIcon size={16} className="text-amber-600" />
                    <span className="text-xs font-bold uppercase tracking-wide text-amber-700">
                      Coming Soon
                    </span>
                  </div>
                )}
                
                {/* چک مارک برای انتخاب شده */}
                {isSelected && (
                  <div className="absolute top-4 right-4 flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-lg animate-fade-in">
                    <div className="w-8 h-8 rounded-full bg-gradient-purple flex items-center justify-center animate-pulse">
                      <CheckIcon size={18} className="text-white" />
                    </div>
                  </div>
                )}
              </div>
              
              <input
                type="radio"
                name="primary-data-source"
                value={value}
                className="sr-only"
                checked={isSelected}
                onChange={() => setSelection(value as PrimarySourceOverride)}
                disabled={disabled}
              />
            </label>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 relative z-10">
        {/* Active Source Card */}
        <div className="rounded-3xl glass border border-purple-200/40 p-6 shadow-glass relative overflow-hidden group hover:shadow-glass-lg transition-all duration-500">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-400/20 rounded-full blur-2xl group-hover:bg-purple-400/30 transition-all duration-500" />
          
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-purple text-white shadow-purple-glow-sm animate-float">
              <DatabaseIcon size={32} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-purple-500 font-bold mb-1">Active Source</p>
              <p className="text-2xl font-bold text-purple-900 capitalize flex items-center gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Detecting…
                  </>
                ) : (
                  <>
                    {(() => {
                      const IconComponent = SOURCE_METADATA[activeSource || 'env']?.IconComponent;
                      return IconComponent ? <IconComponent size={24} /> : null;
                    })()}
                    {formatSourceLabel(activeSource || undefined)}
                  </>
                )}
              </p>
            </div>
          </div>
          
          {overrideActive ? (
            <div className="relative z-10 rounded-2xl glass border border-amber-400/40 px-4 py-3 bg-gradient-to-br from-amber-500/20 to-orange-500/20">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500 text-white flex-shrink-0">
                  <WarningIcon size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-700 mb-1">Override Active</p>
                  <p className="text-xs text-amber-600 font-medium">
                    Server is using <strong>{formatSourceLabel(config?.overrides?.primarySource || undefined)}</strong> until reset to environment defaults.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative z-10 rounded-2xl glass border border-purple-200/40 px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-green-500 text-white flex-shrink-0">
                  <SuccessIcon size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-purple-700 mb-1">Environment Config</p>
                  <p className="text-xs text-purple-600 font-medium">
                    Following <code className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-mono text-[10px]">PRIMARY_DATA_SOURCE</code> from server environment.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* HuggingFace Info Card */}
        <div className="rounded-3xl glass border border-purple-200/40 p-6 shadow-glass relative overflow-hidden group hover:shadow-glass-lg transition-all duration-500">
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-purple-500/15 rounded-full blur-2xl group-hover:bg-purple-500/25 transition-all duration-500" />
          
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-purple text-white shadow-purple-glow-sm animate-float" style={{ animationDelay: '0.5s' }}>
              <SparklesIcon size={32} />
            </div>
            <div className="flex items-center gap-2">
              <HuggingFaceIcon size={24} className="text-purple-900" />
              <p className="text-lg font-bold text-purple-900">HuggingFace Engine</p>
            </div>
          </div>
          
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl glass border border-purple-200/30 hover:border-purple-300/50 transition-all duration-300">
              <span className="text-xs font-bold text-purple-600 uppercase tracking-wide">Base URL</span>
              <span className="text-xs text-purple-900 font-mono font-semibold">{config?.huggingface?.baseUrl || 'n/a'}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl glass border border-purple-200/30 hover:border-purple-300/50 transition-all duration-300">
              <span className="text-xs font-bold text-purple-600 uppercase tracking-wide">Timeout</span>
              <span className="text-xs text-purple-900 font-semibold">{config?.huggingface?.timeout ?? '—'} ms</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl glass border border-purple-200/30 hover:border-purple-300/50 transition-all duration-300">
              <span className="text-xs font-bold text-purple-600 uppercase tracking-wide">User Agent</span>
              <span className="text-xs text-purple-900 font-mono font-semibold truncate max-w-[200px]">{config?.huggingface?.userAgent || 'n/a'}</span>
            </div>
          </div>
          
          <div className="mt-4 flex items-start gap-2 text-xs text-purple-600 font-medium relative z-10 px-3 py-2 rounded-xl glass border border-purple-200/30">
            <InfoIcon size={16} className="flex-shrink-0 mt-0.5" />
            <p>These values update automatically from backend environment</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-3xl glass border border-red-400/40 px-6 py-4 bg-gradient-to-br from-red-500/20 to-pink-500/20 shadow-[0_0_30px_rgba(239,68,68,0.3)] relative z-10 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500 text-white shadow-lg animate-pulse">
              <span className="text-xl">⚠️</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-red-700 mb-1">Configuration Error</p>
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataSourceSettingsCard;

