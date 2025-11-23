// ControlsPanel.tsx - Control panel for toggles and settings
import React from 'react';
import { OverlayConfig } from '../charts/ChartOverlay';

interface ControlsPanelProps {
  overlayConfig: OverlayConfig;
  onConfigChange: (config: OverlayConfig) => void;
  timeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  onRefresh: () => void;
  onScreenshot: () => void;
  onExport: () => void;
  onPlaySimulation: () => void;
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  overlayConfig,
  onConfigChange,
  timeframe,
  onTimeframeChange,
  symbol,
  onSymbolChange,
  onRefresh,
  onScreenshot,
  onExport,
  onPlaySimulation
}) => {
  const [isSimulating, setIsSimulating] = React.useState(false);

  const toggleOverlay = (key: keyof OverlayConfig) => {
    onConfigChange({
      ...overlayConfig,
      [key]: !overlayConfig[key]
    });
  };

  const handlePlaySimulation = () => {
    setIsSimulating(true);
    onPlaySimulation();
    // Reset after 5 seconds
    setTimeout(() => setIsSimulating(false), 5000);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white mb-4" id="controls-heading">
        Controls
      </h3>
      
      {/* Symbol & Timeframe Selectors */}
      <div className="space-y-3" role="group" aria-labelledby="controls-heading">
        <div>
          <label htmlFor="symbol-select" className="block text-sm text-slate-400 mb-2">
            Symbol
          </label>
          <select
            id="symbol-select"
            value={symbol}
            onChange={(e) => onSymbolChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label="Select trading symbol"
          >
            <option value="BTCUSDT">BTC/USDT</option>
            <option value="ETHUSDT">ETH/USDT</option>
            <option value="SOLUSDT">SOL/USDT</option>
            <option value="BNBUSDT">BNB/USDT</option>
            <option value="ADAUSDT">ADA/USDT</option>
            <option value="XRPUSDT">XRP/USDT</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="timeframe-select" className="block text-sm text-slate-400 mb-2">
            Timeframe
          </label>
          <select
            id="timeframe-select"
            value={timeframe}
            onChange={(e) => onTimeframeChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label="Select chart timeframe"
          >
            <option value="1m">1 Minute</option>
            <option value="5m">5 Minutes</option>
            <option value="15m">15 Minutes</option>
            <option value="1h">1 Hour</option>
            <option value="4h">4 Hours</option>
            <option value="1d">1 Day</option>
          </select>
        </div>
      </div>
      
      {/* Overlay Toggles */}
      <div className="space-y-3" role="group" aria-labelledby="overlays-heading">
        <h4 id="overlays-heading" className="text-sm font-semibold text-slate-300">
          Chart Overlays
        </h4>
        
        {[
          { key: 'showSupportResistance' as const, label: 'Support/Resistance', description: 'Show support and resistance levels' },
          { key: 'showOrderBlocks' as const, label: 'Order Blocks', description: 'Show institutional order blocks' },
          { key: 'showFibonacci' as const, label: 'Fibonacci Levels', description: 'Show Fibonacci retracement levels' },
          { key: 'showElliottWaves' as const, label: 'Elliott Waves', description: 'Show Elliott Wave patterns' },
          { key: 'showHarmonicPatterns' as const, label: 'Harmonic Patterns', description: 'Show harmonic chart patterns' },
          { key: 'showEntryExit' as const, label: 'Entry/Exit Markers', description: 'Show entry and exit points' }
        ].map(({ key, label, description }) => (
          <label
            key={key}
            className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-blue-500"
          >
            <span className="text-sm text-slate-300">{label}</span>
            <input
              type="checkbox"
              checked={overlayConfig[key]}
              onChange={() => toggleOverlay(key)}
              className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              aria-label={description}
            />
          </label>
        ))}
      </div>
      
      {/* Action Buttons */}
      <div className="space-y-2 pt-4 border-t border-slate-700" role="group" aria-label="Action buttons">
        <button
          onClick={onRefresh}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          aria-label="Refresh chart data"
        >
          <span aria-hidden="true">🔄</span>
          <span>Refresh Data</span>
        </button>
        
        <button
          onClick={handlePlaySimulation}
          disabled={isSimulating}
          className={`w-full px-4 py-2 text-white rounded-lg transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
            isSimulating 
              ? 'bg-purple-400 cursor-not-allowed' 
              : 'bg-purple-600 hover:bg-purple-700'
          }`}
          aria-label={isSimulating ? 'Simulation in progress' : 'Play signal generation simulation'}
          aria-busy={isSimulating}
        >
          <span aria-hidden="true">{isSimulating ? '⏸️' : '▶️'}</span>
          <span>{isSimulating ? 'Simulating...' : 'Play Simulation'}</span>
        </button>
        
        <button
          onClick={onScreenshot}
          className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          aria-label="Take screenshot of chart"
        >
          <span aria-hidden="true">📸</span>
          <span>Screenshot</span>
        </button>
        
        <button
          onClick={onExport}
          className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          aria-label="Export signal data as JSON"
        >
          <span aria-hidden="true">📊</span>
          <span>Export Data</span>
        </button>
      </div>
    </div>
  );
};

