/**
 * GlassIcon - آیکون‌های SVG سفارشی با افکت شیشه‌ای و هاله بنفش
 */

import React from 'react';

export type IconName = 
  | 'dashboard'
  | 'chart'
  | 'market'
  | 'scanner'
  | 'trading'
  | 'portfolio'
  | 'settings'
  | 'health'
  | 'risk'
  | 'strategy'
  | 'futures'
  | 'positions';

interface GlassIconProps {
  name: IconName;
  size?: number;
  className?: string;
  withGlow?: boolean;
  animated?: boolean;
}

const iconPaths: Record<IconName, string> = {
  dashboard: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  market: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  scanner: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  trading: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  portfolio: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  health: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  risk: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  strategy: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  futures: 'M13 10V3L4 14h7v7l9-11h-7z',
  positions: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
};

export const GlassIcon: React.FC<GlassIconProps> = ({
  name,
  size = 24,
  className = '',
  withGlow = false,
  animated = false,
}) => {
  const path = iconPaths[name];

  return (
    <div
      className={`
        relative inline-flex items-center justify-center
        ${animated ? 'animate-float' : ''}
        ${className}
      `}
      style={{ width: size, height: size }}
    >
      {/* هاله بنفش */}
      {withGlow && (
        <div
          className="absolute inset-0 rounded-full bg-purple-500/20 blur-xl animate-pulse-purple"
          style={{ width: size * 1.5, height: size * 1.5, left: -size * 0.25, top: -size * 0.25 }}
        />
      )}
      
      {/* آیکون SVG */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative z-10 drop-shadow-lg"
      >
        <path d={path} />
      </svg>
    </div>
  );
};

/**
 * آیکون با افکت شیشه‌ای کامل
 */
export const GlassIconButton: React.FC<GlassIconProps & { onClick?: () => void; active?: boolean }> = ({
  name,
  size = 24,
  className = '',
  withGlow = true,
  animated = false,
  onClick,
  active = false,
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        group relative
        flex items-center justify-center
        w-12 h-12 rounded-2xl
        glass
        border border-purple-200/30
        transition-all duration-300
        hover:scale-110 hover:shadow-purple-glow-sm
        ${active ? 'bg-gradient-purple text-white shadow-purple-glow-sm' : 'text-purple-600'}
        ${animated ? 'animate-float' : ''}
        ${className}
      `}
    >
      {/* هاله پس‌زمینه */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-radial-purple opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* آیکون */}
      <GlassIcon
        name={name}
        size={size}
        withGlow={withGlow && active}
        className="relative z-10"
      />
      
      {/* افکت درخشش */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </button>
  );
};

export default GlassIcon;

