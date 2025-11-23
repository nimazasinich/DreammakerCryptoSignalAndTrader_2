import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'white';
  className?: string;
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'primary',
  className = '',
  text
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  const colorClasses = {
    primary: 'text-blue-400',
    secondary: 'text-slate-400',
    white: 'text-white'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div 
        className={`animate-spin rounded-full border-2 border-t-transparent ${sizeClasses[size]} ${colorClasses[color]}`}
        style={{
          borderColor: color === 'primary' ? 'rgba(96, 165, 250, 0.3)' : color === 'white' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(148, 163, 184, 0.3)',
          borderTopColor: color === 'primary' ? 'rgb(96, 165, 250)' : color === 'white' ? 'rgb(255, 255, 255)' : 'rgb(148, 163, 184)'
        }}
      />
      {text && (
        <p className={`mt-3 text-sm font-medium ${colorClasses[color]}`} style={{
          textShadow: color === 'primary' ? '0 0 10px rgba(96, 165, 250, 0.5)' : undefined
        }}>
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;