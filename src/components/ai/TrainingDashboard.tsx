import React, { useState } from 'react';
import { TrainingMetrics } from '../../types';
import { Play, Square, RotateCcw, Activity, Zap, TrendingUp, AlertCircle } from 'lucide-react';

interface TrainingDashboardProps {
  isTraining: boolean;
  currentMetrics?: TrainingMetrics;
  trainingHistory: TrainingMetrics[];
  onStartTraining: () => void;
  onStopTraining: () => void;
}

export const TrainingDashboard: React.FC<TrainingDashboardProps> = ({
  isTraining,
  currentMetrics,
  trainingHistory,
  onStartTraining,
  onStopTraining
}) => {
  const [selectedMetric, setSelectedMetric] = useState<'mse' | 'mae' | 'r2'>('r2');

  const getMetricData = (metric: keyof TrainingMetrics) => {
    return (trainingHistory || []).map(m => m[metric] as number);
  };

  const getMetricColor = (metric: string) => {
    switch (metric) {
      case 'mse': return '#ef4444';
      case 'mae': return '#f59e0b';
      case 'r2': return '#10b981';
      default: return '#6b7280';
    }
  };

  const renderMetricChart = (data: number[], color: string, height = 120) => {
    if (!data?.length) return <div className="p-4 text-gray-400">No items to display</div>;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = (data || []).map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width="100%" height={height} className="border border-gray-700 rounded bg-gray-950">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
          className="drop-shadow-sm"
        />
        <circle
          cx={`${((data.length - 1) / (data.length - 1)) * 100}%`}
          cy={height - ((data[data.length - 1] - min) / range) * height}
          r="3"
          fill={color}
          className="animate-pulse"
        />
      </svg>
    );
  };

  const totalResets = trainingHistory.filter(m => m.resetEvents > 0).length;
  const lastReset = trainingHistory.slice().reverse().find(m => m.resetEvents > 0);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Activity className="text-blue-400" size={28} />
          <h3 className="text-xl font-bold text-white">Neural Network Training</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          {!isTraining ? (
            <button
              onClick={onStartTraining}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium transition-colors"
            >
              <Play size={16} />
              <span>Start Training</span>
            </button>
          ) : (
            <button
              onClick={onStopTraining}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium transition-colors"
            >
              <Square size={16} />
              <span>Stop Training</span>
            </button>
          )}
        </div>
      </div>

      {/* Training Status */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Status</span>
            <div className={`w-3 h-3 rounded-full ${isTraining ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`}></div>
          </div>
          <div className="text-white font-bold text-lg">
            {isTraining ? 'Training' : 'Idle'}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <TrendingUp size={16} className="text-blue-400" />
            <span className="text-gray-400 text-sm">Epoch</span>
          </div>
          <div className="text-white font-bold text-lg">
            {currentMetrics?.epoch || 0}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Zap size={16} className="text-yellow-400" />
            <span className="text-gray-400 text-sm">Learning Rate</span>
          </div>
          <div className="text-white font-bold text-lg">
            {currentMetrics?.learningRate?.toFixed(6) || '0.001000'}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle size={16} className="text-red-400" />
            <span className="text-gray-400 text-sm">Stability Resets</span>
          </div>
          <div className="text-white font-bold text-lg">
            {totalResets}
          </div>
        </div>
      </div>

      {/* Current Metrics */}
      {currentMetrics && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <span className="text-red-400 text-sm font-medium">MSE Loss</span>
            <div className="text-white font-bold text-xl">
              {currentMetrics.mse.toFixed(6)}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <span className="text-yellow-400 text-sm font-medium">MAE</span>
            <div className="text-white font-bold text-xl">
              {currentMetrics.mae.toFixed(6)}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <span className="text-green-400 text-sm font-medium">R² Score</span>
            <div className="text-white font-bold text-xl">
              {currentMetrics.r2.toFixed(4)}
            </div>
          </div>
        </div>
      )}

      {/* Metrics Chart */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-white">Training Progress</h4>
          <div className="flex space-x-2">
            {['mse', 'mae', 'r2'].map((metric) => (
              <button
                key={metric}
                onClick={() => setSelectedMetric(metric as any)}
                className={`px-3 py-1 text-sm rounded font-medium transition-colors ${
                  selectedMetric === metric
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {metric.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="h-32">
          {(trainingHistory?.length || 0) > 0 ? (
            renderMetricChart(
              getMetricData(selectedMetric),
              getMetricColor(selectedMetric),
              120
            )
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-950 border border-gray-700 rounded text-gray-400">
              No training data available
            </div>
          )}
        </div>
      </div>

      {/* Stability Information */}
      {lastReset && (
        <div className="mt-6 bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <RotateCcw size={16} className="text-yellow-400" />
            <span className="text-yellow-400 font-semibold">Last Stability Reset</span>
          </div>
          <div className="text-white text-sm mt-2">
            Epoch {lastReset.epoch} - Learning rate adjusted to {lastReset.learningRate.toFixed(6)}
          </div>
        </div>
      )}

      {/* Training Progress Bar */}
      {isTraining && currentMetrics && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Training Progress</span>
            <span className="text-gray-400 text-sm">
              {((currentMetrics.epoch / 1000) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentMetrics.epoch / 1000) * 100}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};