/**
 * GlassCard - کارت شیشه‌ای با افکت‌های بنفش و انیمیشن
 */

import React, { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  gradient?: boolean;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hover = true,
  glow = false,
  gradient = false,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden
        rounded-3xl
        ${gradient ? 'glass-purple' : 'glass'}
        border border-purple-200/40
        p-6
        transition-all duration-500
        ${hover ? 'hover:shadow-glass-lg hover:-translate-y-2 hover:border-purple-300/60' : ''}
        ${glow ? 'shadow-purple-glow-sm' : 'shadow-glass'}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {/* هاله پس‌زمینه */}
      {glow && (
        <>
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-400/20 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/15 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        </>
      )}
      
      {/* افکت درخشش در hover */}
      {hover && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
      )}
      
      {/* محتوا */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

/**
 * کارت با هدر
 */
interface GlassCardWithHeaderProps extends GlassCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export const GlassCardWithHeader: React.FC<GlassCardWithHeaderProps> = ({
  title,
  subtitle,
  icon,
  action,
  children,
  ...props
}) => {
  return (
    <GlassCard {...props}>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-purple text-white shadow-purple-glow-sm">
              {icon}
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-purple-900 flex items-center gap-2">
              {title}
            </h3>
            {subtitle && (
              <p className="text-sm text-purple-600 font-medium mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </GlassCard>
  );
};

/**
 * کارت آماری
 */
interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: ReactNode;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  changeType = 'neutral',
  icon,
  className = '',
}) => {
  const changeColors = {
    positive: 'text-green-600 bg-green-50',
    negative: 'text-red-600 bg-red-50',
    neutral: 'text-purple-600 bg-purple-50',
  };

  return (
    <GlassCard hover glow className={className}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-bold text-purple-600 uppercase tracking-wider mb-2">
            {label}
          </p>
          <p className="text-3xl font-bold text-purple-900 mb-2">
            {value}
          </p>
          {change && (
            <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${changeColors[changeType]}`}>
              {changeType === 'positive' && '↗'}
              {changeType === 'negative' && '↘'}
              {changeType === 'neutral' && '→'}
              <span>{change}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-purple text-white shadow-purple-glow-sm animate-float">
            {icon}
          </div>
        )}
      </div>
    </GlassCard>
  );
};

export default GlassCard;

