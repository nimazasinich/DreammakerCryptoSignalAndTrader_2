/**
 * ML Training & Backtesting Panel
 * Real AI training controls using HF datasets and walk-forward backtesting
 */
import React, { useState, useEffect } from 'react';
import { Play, BarChart3, Database, TrendingUp, Download, AlertCircle } from 'lucide-react';

interface TrainConfig {
  dataset: string;
  symbols: string[];
  timeframe: string;
  task: 'classification' | 'regression';
  target_horizon: number;
  model: 'gbc' | 'rfc' | 'sgdc' | 'gbr' | 'sgdr';
  train_window: string;
  valid_window: string;
}

interface BacktestConfig {
  model_id?: string;
  dataset?: string;
  symbols: string[];
  timeframe: string;
  train_window: string;
  test_window: string;
  fees_bps: number;
  slippage_bps: number;
  online: boolean;
  save_updates: boolean;
  buy_threshold: number;
  sell_threshold: number;
}

interface Model {
  model_id: string;
  model_type: string;
  task: string;
  created_at: string;
  training: {
    metrics: any;
  };
}

const API_BASE = '/api/ml';

export const MLTrainingPanel: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'train' | 'backtest' | 'models'>('models');
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Training config
  const [trainConfig, setTrainConfig] = useState<TrainConfig>({
    dataset: process.env.HF_DATASET_ID || 'crypto/btc-usdt-1h',
    symbols: ['BTC/USDT'],
    timeframe: '1h',
    task: 'classification',
    target_horizon: 12,
    model: 'gbc',
    train_window: '365d',
    valid_window: '60d'
  });

  // Backtest config
  const [backtestConfig, setBacktestConfig] = useState<BacktestConfig>({
    model_id: 'latest',
    symbols: ['BTC/USDT', 'ETH/USDT'],
    timeframe: '1h',
    train_window: '365d',
    test_window: '30d',
    fees_bps: 5,
    slippage_bps: 5,
    online: true,
    save_updates: true,
    buy_threshold: 0.6,
    sell_threshold: 0.4
  });

  // Load models on mount
  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const response = await fetch(`${API_BASE}/models`, { mode: "cors", headers: { "Content-Type": "application/json" } });
      const data = await response.json();
      setModels(data.models || []);
    } catch (err: any) {
      console.error('Failed to load models:', err);
    }
  };

  const handleStartTraining = async () => {
    setLoading(true);
    setError('');
    setStatus('Starting training job...');

    try {
      const response = await fetch(`${API_BASE}/train/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trainConfig),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(data.error || 'Training failed');
      }

      setStatus(`Training started! Job ID: ${data.job_id}`);

      // Poll for status
      const jobId = data.job_id;
      pollTrainingStatus(jobId);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const pollTrainingStatus = async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/train/status?job_id=${jobId}`, { credentials: 'include' });
        const data = await response.json();

        setStatus(`Training progress: ${data.progress}%`);

        if (data.status === 'completed') {
          clearInterval(interval);
          setStatus(`Training completed! Model: ${data.result?.model_id}`);
          setLoading(false);
          loadModels();
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setError(data.error || 'Training failed');
          setLoading(false);
        }
      } catch (err) {
        clearInterval(interval);
        setLoading(false);
      }
    }, 2000);
  };

  const handleRunBacktest = async () => {
    setLoading(true);
    setError('');
    setStatus('Running backtest...');

    try {
      const response = await fetch(`${API_BASE}/backtest/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backtestConfig),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(data.error || 'Backtest failed');
      }

      const results = data.results;
      setStatus(
        `Backtest completed!\n` +
        `Total Return: ${results.total_return_pct?.toFixed(2)}%\n` +
        `Sharpe Ratio: ${results.sharpe_ratio?.toFixed(2)}\n` +
        `Win Rate: ${(results.win_rate * 100)?.toFixed(2)}%\n` +
        `Max Drawdown: ${results.max_drawdown_pct?.toFixed(2)}%`
      );
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Database className="text-purple-400" size={28} />
          <h3 className="text-xl font-bold text-white">ML Training & Backtesting</h3>
        </div>
        <div className="text-xs text-gray-400">
          Real data only • HF Datasets
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 border-b border-gray-700">
        {['models', 'train', 'backtest'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Status Display */}
      {(status || error) && (
        <div className={`mb-4 p-4 rounded-lg ${error ? 'bg-red-900/20 border border-red-500/30' : 'bg-blue-900/20 border border-blue-500/30'}`}>
          <div className="flex items-start space-x-2">
            <AlertCircle size={16} className={error ? 'text-red-400' : 'text-blue-400'} />
            <pre className={`text-sm whitespace-pre-wrap ${error ? 'text-red-300' : 'text-blue-300'}`}>
              {error || status}
            </pre>
          </div>
        </div>
      )}

      {/* Models Tab */}
      {activeTab === 'models' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">Saved Models</h4>
            <button
              onClick={loadModels}
              className="text-sm text-purple-400 hover:text-purple-300"
            >
              Refresh
            </button>
          </div>

          {models.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No trained models yet. Start training to create a model.
            </div>
          ) : (
            <div className="space-y-3">
              {(models || []).map((model) => (
                <div key={model.model_id} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-semibold">{model.model_id}</div>
                      <div className="text-sm text-gray-400">
                        {model.model_type} • {model.task}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      {model.training?.metrics?.accuracy && (
                        <div className="text-green-400">
                          Acc: {(model.training.metrics.accuracy * 100).toFixed(2)}%
                        </div>
                      )}
                      <div className="text-gray-400">{new Date(model.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Training Tab */}
      {activeTab === 'train' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Dataset (HF ID)</label>
              <input
                type="text"
                value={trainConfig.dataset}
                onChange={(e) => setTrainConfig({ ...trainConfig, dataset: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                placeholder="org/dataset-name"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Symbols (comma-separated)</label>
              <input
                type="text"
                value={trainConfig.symbols.join(',')}
                onChange={(e) => setTrainConfig({ ...trainConfig, symbols: e.target.value.split(',').map(s => s.trim()) })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                placeholder="BTC/USDT,ETH/USDT"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Task</label>
              <select
                value={trainConfig.task}
                onChange={(e) => setTrainConfig({ ...trainConfig, task: e.target.value as any })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              >
                <option value="classification">Classification</option>
                <option value="regression">Regression</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Model</label>
              <select
                value={trainConfig.model}
                onChange={(e) => setTrainConfig({ ...trainConfig, model: e.target.value as any })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              >
                <option value="gbc">Gradient Boosting Classifier</option>
                <option value="rfc">Random Forest Classifier</option>
                <option value="sgdc">SGD Classifier (online)</option>
                <option value="gbr">Gradient Boosting Regressor</option>
                <option value="sgdr">SGD Regressor (online)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Target Horizon (periods)</label>
              <input
                type="number"
                value={trainConfig.target_horizon}
                onChange={(e) => setTrainConfig({ ...trainConfig, target_horizon: parseInt(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Timeframe</label>
              <select
                value={trainConfig.timeframe}
                onChange={(e) => setTrainConfig({ ...trainConfig, timeframe: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              >
                <option value="1h">1 Hour</option>
                <option value="4h">4 Hours</option>
                <option value="1d">1 Day</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleStartTraining}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white px-4 py-3 rounded font-medium transition-colors"
          >
            <Play size={16} />
            <span>{loading ? 'Training...' : 'Start Training'}</span>
          </button>
        </div>
      )}

      {/* Backtest Tab */}
      {activeTab === 'backtest' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Model</label>
              <select
                value={backtestConfig.model_id}
                onChange={(e) => setBacktestConfig({ ...backtestConfig, model_id: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              >
                <option value="latest">Latest Model</option>
                {(models || []).map((m) => (
                  <option key={m.model_id} value={m.model_id}>{m.model_id}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Symbols</label>
              <input
                type="text"
                value={backtestConfig.symbols.join(',')}
                onChange={(e) => setBacktestConfig({ ...backtestConfig, symbols: e.target.value.split(',').map(s => s.trim()) })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Train Window</label>
              <input
                type="text"
                value={backtestConfig.train_window}
                onChange={(e) => setBacktestConfig({ ...backtestConfig, train_window: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                placeholder="365d"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Test Window</label>
              <input
                type="text"
                value={backtestConfig.test_window}
                onChange={(e) => setBacktestConfig({ ...backtestConfig, test_window: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                placeholder="30d"
              />
            </div>

            <div className="col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={backtestConfig.online}
                  onChange={(e) => setBacktestConfig({ ...backtestConfig, online: e.target.checked })}
                  className="rounded bg-gray-800 border-gray-700"
                />
                <span className="text-sm text-gray-300">Enable Online Learning (walk-forward updates)</span>
              </label>
            </div>

            <div className="col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={backtestConfig.save_updates}
                  onChange={(e) => setBacktestConfig({ ...backtestConfig, save_updates: e.target.checked })}
                  className="rounded bg-gray-800 border-gray-700"
                  disabled={!backtestConfig.online}
                />
                <span className="text-sm text-gray-300">Save Updated Model After Backtest</span>
              </label>
            </div>
          </div>

          <button
            onClick={handleRunBacktest}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white px-4 py-3 rounded font-medium transition-colors"
          >
            <BarChart3 size={16} />
            <span>{loading ? 'Running Backtest...' : 'Run Walk-Forward Backtest'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
