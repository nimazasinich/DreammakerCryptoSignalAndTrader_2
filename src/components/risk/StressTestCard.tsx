import React from 'react';
import { TrendingDown, Clock, AlertCircle, Skull, Activity } from 'lucide-react';

interface StressTestCardProps {
  scenario: string;
  description: string;
  historicalDate?: string;
  priceImpact: number;
  portfolioImpact: number;
  wouldLiquidate: boolean;
  timeToLiquidation?: string;
  probability: 'high' | 'medium' | 'low';
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export const StressTestCard: React.FC<StressTestCardProps> = ({
  scenario,
  description,
  historicalDate,
  priceImpact,
  portfolioImpact,
  wouldLiquidate,
  timeToLiquidation,
  probability,
  severity
}) => {
  const severityColors = {
    critical: {
      border: 'border-red-500/50',
      bg: 'from-red-950/60 to-red-900/40',
      text: 'text-red-400',
      glow: 'rgba(239, 68, 68, 0.2)',
      icon: 'text-red-500'
    },
    high: {
      border: 'border-orange-500/50',
      bg: 'from-orange-950/60 to-orange-900/40',
      text: 'text-orange-400',
      glow: 'rgba(249, 115, 22, 0.2)',
      icon: 'text-orange-500'
    },
    medium: {
      border: 'border-yellow-500/50',
      bg: 'from-yellow-950/60 to-yellow-900/40',
      text: 'text-yellow-400',
      glow: 'rgba(234, 179, 8, 0.2)',
      icon: 'text-yellow-500'
    },
    low: {
      border: 'border-blue-500/50',
      bg: 'from-blue-950/60 to-blue-900/40',
      text: 'text-blue-400',
      glow: 'rgba(59, 130, 246, 0.2)',
      icon: 'text-blue-500'
    }
  };

  const probabilityColors = {
    high: 'text-red-400',
    medium: 'text-yellow-400',
    low: 'text-green-400'
  };

  const color = severityColors[severity];

  return (
    <div
      className={`relative p-5 rounded-2xl bg-gradient-to-br ${color.bg} border ${color.border} overflow-hidden group hover:scale-[1.02] transition-all duration-300`}
      style={{
        boxShadow: `0 8px 32px ${color.glow}, inset 0 1px 1px rgba(255,255,255,0.05)`
      }}
    >
      {/* Animated background glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${color.glow} 0%, transparent 60%)`,
          pointerEvents: 'none'
        }}
      />

      {/* Header */}
      <div className="relative flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white mb-1 flex items-center">
            {wouldLiquidate && (
              <Skull className={`w-5 h-5 mr-2 ${color.icon} animate-pulse`} />
            )}
            {scenario}
          </h3>
          {historicalDate && (
            <p className="text-xs text-gray-400 flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {historicalDate}
            </p>
          )}
        </div>

        {/* Probability badge */}
        <div
          className={`px-3 py-1 rounded-full text-xs font-semibold ${probabilityColors[probability]} bg-black/30 border border-current/30`}
        >
          {probability.toUpperCase()} PROB
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-300 mb-4 leading-relaxed">
        {description}
      </p>

      {/* Impact metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Price impact */}
        <div className="bg-black/30 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Price Impact</p>
          <p className={`text-2xl font-bold ${color.text} flex items-center`}>
            <TrendingDown className="w-5 h-5 mr-1" />
            {priceImpact}%
          </p>
        </div>

        {/* Portfolio impact */}
        <div className="bg-black/30 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Portfolio Impact</p>
          <p
            className={`text-2xl font-bold ${
              portfolioImpact < 0 ? 'text-red-400' : 'text-green-400'
            }`}
          >
            ${Math.abs(portfolioImpact).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Liquidation warning */}
      {wouldLiquidate && (
        <div className="relative bg-red-950/50 border border-red-500/50 rounded-lg p-3 mb-3">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 animate-pulse" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-400">
                ⚠️ WOULD TRIGGER LIQUIDATION
              </p>
              {timeToLiquidation && (
                <p className="text-xs text-red-300 mt-1">
                  Time to liquidation: <span className="font-bold">{timeToLiquidation}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom stats */}
      <div className="relative flex items-center justify-between pt-3 border-t border-white/10">
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <Activity className="w-4 h-4" />
          <span>Severity: <span className={`font-semibold ${color.text}`}>{severity.toUpperCase()}</span></span>
        </div>

        {!wouldLiquidate && (
          <div className="text-xs text-green-400 font-semibold">
            ✓ Safe from liquidation
          </div>
        )}
      </div>

      {/* Pulse animation for critical scenarios */}
      {severity === 'critical' && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            boxShadow: `0 0 0 0 ${color.glow}`
          }}
        />
      )}
    </div>
  );
};
