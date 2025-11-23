import React from 'react';

interface RiskGaugeProps {
  value: number;  // 0-100
  label: string;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({
  value,
  label,
  size = 'md',
  showValue = true
}) => {
  const clampedValue = Math.max(0, Math.min(100, value));

  // Color based on risk level
  const getColor = (val: number): string => {
    if (val < 30) return '#10b981'; // green
    if (val < 60) return '#f59e0b'; // amber
    if (val < 80) return '#ef4444'; // red
    return '#dc2626'; // dark red
  };

  const color = getColor(clampedValue);

  // Size dimensions
  const dimensions = {
    sm: { radius: 40, strokeWidth: 8, fontSize: 'text-lg' },
    md: { radius: 50, strokeWidth: 10, fontSize: 'text-2xl' },
    lg: { radius: 60, strokeWidth: 12, fontSize: 'text-3xl' }
  };

  const { radius, strokeWidth, fontSize } = dimensions[size];
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clampedValue / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative inline-flex items-center justify-center">
        <svg
          width={radius * 2 + strokeWidth * 2}
          height={radius * 2 + strokeWidth * 2}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
          />

          {/* Animated progress circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 1s ease-in-out, stroke 0.5s ease',
              filter: `drop-shadow(0 0 8px ${color})`
            }}
          />
        </svg>

        {/* Center value */}
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={`${fontSize} font-bold`}
              style={{ color }}
            >
              {Math.round(clampedValue)}
            </span>
          </div>
        )}
      </div>

      {/* Label */}
      <p className="mt-2 text-sm text-gray-400 text-center">{label}</p>
    </div>
  );
};
