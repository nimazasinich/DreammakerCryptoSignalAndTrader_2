/**
 * ConnectionStatusIndicator - نمایشگر وضعیت اتصال با انیمیشن‌های جذاب
 */

import React, { useEffect, useState } from 'react';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

interface ConnectionStatusIndicatorProps {
  status: ConnectionStatus;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
}

const STATUS_CONFIG: Record<ConnectionStatus, {
  color: string;
  bgColor: string;
  shadowColor: string;
  icon: string;
  label: string;
  pulseColor: string;
}> = {
  connected: {
    color: 'bg-green-500',
    bgColor: 'bg-green-500/20',
    shadowColor: 'shadow-[0_0_20px_rgba(34,197,94,0.6)]',
    pulseColor: 'bg-green-400',
    icon: '✓',
    label: 'Connected',
  },
  connecting: {
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-500/20',
    shadowColor: 'shadow-[0_0_20px_rgba(234,179,8,0.6)]',
    pulseColor: 'bg-yellow-400',
    icon: '⟳',
    label: 'Connecting...',
  },
  disconnected: {
    color: 'bg-gray-500',
    bgColor: 'bg-gray-500/20',
    shadowColor: 'shadow-[0_0_20px_rgba(107,114,128,0.6)]',
    pulseColor: 'bg-gray-400',
    icon: '○',
    label: 'Disconnected',
  },
  error: {
    color: 'bg-red-500',
    bgColor: 'bg-red-500/20',
    shadowColor: 'shadow-[0_0_20px_rgba(239,68,68,0.6)]',
    pulseColor: 'bg-red-400',
    icon: '✕',
    label: 'Error',
  },
};

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  status,
  label,
  size = 'md',
  showLabel = true,
  animated = true,
}) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const config = STATUS_CONFIG[status];

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const containerSizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  // انیمیشن transition وقتی وضعیت تغییر می‌کند
  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 600);
    return () => clearTimeout(timer);
  }, [status]);

  return (
    <div className="flex items-center gap-3">
      {/* دایره وضعیت */}
      <div className={`relative flex items-center justify-center ${containerSizeClasses[size]}`}>
        {/* حلقه‌های پالس */}
        {animated && status === 'connected' && (
          <>
            <div className={`absolute inset-0 ${config.color} rounded-full animate-ping opacity-75`} />
            <div className={`absolute inset-0 ${config.pulseColor} rounded-full animate-pulse`} />
          </>
        )}
        
        {/* حلقه چرخان برای connecting */}
        {animated && status === 'connecting' && (
          <div className={`absolute inset-0 border-2 border-t-transparent ${config.color.replace('bg-', 'border-')} rounded-full animate-spin`} />
        )}
        
        {/* دایره اصلی */}
        <div
          className={`
            relative z-10 ${sizeClasses[size]} rounded-full
            ${config.color} ${config.shadowColor}
            ${isTransitioning ? 'scale-150 opacity-0' : 'scale-100 opacity-100'}
            transition-all duration-500
            ${animated ? 'animate-pulse' : ''}
          `}
        />
        
        {/* آیکون */}
        {size === 'lg' && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
            {config.icon}
          </div>
        )}
      </div>

      {/* برچسب */}
      {showLabel && (
        <div className="flex flex-col">
          <span className={`
            text-sm font-bold
            ${isTransitioning ? 'scale-110' : 'scale-100'}
            transition-transform duration-300
          `}>
            {label || config.label}
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * نسخه کامپکت برای استفاده در StatusBar
 */
export const CompactConnectionStatus: React.FC<{
  status: ConnectionStatus;
  onClick?: () => void;
}> = ({ status, onClick }) => {
  const config = STATUS_CONFIG[status];

  return (
    <button
      onClick={onClick}
      className={`
        group relative
        flex items-center gap-2
        px-4 py-2 rounded-2xl
        glass border border-purple-200/40
        transition-all duration-300
        hover:shadow-purple-glow-sm hover:scale-105
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      {/* هاله پس‌زمینه */}
      <div className={`absolute inset-0 ${config.bgColor} rounded-2xl opacity-50`} />
      
      {/* نقطه وضعیت */}
      <div className="relative">
        <div className={`w-2 h-2 rounded-full ${config.color} ${config.shadowColor} animate-pulse`} />
        {status === 'connected' && (
          <div className={`absolute inset-0 ${config.color} rounded-full animate-ping`} />
        )}
      </div>
      
      {/* متن */}
      <span className="relative z-10 text-xs font-bold text-purple-900">
        {config.label}
      </span>
    </button>
  );
};

export default ConnectionStatusIndicator;

