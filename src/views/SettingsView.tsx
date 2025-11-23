import React, { useState, useEffect } from 'react';
import { Logger } from '../core/Logger.js';
import {
  Settings, Save, RotateCcw, Sliders, Shield, Zap, Award,
  TrendingUp, Bell, Globe, Lock, User, Database, RefreshCw, AlertCircle
} from 'lucide-react';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { ExchangeSettings } from '../components/settings/ExchangeSettings';
import TelegramSettingsCard from '../components/settings/TelegramSettingsCard';
import { ExchangeSelector } from '../components/ExchangeSelector';
import DataSourceSettingsCard from '../components/settings/DataSourceSettingsCard';

const logger = Logger.getInstance();

interface DetectorConfig {
  id: string;
  name: string;
  weight: number;
  description: string;
  icon: string;
  color: string;
  enabled: boolean;
}

interface StrategyConfig {
  detectors: DetectorConfig[];
  coreGate: {
    rsi: { enabled: boolean; longThreshold: number; shortThreshold: number };
    macd: { enabled: boolean; longThreshold: number; shortThreshold: number };
  };
  thresholds: {
    buyScore: number;
    sellScore: number;
    minConfidence: number;
    minConsensus: number;
  };
  risk: {
    maxPositionSize: number;
    riskPerTrade: number;
    maxOpenTrades: number;
    maxDrawdown: number;
  };
  multiTimeframe: {
    enabled: boolean;
    timeframes: string[];
    minAgreement: number;
  };
}

