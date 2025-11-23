import React from 'react';
import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';

interface LiquidationBarProps {
  symbol: string;
  currentPrice: number;
  liquidationPrice: number;
  side: 'LONG' | 'SHORT';
  leverage: number;
  distancePercent: number;
}

export const LiquidationBar: React.FC<LiquidationBarProps> = ({
  symbol,
  currentPrice,
  liquidationPrice,
  side,
  leverage,
  distancePercent
}) => {
  // Determine severity
  const getSeverity = () => {
    if (distancePercent < 5) return 'critical';
    if (distancePercent < 15) return 'high';
    if (distancePercent < 30) return 'medium';
    return 'low';
  };

  const severity = getSeverity();

  const colors = {
    critical: {
      bg: 'from-red-900/40 to-red-800/40',
      border: 'border-red-500/50',
      text: 'text-red-400',
      icon: 'text-red-500',
      glow: 'rgba(239, 68, 68, 0.3)'
    },
    high: {
      bg: 'from-orange-900/40 to-orange-800/40',
      border: 'border-orange-500/50',
      text: 'text-orange-400',
      icon: 'text-orange-500',
      glow: 'rgba(249, 115, 22, 0.3)'
    },
    medium: {
      bg: 'from-yellow-900/40 to-yellow-800/40',
      border: 'border-yellow-500/50',
      text: 'text-yellow-400',
      icon: 'text-yellow-500',
      glow: 'rgba(234, 179, 8, 0.3)'
    },
    low: {
      bg: 'from-green-900/40 to-green-800/40',
      border: 'border-green-500/50',
      text: 'text-green-400',
      icon: 'text-green-500',
      glow: 'rgba(34, 197, 94, 0.3)'
    }
  };

  const color = colors[severity];

  // Calculate position on bar (clamp between 0-100)
  const barPosition = Math.max(0, Math.min(100, distancePercent));

  return (
    <div
      className={`relative p-4 rounded-xl bg-gradient-to-r ${color.bg} border ${color.border} overflow-hidden group hover:scale-[1.02] transition-all duration-300`}
      style={{
        boxShadow: `0 4px 20px ${color.glow}, inset 0 1px 1px rgba(255,255,255,0.1)`
      }}
    >
      {/* Glow effect */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${color.glow} 0%, transparent 70%)`,
          pointerEvents: 'none'
        }}
      />

      {/* Top row: Symbol and Price info */}
      <div className="relative flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          {side === 'LONG' ? (
            <TrendingUp className={`w-5 h-5 ${color.icon}`} />
          ) : (
            <TrendingDown className={`w-5 h-5 ${color.icon}`} />
          )}
          <div>
            <h4 className="text-lg font-bold text-white">{symbol}</h4>
            <p className="text-xs text-gray-400">
              {leverage}x {side}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-400">Current Price</p>
          <p className="text-sm font-bold text-white">
            ${currentPrice.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Liquidation bar */}
      <div className="relative mb-2">
        {/* Background bar */}
        <div className="h-3 bg-gray-800/50 rounded-full overflow-hidden">
          {/* Progress fill */}
          <div
            className={`h-full bg-gradient-to-r ${
              severity === 'critical'
                ? 'from-red-600 to-red-400'
                : severity === 'high'
                ? 'from-orange-600 to-orange-400'
                : severity === 'medium'
                ? 'from-yellow-600 to-yellow-400'
                : 'from-green-600 to-green-400'
            } transition-all duration-1000 ease-out`}
            style={{
              width: `${barPosition}%`,
              boxShadow: `0 0 10px ${color.glow}`
            }}
          />
        </div>

        {/* Current position marker */}
        <div
          className="absolute top-0 h-3 w-1 bg-white shadow-lg"
          style={{
            left: `${barPosition}%`,
            transform: 'translateX(-50%)',
            filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.8))'
          }}
        />
      </div>

      {/* Bottom row: Stats */}
      <div className="relative flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1">
          {severity === 'critical' && (
            <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
          )}
          <span className={`font-semibold ${color.text}`}>
            {distancePercent.toFixed(1)}% to liquidation
          </span>
        </div>

        <div className="text-right">
          <p className="text-gray-400">Liq. Price</p>
          <p className={`font-bold ${color.text}`}>
            ${liquidationPrice.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Critical warning overlay */}
      {severity === 'critical' && (
        <div className="absolute top-2 right-2">
          <div className="relative">
            <AlertTriangle className="w-6 h-6 text-red-500 animate-bounce" />
            <div className="absolute inset-0 bg-red-500 rounded-full blur-md opacity-50 animate-pulse" />
          </div>
        </div>
      )}
    </div>
  );
};
