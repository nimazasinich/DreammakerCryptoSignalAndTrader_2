import React from 'react';

export interface Signal {
  id: string;
  symbol: string;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  timeframe: string;
  strength: 'STRONG' | 'MODERATE' | 'WEAK';
  timestamp: number;
}

interface TopSignalsPanelProps {
  signals: Signal[];
  neuralNetworkAccuracy?: number;
  className?: string;
}

const TopSignalsPanel: React.FC<TopSignalsPanelProps> = ({ 
  signals, 
  neuralNetworkAccuracy = 85,
  className = ''
}) => {
  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'STRONG': return 'text-green-500';
      case 'MODERATE': return 'text-yellow-500';
      case 'WEAK': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case 'BULLISH': return 'text-green-400';
      case 'BEARISH': return 'text-red-400';
      case 'NEUTRAL': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'BULLISH': return '↗';
      case 'BEARISH': return '↘';
      case 'NEUTRAL': return '→';
      default: return '●';
    }
  };

  // Sort signals by confidence and take top 3
  const topSignals = signals
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);

  return (
    <div className={`bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6 shadow-2xl ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">
            # Top 3 AI Signals
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Highest confidence predictions • Neural network: {neuralNetworkAccuracy}%
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-green-400 font-medium">LIVE</span>
        </div>
      </div>

      {/* Signals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(topSignals || []).map((signal, index) => (
          <div
            key={signal.id}
            className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-all duration-300"
          >
            {/* Signal Header */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`text-lg font-bold ${getDirectionColor(signal.direction)}`}>
                    {signal.symbol}
                  </span>
                  <span className={`text-sm ${getDirectionColor(signal.direction)}`}>
                    {getDirectionIcon(signal.direction)}
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                    {signal.timeframe}
                  </span>
                  <span className={`text-xs font-medium ${getStrengthColor(signal.strength)}`}>
                    {signal.strength}
                  </span>
                </div>
              </div>
              <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-white">
                #{index + 1}
              </div>
            </div>

            {/* Confidence Meter */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-400">Confidence</span>
                <span className="text-sm font-bold text-white">
                  {(signal.confidence * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    signal.direction === 'BULLISH'
                      ? 'bg-green-500'
                      : signal.direction === 'BEARISH'
                      ? 'bg-red-500'
                      : 'bg-yellow-500'
                  }`}
                  style={{ width: `${Math.min(signal.confidence * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="flex justify-between items-center text-xs text-gray-400">
              <span>
                {new Date(signal.timestamp).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              <span className={`px-2 py-1 rounded ${
                signal.direction === 'BULLISH' 
                  ? 'bg-green-500/20 text-green-400' 
                  : signal.direction === 'BEARISH' 
                  ? 'bg-red-500/20 text-red-400' 
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {signal.direction}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Stats */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="flex justify-between items-center text-xs text-gray-400">
          <span>Updated: {new Date().toLocaleTimeString('en-US')}</span>
          <span>Signals powered by AI Neural Network</span>
        </div>
      </div>
    </div>
  );
};

export default TopSignalsPanel;

