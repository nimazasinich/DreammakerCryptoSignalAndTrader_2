import React from 'react';
import { AlertTriangle, AlertCircle, Info, TrendingDown, DollarSign, Activity, Zap } from 'lucide-react';

interface RiskAlertCardProps {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'liquidation' | 'concentration' | 'funding' | 'volatility' | 'correlation' | 'exchange';
  title: string;
  description: string;
  action: string;
  impactScore: number;
  timestamp: number;
}

export const RiskAlertCard: React.FC<RiskAlertCardProps> = ({
  severity,
  type,
  title,
  description,
  action,
  impactScore,
  timestamp
}) => {
  const severityConfig = {
    critical: {
      icon: AlertTriangle,
      bg: 'from-red-950/80 to-red-900/60',
      border: 'border-red-500',
      text: 'text-red-400',
      iconColor: 'text-red-500',
      glow: 'rgba(239, 68, 68, 0.3)',
      pulse: true
    },
    high: {
      icon: AlertCircle,
      bg: 'from-orange-950/80 to-orange-900/60',
      border: 'border-orange-500',
      text: 'text-orange-400',
      iconColor: 'text-orange-500',
      glow: 'rgba(249, 115, 22, 0.3)',
      pulse: false
    },
    medium: {
      icon: AlertCircle,
      bg: 'from-yellow-950/80 to-yellow-900/60',
      border: 'border-yellow-500',
      text: 'text-yellow-400',
      iconColor: 'text-yellow-500',
      glow: 'rgba(234, 179, 8, 0.3)',
      pulse: false
    },
    low: {
      icon: Info,
      bg: 'from-blue-950/80 to-blue-900/60',
      border: 'border-blue-500',
      text: 'text-blue-400',
      iconColor: 'text-blue-500',
      glow: 'rgba(59, 130, 246, 0.3)',
      pulse: false
    }
  };

  const typeIcons = {
    liquidation: TrendingDown,
    concentration: Activity,
    funding: DollarSign,
    volatility: Zap,
    correlation: Activity,
    exchange: Activity
  };

  const config = severityConfig[severity];
  const Icon = config.icon;
  const TypeIcon = typeIcons[type];

  // Format timestamp
  const timeAgo = () => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div
      className={`relative p-4 rounded-xl bg-gradient-to-br ${config.bg} border ${config.border} overflow-hidden group hover:scale-[1.01] transition-all duration-300`}
      style={{
        boxShadow: `0 4px 20px ${config.glow}, inset 0 1px 1px rgba(255,255,255,0.1)`
      }}
    >
      {/* Background glow on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${config.glow} 0%, transparent 70%)`,
          pointerEvents: 'none'
        }}
      />

      <div className="relative flex items-start space-x-3">
        {/* Icon */}
        <div className="relative flex-shrink-0">
          <div
            className={`w-10 h-10 rounded-full bg-black/30 flex items-center justify-center ${
              config.pulse ? 'animate-pulse' : ''
            }`}
          >
            <Icon className={`w-5 h-5 ${config.iconColor}`} />
          </div>
          {/* Pulse ring for critical */}
          {config.pulse && (
            <div
              className="absolute inset-0 rounded-full animate-ping"
              style={{
                border: `2px solid ${config.glow}`,
                opacity: 0.75
              }}
            />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 pr-2">
              <h4 className="text-sm font-bold text-white leading-tight mb-1">
                {title}
              </h4>
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <TypeIcon className="w-3 h-3" />
                <span className="capitalize">{type}</span>
                <span>•</span>
                <span>{timeAgo()}</span>
              </div>
            </div>

            {/* Impact score badge */}
            <div
              className={`flex-shrink-0 px-2 py-1 rounded-md text-xs font-bold ${config.text} bg-black/40`}
            >
              {impactScore}
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-300 mb-3 leading-relaxed">
            {description}
          </p>

          {/* Action */}
          <div className="flex items-start space-x-2 p-2 bg-black/30 rounded-lg">
            <span className="text-xs font-semibold text-gray-400 flex-shrink-0">
              Action:
            </span>
            <p className={`text-xs font-semibold ${config.text} leading-relaxed`}>
              {action}
            </p>
          </div>
        </div>
      </div>

      {/* Impact bar */}
      <div className="relative mt-3 h-1 bg-gray-800/50 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${
            severity === 'critical'
              ? 'from-red-600 to-red-400'
              : severity === 'high'
              ? 'from-orange-600 to-orange-400'
              : severity === 'medium'
              ? 'from-yellow-600 to-yellow-400'
              : 'from-blue-600 to-blue-400'
          } transition-all duration-1000`}
          style={{
            width: `${impactScore}%`,
            boxShadow: `0 0 8px ${config.glow}`
          }}
        />
      </div>
    </div>
  );
};