const SettingsView: React.FC = () => {
  const [config, setConfig] = useState<StrategyConfig>({
    detectors: [
        {
          id: 'smc', name: 'SMC', weight: 20,
          description: 'Smart Money Concepts – institutional flow tracking',
          icon: '🏦', color: 'from-blue-500 to-cyan-500', enabled: true
        },
      { 
        id: 'harmonic', name: 'Harmonic', weight: 15,
          description: 'Harmonic patterns – Gartley, Bat, Butterfly',
        icon: '🎵', color: 'from-purple-500 to-pink-500', enabled: true
      },
      { 
        id: 'elliott', name: 'Elliott', weight: 15,
          description: 'Elliott waves – automatic wave counting',
        icon: '🌊', color: 'from-teal-500 to-emerald-500', enabled: true
      },
      { 
        id: 'priceAction', name: 'Price Action', weight: 15,
          description: 'Price action – candlestick and structure patterns',
        icon: '📊', color: 'from-orange-500 to-red-500', enabled: true
      },
      { 
        id: 'fibonacci', name: 'Fibonacci', weight: 10,
          description: 'Fibonacci levels – retracement & extension zones',
        icon: '📏', color: 'from-yellow-500 to-orange-500', enabled: true
      },
      { 
        id: 'sar', name: 'SAR', weight: 10,
          description: 'Parabolic SAR – trend direction and reversals',
        icon: '📍', color: 'from-green-500 to-teal-500', enabled: true
      },
      { 
        id: 'sentiment', name: 'Sentiment', weight: 10,
          description: 'Market sentiment – Fear & Greed index',
        icon: '😊', color: 'from-pink-500 to-rose-500', enabled: true
      },
      { 
        id: 'news', name: 'News', weight: 3,
          description: 'Market news – curated event analysis',
        icon: '📰', color: 'from-indigo-500 to-purple-500', enabled: true
      },
      { 
        id: 'whales', name: 'Whales', weight: 2,
          description: 'Whale activity – large on-chain transactions',
        icon: '🐋', color: 'from-cyan-500 to-blue-500', enabled: true
      }
    ],
    coreGate: {
      rsi: { enabled: true, longThreshold: 30, shortThreshold: 70 },
      macd: { enabled: true, longThreshold: 0, shortThreshold: 0 }
    },
    thresholds: {
      buyScore: 0.70,
      sellScore: 0.30,
      minConfidence: 0.70,
      minConsensus: 0.60
    },
    risk: {
      maxPositionSize: 10,
      riskPerTrade: 2,
      maxOpenTrades: 5,
      maxDrawdown: 20
    },
    multiTimeframe: {
      enabled: true,
      timeframes: ['1m', '5m', '15m', '1h'],
      minAgreement: 0.60
    }
  });

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [totalWeight, setTotalWeight] = useState(100);

  // Calculate active detector weight sum
  useEffect(() => {
    const total = config.detectors
      .filter(d => d.enabled)
      .reduce((sum, d) => sum + d.weight, 0);
    setTotalWeight(total);
  }, [config.detectors]);

  // Update detector weight
  const updateDetectorWeight = (id: string, weight: number) => {
    setConfig(prev => ({
      ...prev,
      detectors: (prev.detectors || []).map(d =>
        d.id === id ? { ...d, weight: Math.max(0, Math.min(100, weight)) } : d
      )
    }));
  };

  // Toggle detector enabled state
  const toggleDetector = (id: string) => {
    setConfig(prev => ({
      ...prev,
      detectors: (prev.detectors || []).map(d =>
        d.id === id ? { ...d, enabled: !d.enabled } : d
      )
    }));
  };

  // Reset to default weights
  const resetToDefault = () => {
    // Restore initial weights
    setConfig(prev => ({
      ...prev,
      detectors: (prev.detectors || []).map((d, index) => ({
        ...d,
        weight: [20, 15, 15, 15, 10, 10, 10, 3, 2][index],
        enabled: true
      }))
    }));
  };

  // Normalize weights to 100%
  const normalizeWeights = () => {
    const activeDetectors = config?.detectors?.filter(d => d.enabled);
    const currentTotal = activeDetectors.reduce((sum, d) => sum + d.weight, 0);
    
    if (currentTotal === 0) return;
    
    setConfig(prev => ({
      ...prev,
      detectors: (prev.detectors || []).map(d => {
        if (!d.enabled) return d;
        return {
          ...d,
          weight: parseFloat(((d.weight / currentTotal) * 100).toFixed(1))
        };
      })
    }));
  };

  const isValid = () => {
    return config?.detectors?.filter(d => d.enabled).length > 0;
  };

  const saveSettings = async () => {
    setInlineError(null);
    if (!isValid()) {
      setInlineError('Please enable at least one detector');
      return;
    }
    setSaving(true);
    try {
      logger.info('Saving settings:', { data: config });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      setInlineError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="w-full min-h-screen animate-fade-in pb-8">
        {/* Header */}
        <div className="mb-6">
          <h1 
            className="text-3xl font-bold mb-3 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
            style={{ textShadow: '0 0 30px rgba(99, 102, 241, 0.4)' }}
          >
            Strategy configuration
          </h1>
          <p className="text-slate-400 text-sm">
            Configure HTS detectors and weighting rules
          </p>
        </div>

        {/* Data Source Settings */}
        <div className="mb-6">
          <DataSourceSettingsCard />
        </div>

        {/* Exchange Selector */}
        <div className="mb-6">
          <ExchangeSelector />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:shadow-lg hover:shadow-emerald-500/50 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? 'Saving…' : 'Save settings'}</span>
          </button>

          <button
            onClick={resetToDefault}
            className="px-6 py-3 rounded-xl font-bold bg-slate-800/50 border border-slate-700/50 hover:border-purple-500/50 transition-all flex items-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Reset to defaults</span>
          </button>

          <button
            onClick={normalizeWeights}
            className="px-6 py-3 rounded-xl font-bold bg-slate-800/50 border border-slate-700/50 hover:border-purple-500/50 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Normalize to 100%</span>
          </button>

          {saved && (
            <div className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 flex items-center gap-2">
              <Award className="w-4 h-4" />
              <span>Saved</span>
            </div>
          )}
          {inlineError && (
            <div className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{inlineError}</span>
            </div>
          )}
        </div>

        {/* Weight Status */}
        <div 
          className={`mb-6 p-6 rounded-xl ${
            Math.abs(totalWeight - 100) < 0.1
              ? 'bg-emerald-500/10 border border-emerald-500/30'
              : 'bg-orange-500/10 border border-orange-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold mb-1">Total detector weight</div>
              <div className="text-sm text-slate-400">
                {Math.abs(totalWeight - 100) < 0.1
                  ? '✅ Weights are normalized'
                  : '⚠️ Active weights must total 100%'}
              </div>
            </div>
            <div className={`text-4xl font-bold ${
              Math.abs(totalWeight - 100) < 0.1 ? 'text-emerald-400' : 'text-orange-400'
            }`}>
              {totalWeight.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Detectors Configuration */}
        <div 
          className="mb-6 p-6 rounded-xl"
          style={{
            background: 'rgba(15, 15, 24, 0.6)',
            border: '1px solid rgba(99, 102, 241, 0.2)'
          }}
        >
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Sliders className="w-6 h-6 text-purple-400" />
            Configure nine detectors
          </h3>

          <div className="space-y-4">
            {(config.detectors || []).map((detector) => (
              <div
                key={detector.id}
                className={`p-5 rounded-xl border-2 transition-all ${
                  detector.enabled
                    ? 'bg-slate-800/30 border-slate-700/50'
                    : 'bg-slate-800/10 border-slate-700/30 opacity-50'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon & Name */}
                  <div className="flex-shrink-0">
                    <div 
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br ${detector.color}`}
                    >
                      {detector.icon}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-bold text-lg">{detector.name}</div>
                        <div className="text-sm text-slate-400">{detector.description}</div>
                      </div>
                      
                      {/* Toggle */}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={detector.enabled}
                          onChange={() => toggleDetector(detector.id)}
                          className="w-5 h-5 rounded"
                        />
                        <span className="text-sm text-slate-400">Active</span>
                      </label>
                    </div>

                    {/* Weight Slider */}
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="0.5"
                        value={detector.weight}
                        onChange={(e) => updateDetectorWeight(detector.id, parseFloat(e.target.value))}
                        disabled={!detector.enabled}
                        className="flex-1"
                        style={{
                          accentColor: detector.color.includes('blue') ? '#3b82f6' 
                            : detector.color.includes('purple') ? '#a855f7'
                            : detector.color.includes('emerald') ? '#10b981'
                            : detector.color.includes('orange') ? '#f97316'
                            : '#8b5cf6'
                        }}
                      />
                      
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={detector.weight}
                        onChange={(e) => updateDetectorWeight(detector.id, parseFloat(e.target.value))}
                        disabled={!detector.enabled}
                        className="w-20 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-center font-bold"
                      />
                      
                      <span className="text-slate-400">%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Core Gate Settings */}
        <div 
          className="mb-6 p-6 rounded-xl"
          style={{
            background: 'rgba(15, 15, 24, 0.6)',
            border: '1px solid rgba(99, 102, 241, 0.2)'
          }}
        >
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-400" />
            Core Gate (RSI + MACD)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* RSI */}
            <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold">RSI Settings</h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.coreGate.rsi.enabled}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      coreGate: { ...prev.coreGate, rsi: { ...prev.coreGate.rsi, enabled: e.target.checked } }
                    }))}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-slate-400">Active</span>
                </label>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm text-slate-400 block mb-2">Long Threshold (Oversold)</label>
                  <input
                    type="number"
                    value={config.coreGate.rsi.longThreshold}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      coreGate: { ...prev.coreGate, rsi: { ...prev.coreGate.rsi, longThreshold: parseInt(e.target.value) } }
                    }))}
                    disabled={!config.coreGate.rsi.enabled}
                    className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-400 block mb-2">Short Threshold (Overbought)</label>
                  <input
                    type="number"
                    value={config.coreGate.rsi.shortThreshold}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      coreGate: { ...prev.coreGate, rsi: { ...prev.coreGate.rsi, shortThreshold: parseInt(e.target.value) } }
                    }))}
                    disabled={!config.coreGate.rsi.enabled}
                    className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50"
                  />
                </div>
              </div>
            </div>

            {/* MACD */}
            <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold">MACD Settings</h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.coreGate.macd.enabled}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      coreGate: { ...prev.coreGate, macd: { ...prev.coreGate.macd, enabled: e.target.checked } }
                    }))}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-slate-400">Active</span>
                </label>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm text-slate-400 block mb-2">Long Threshold</label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.coreGate.macd.longThreshold}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      coreGate: { ...prev.coreGate, macd: { ...prev.coreGate.macd, longThreshold: parseFloat(e.target.value) } }
                    }))}
                    disabled={!config.coreGate.macd.enabled}
                    className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-400 block mb-2">Short Threshold</label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.coreGate.macd.shortThreshold}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      coreGate: { ...prev.coreGate, macd: { ...prev.coreGate.macd, shortThreshold: parseFloat(e.target.value) } }
                    }))}
                    disabled={!config.coreGate.macd.enabled}
                    className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Thresholds */}
        <div
          className="mb-6 p-6 rounded-xl"
          style={{
            background: 'rgba(15, 15, 24, 0.6)',
            border: '1px solid rgba(99, 102, 241, 0.2)'
          }}
        >
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            Signal thresholds
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-slate-400 block mb-2">Buy Score Threshold (≥)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={config.thresholds.buyScore}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  thresholds: { ...prev.thresholds, buyScore: parseFloat(e.target.value) }
                }))}
                className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-2">Sell Score Threshold (≤)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={config.thresholds.sellScore}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  thresholds: { ...prev.thresholds, sellScore: parseFloat(e.target.value) }
                }))}
                className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-2">Min Confidence (≥)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={config.thresholds.minConfidence}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  thresholds: { ...prev.thresholds, minConfidence: parseFloat(e.target.value) }
                }))}
                className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-2">Min Consensus (≥)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={config.thresholds.minConsensus}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  thresholds: { ...prev.thresholds, minConsensus: parseFloat(e.target.value) }
                }))}
                className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50"
              />
            </div>
          </div>
        </div>

        {/* Risk Management */}
        <div
          className="rounded-xl p-6"
          style={{
            background: 'rgba(15, 15, 24, 0.6)',
            border: '1px solid rgba(99, 102, 241, 0.2)'
          }}
        >
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Shield className="w-6 h-6 text-orange-400" />
            Risk management
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-slate-400 block mb-2">Max Position Size (%)</label>
              <input
                type="number"
                step="1"
                min="1"
                max="100"
                value={config.risk.maxPositionSize}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  risk: { ...prev.risk, maxPositionSize: parseFloat(e.target.value) }
                }))}
                className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-2">Risk per Trade (%)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={config.risk.riskPerTrade}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  risk: { ...prev.risk, riskPerTrade: parseFloat(e.target.value) }
                }))}
                className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-2">Max Open Trades</label>
              <input
                type="number"
                step="1"
                min="1"
                max="20"
                value={config.risk.maxOpenTrades}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  risk: { ...prev.risk, maxOpenTrades: parseInt(e.target.value) }
                }))}
                className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-2">Max Drawdown (%)</label>
              <input
                type="number"
                step="1"
                min="1"
                max="50"
                value={config.risk.maxDrawdown}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  risk: { ...prev.risk, maxDrawdown: parseFloat(e.target.value) }
                }))}
                className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50"
              />
            </div>
          </div>
        </div>

        {/* Integration Settings (Tabbed) */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Integration Settings
          </h2>
          <IntegrationSettingsTabs />
        </div>
      </div>
    </ErrorBoundary>
  );
};

// Integration Settings Tabs Component
const IntegrationSettingsTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'exchanges' | 'telegram' | 'agents'>('exchanges');

  return (
    <div className="rounded-xl" style={{
      background: 'rgba(15, 15, 24, 0.6)',
      border: '1px solid rgba(99, 102, 241, 0.2)'
    }}>
      {/* Tab Headers */}
      <div className="flex border-b border-slate-700/50">
        <button
          onClick={() => setActiveTab('exchanges')}
          className={`px-6 py-4 font-semibold transition-all ${
            activeTab === 'exchanges'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Exchanges
        </button>
        <button
          onClick={() => setActiveTab('telegram')}
          className={`px-6 py-4 font-semibold transition-all ${
            activeTab === 'telegram'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Telegram
        </button>
        <button
          onClick={() => setActiveTab('agents')}
          className={`px-6 py-4 font-semibold transition-all ${
            activeTab === 'agents'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Agents
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'exchanges' && <ExchangesTab />}
        {activeTab === 'telegram' && <TelegramTab />}
        {activeTab === 'agents' && <AgentsTab />}
      </div>
    </div>
  );
};

// Exchanges Tab
const ExchangesTab: React.FC = () => {
  return (
    <div>
      <ExchangeSettings />
    </div>
  );
};

// Telegram Tab
const TelegramTab: React.FC = () => {
  return (
    <div>
      <TelegramSettingsCard />
    </div>
  );
};

// Agents Tab (Scanner Configuration)
const AgentsTab: React.FC = () => {
  const [config, setConfig] = useState({
    enabled: false,
    scanIntervalMin: 3,
    timeframe: '15m',
    assetsLimit: 100,
    rankRange: [1, 300] as [number, number],
    minVolumeUSD: 5000000,
    useHarmonics: true
  });
  const [status, setStatus] = useState({ running: false, lastRunTs: null, nextRunTs: null });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load config and status on mount
  useEffect(() => {
    loadConfigAndStatus();
  }, []);

  const loadConfigAndStatus = async () => {
    setLoading(true);
    try {
      const { getAgentScannerConfig, getAgentScannerStatus } = await import('../services/settingsAPI');
      const [configRes, statusRes] = await Promise.all([
        getAgentScannerConfig(),
        getAgentScannerStatus()
      ]);

      if (configRes.success && configRes.data) {
        setConfig(configRes.data);
      }
      if (statusRes.success && statusRes.data) {
        setStatus(statusRes.data);
      }
    } catch (err) {
      logger.error('Failed to load agent config', {}, err as Error);
      setError('Failed to load scanner configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const { saveAgentScannerConfig } = await import('../services/settingsAPI');
      await saveAgentScannerConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      logger.info('Scanner config saved', { config });
    } catch (err) {
      logger.error('Failed to save scanner config', {}, err as Error);
      setError('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      const { startAgentScanner } = await import('../services/settingsAPI');
      await startAgentScanner();
      await loadConfigAndStatus();
      logger.info('Scanner agent started');
    } catch (err) {
      logger.error('Failed to start scanner', {}, err as Error);
      setError('Failed to start scanner agent');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    setError(null);
    try {
      const { stopAgentScanner } = await import('../services/settingsAPI');
      await stopAgentScanner();
      await loadConfigAndStatus();
      logger.info('Scanner agent stopped');
    } catch (err) {
      logger.error('Failed to stop scanner', {}, err as Error);
      setError('Failed to stop scanner agent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-2">Background Scanner Agent</h3>
        <p className="text-slate-400 text-sm mb-4">
          Automatically scans top-300 coins for high-probability trading candidates.
          The scanner is <strong>advisory only</strong> and does not execute trades.
        </p>
      </div>

      {/* Status Indicator */}
      <div className={`p-4 rounded-xl border-2 ${
        status.running
          ? 'bg-green-500/10 border-green-500/50'
          : 'bg-slate-800/30 border-slate-700/50'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                status.running ? 'bg-green-500 animate-pulse' : 'bg-slate-500'
              }`} />
              {status.running ? 'Scanner Running' : 'Scanner Stopped'}
            </div>
            {status.lastRunTs && (
              <div className="text-sm text-slate-400 mt-1">
                Last scan: {new Date(status.lastRunTs).toLocaleTimeString()}
              </div>
            )}
            {status.nextRunTs && status.running && (
              <div className="text-sm text-slate-400">
                Next scan: {new Date(status.nextRunTs).toLocaleTimeString()}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleStart}
              disabled={loading || status.running}
              className="px-4 py-2 rounded-lg font-bold bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Start
            </button>
            <button
              onClick={handleStop}
              disabled={loading || !status.running}
              className="px-4 py-2 rounded-lg font-bold bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Stop
            </button>
          </div>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              className="w-5 h-5 rounded"
            />
            <span className="font-semibold">Enable Scanner Agent</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-400 block mb-2">Scan Interval (minutes)</label>
            <input
              type="number"
              min="1"
              max="60"
              value={config.scanIntervalMin}
              onChange={(e) => setConfig({ ...config, scanIntervalMin: parseInt(e.target.value) })}
              disabled={!config.enabled}
              className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50"
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 block mb-2">Timeframe</label>
            <select
              value={config.timeframe}
              onChange={(e) => setConfig({ ...config, timeframe: e.target.value })}
              disabled={!config.enabled}
              className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50"
            >
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="30m">30m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-400 block mb-2">Assets Limit (max to scan)</label>
            <input
              type="number"
              min="10"
              max="300"
              value={config.assetsLimit}
              onChange={(e) => setConfig({ ...config, assetsLimit: parseInt(e.target.value) })}
              disabled={!config.enabled}
              className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50"
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 block mb-2">Min Volume (USD)</label>
            <input
              type="number"
              min="1000000"
              step="1000000"
              value={config.minVolumeUSD}
              onChange={(e) => setConfig({ ...config, minVolumeUSD: parseInt(e.target.value) })}
              disabled={!config.enabled}
              className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50"
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 block mb-2">Rank Range (from)</label>
            <input
              type="number"
              min="1"
              max="300"
              value={config.rankRange[0]}
              onChange={(e) => setConfig({ ...config, rankRange: [parseInt(e.target.value), config.rankRange[1]] })}
              disabled={!config.enabled}
              className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50"
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 block mb-2">Rank Range (to)</label>
            <input
              type="number"
              min="1"
              max="300"
              value={config.rankRange[1]}
              onChange={(e) => setConfig({ ...config, rankRange: [config.rankRange[0], parseInt(e.target.value)] })}
              disabled={!config.enabled}
              className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.useHarmonics}
            onChange={(e) => setConfig({ ...config, useHarmonics: e.target.checked })}
            disabled={!config.enabled}
            className="w-5 h-5 rounded"
          />
          <label className="text-sm text-slate-400">
            Use Harmonic Pattern Confirmation (increases confluence when matched)
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={saveConfig}
          disabled={loading}
          className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:shadow-lg hover:shadow-emerald-500/50 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          <span>{loading ? 'Saving…' : 'Save Configuration'}</span>
        </button>

        {saved && (
          <div className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 flex items-center gap-2">
            <Award className="w-4 h-4" />
            <span>Saved</span>
          </div>
        )}

        {error && (
          <div className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsView;
