/**
 * SCORING EDITOR COMPONENT
 * Executive Control Panel for Quantum Scoring System
 */

import React, { useState, useEffect } from 'react';
import { Logger } from '../../core/Logger.js';
import { API_BASE } from '../../config/env.js';
import axios from 'axios';
import { showToast } from '../ui/Toast';
import { useConfirmModal } from '../ui/ConfirmModal';

interface DetectorWeights {
  technical_analysis: {
    harmonic: number;
    elliott: number;
    fibonacci: number;
    price_action: number;
    smc: number;
    sar: number;
  };
  fundamental_analysis: {
    sentiment: number;
    news: number;
    whales: number;
  };
}

interface TimeframeWeights {
  [key: string]: number;
}

interface ScoringSnapshot {
  timestamp: string;
  symbol: string;
  judicialProceedings: {
    supremeVerdict: {
      direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
      quantumScore: number;
      action: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
      conviction: number;
    };
    timeframeCourts: Array<{
      tf: string;
      direction: string;
      final_score: number;
    }>;
  };
  detectorPerformance: Array<{
    detector: string;
    currentScore: number;
    historicalAccuracy: number;
    confidenceLevel: number;
  }>;
}


const logger = Logger.getInstance();

export const ScoringEditor: React.FC = () => {
  const { confirm, ModalComponent } = useConfirmModal();
  const [detectorWeights, setDetectorWeights] = useState<DetectorWeights>({
    technical_analysis: {
      harmonic: 0.15,
      elliott: 0.15,
      fibonacci: 0.10,
      price_action: 0.15,
      smc: 0.20,
      sar: 0.10
    },
    fundamental_analysis: {
      sentiment: 0.10,
      news: 0.03,
      whales: 0.02
    }
  });

  const [timeframeWeights, setTimeframeWeights] = useState<TimeframeWeights>({
    '5m': 0.15,
    '15m': 0.25,
    '1h': 0.30,
    '4h': 0.20,
    '1d': 0.10
  });

  const [snapshot, setSnapshot] = useState<ScoringSnapshot | null>(null);
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWeights();
  }, []);

  const loadWeights = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/scoring/weights`);
      if (response.data.success) {
        setDetectorWeights(response.data.detectorWeights);
        setTimeframeWeights(response.data.timeframeWeights);
      }
      } catch (err) {
        if (import.meta.env.DEV) logger.error('Failed to load weights', {}, err);
      }
  };

  const loadSnapshot = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE}/api/scoring/snapshot?symbol=${symbol}`);
      if (response.data.success) {
        setSnapshot(response.data.snapshot);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load snapshot');
    } finally {
      setLoading(false);
    }
  };

  const updateWeights = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE}/api/scoring/weights`, {
        detectorWeights,
        timeframeWeights,
        reason: 'Manual adjustment via ScoringEditor',
        authority: 'PRESIDENTIAL'
      });

      if (response.data.success) {
        showToast('success', 'Success', 'Weights updated successfully!');
        await loadWeights();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update weights');
    } finally {
      setLoading(false);
    }
  };

  const resetWeights = async () => {
    const confirmed = await confirm(
      'Reset Weights',
      'Are you sure you want to reset all weights to defaults?',
      'warning'
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      await axios.post(`${API_BASE}/api/scoring/weights/reset`);
      await loadWeights();
      showToast('success', 'Reset Complete', 'Weights reset to defaults');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset weights');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score > 0.5) return 'text-green-600';
    if (score < -0.5) return 'text-red-600';
    return 'text-gray-600';
  };

  const getActionBadgeColor = (action: string): string => {
    switch (action) {
      case 'STRONG_BUY': return 'bg-green-700 text-white';
      case 'BUY': return 'bg-green-500 text-white';
      case 'HOLD': return 'bg-gray-500 text-white';
      case 'SELL': return 'bg-red-500 text-white';
      case 'STRONG_SELL': return 'bg-red-700 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  return (
    <>
      <ModalComponent />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Quantum Scoring System</h1>
        <div className="flex gap-2">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="Symbol (e.g., BTCUSDT)"
            className="px-4 py-2 border rounded"
          />
          <button
            type="button"
            onClick={loadSnapshot}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load Snapshot'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Snapshot Display */}
      {snapshot && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Supreme Verdict</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <div className="text-sm text-gray-600">Quantum Score</div>
              <div className={`text-3xl font-bold ${getScoreColor(snapshot.judicialProceedings.supremeVerdict.quantumScore)}`}>
                {snapshot.judicialProceedings.supremeVerdict.quantumScore.toFixed(3)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Action</div>
              <div className={`inline-block px-4 py-2 rounded ${getActionBadgeColor(snapshot.judicialProceedings.supremeVerdict.action)}`}>
                {snapshot.judicialProceedings.supremeVerdict.action}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Direction</div>
              <div className="text-xl font-semibold">{snapshot.judicialProceedings.supremeVerdict.direction}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Conviction</div>
              <div className="text-xl font-semibold">{(snapshot.judicialProceedings.supremeVerdict.conviction * 100).toFixed(1)}%</div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Timeframe Analysis</h3>
            <div className="space-y-2">
              {(snapshot.judicialProceedings.timeframeCourts || []).map(tf => (
                <div key={tf.tf} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="font-medium">{tf.tf}</span>
                  <span className={getScoreColor(tf.final_score)}>
                    {tf.final_score.toFixed(3)} ({tf.direction})
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Detector Performance</h3>
            <div className="grid grid-cols-3 gap-4">
              {(snapshot.detectorPerformance || []).map(perf => (
                <div key={perf.detector} className="p-3 bg-gray-50 rounded">
                  <div className="font-medium">{perf.detector}</div>
                  <div className="text-sm text-gray-600">
                    Accuracy: {(perf.historicalAccuracy * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">
                    Confidence: {(perf.confidenceLevel * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Weight Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Weights Parliament</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={updateWeights}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Update Weights
            </button>
            <button
              type="button"
              onClick={resetWeights}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
            >
              Reset to Defaults
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Technical Analysis Weights */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Technical Analysis</h3>
            <div className="space-y-3">
              {Object.entries(detectorWeights.technical_analysis).map(([key, value]) => (
                <div key={key} className="flex items-center gap-3">
                  <label className="w-32 text-sm capitalize">{key.replace('_', ' ')}</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={value}
                    onChange={(e) => setDetectorWeights({
                      ...detectorWeights,
                      technical_analysis: {
                        ...detectorWeights.technical_analysis,
                        [key]: parseFloat(e.target.value) || 0
                      }
                    })}
                    className="flex-1 px-3 py-1 border rounded"
                  />
                  <span className="text-sm text-gray-600 w-12">{(value * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fundamental Analysis Weights */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Fundamental Analysis</h3>
            <div className="space-y-3">
              {Object.entries(detectorWeights.fundamental_analysis).map(([key, value]) => (
                <div key={key} className="flex items-center gap-3">
                  <label className="w-32 text-sm capitalize">{key}</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={value}
                    onChange={(e) => setDetectorWeights({
                      ...detectorWeights,
                      fundamental_analysis: {
                        ...detectorWeights.fundamental_analysis,
                        [key]: parseFloat(e.target.value) || 0
                      }
                    })}
                    className="flex-1 px-3 py-1 border rounded"
                  />
                  <span className="text-sm text-gray-600 w-12">{(value * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timeframe Weights */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Timeframe Weights</h3>
          <div className="grid grid-cols-5 gap-3">
            {Object.entries(timeframeWeights).map(([tf, weight]) => (
              <div key={tf} className="flex flex-col gap-2">
                <label className="text-sm font-medium">{tf}</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={weight}
                  onChange={(e) => setTimeframeWeights({
                    ...timeframeWeights,
                    [tf]: parseFloat(e.target.value) || 0
                  })}
                  className="px-3 py-1 border rounded"
                />
                <span className="text-xs text-gray-600">{(weight * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>
    </>
  );
};
