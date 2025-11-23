import React, { ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'gradient' | 'solid';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  borderGlow?: boolean;
  gradientColors?: string;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  hoverable = false,
  borderGlow = false,
  gradientColors,
  onClick
}) => {
  const baseStyles = 'rounded-xl transition-all duration-300';

  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const variantStyles = {
    default: 'bg-white/5 border border-white/10 backdrop-blur-sm',
    glass: 'bg-white/10 border border-white/20 backdrop-blur-md',
    gradient: `bg-gradient-to-br ${gradientColors || 'from-blue-500/10 via-purple-500/10 to-pink-500/10'} border border-white/20`,
    solid: 'bg-[#0f0f18] border border-white/10'
  };
  
  const hoverStyles = hoverable ? 'hover:scale-[1.02] hover:bg-white/8 cursor-pointer' : '';

  const glowStyles = borderGlow ? {
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(59, 130, 246, 0.15)',
    border: '1px solid rgba(59, 130, 246, 0.3)'
  } : undefined;

  const combinedStyles = `${baseStyles} ${paddingStyles[padding]} ${variantStyles[variant]} ${hoverStyles} ${className}`;

  return (
    <div 
      className={combinedStyles}
      style={glowStyles}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;
