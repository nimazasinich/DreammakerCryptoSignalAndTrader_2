/**
 * DataSourceIcons - آیکون‌های SVG جذاب برای منابع داده
 */

import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

// آیکون Hugging Face (AI Robot)
export const HuggingFaceIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* سر ربات */}
    <path
      d="M12 2C8.13 2 5 5.13 5 9v6c0 3.87 3.13 7 7 7s7-3.13 7-7V9c0-3.87-3.13-7-7-7z"
      fill="currentColor"
      opacity="0.2"
    />
    {/* چشم چپ */}
    <circle cx="9" cy="10" r="1.5" fill="currentColor" />
    {/* چشم راست */}
    <circle cx="15" cy="10" r="1.5" fill="currentColor" />
    {/* دهان لبخند */}
    <path
      d="M8 14c0 2.21 1.79 4 4 4s4-1.79 4-4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
    {/* آنتن */}
    <path
      d="M12 2v2M9 3l-1-1M15 3l1-1"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    {/* بدنه */}
    <path
      d="M7 15v4a2 2 0 002 2h6a2 2 0 002-2v-4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

// آیکون Binance (Lightning Bolt)
export const BinanceIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* افکت درخشش */}
    <path
      d="M11 6l-2 3h3l-1 3"
      stroke="white"
      strokeWidth="1"
      strokeLinecap="round"
      opacity="0.5"
    />
  </svg>
);

// آیکون KuCoin (Rocket)
export const KuCoinIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* بدنه موشک */}
    <path
      d="M12 2l-2 4v12a2 2 0 002 2 2 2 0 002-2V6l-2-4z"
      fill="currentColor"
      opacity="0.3"
    />
    <path
      d="M12 2l-2 4v12a2 2 0 002 2 2 2 0 002-2V6l-2-4z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* پنجره */}
    <circle cx="12" cy="10" r="2" fill="currentColor" />
    {/* بال چپ */}
    <path
      d="M10 8L7 12v4l3-2V8z"
      fill="currentColor"
      opacity="0.5"
    />
    {/* بال راست */}
    <path
      d="M14 8l3 4v4l-3-2V8z"
      fill="currentColor"
      opacity="0.5"
    />
    {/* شعله */}
    <path
      d="M10 20c0 1 1 2 2 2s2-1 2-2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

// آیکون Mixed (Globe Network)
export const MixedIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* دایره اصلی */}
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
    {/* خطوط عمودی */}
    <path
      d="M12 3v18M8 3.5c-1.5 2-2.5 5.5-2.5 8.5s1 6.5 2.5 8.5M16 3.5c1.5 2 2.5 5.5 2.5 8.5s-1 6.5-2.5 8.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    {/* خطوط افقی */}
    <path
      d="M3 12h18M4.5 8h15M4.5 16h15"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    {/* نقاط اتصال */}
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    <circle cx="6" cy="12" r="1" fill="currentColor" opacity="0.5" />
    <circle cx="18" cy="12" r="1" fill="currentColor" opacity="0.5" />
  </svg>
);

// آیکون Environment (Server/Settings)
export const EnvironmentIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* سرور */}
    <rect
      x="3"
      y="4"
      width="18"
      height="5"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
      fill="currentColor"
      opacity="0.2"
    />
    <rect
      x="3"
      y="11"
      width="18"
      height="5"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
      fill="currentColor"
      opacity="0.2"
    />
    <rect
      x="3"
      y="18"
      width="18"
      height="2"
      rx="1"
      fill="currentColor"
      opacity="0.3"
    />
    {/* LED indicators */}
    <circle cx="6" cy="6.5" r="1" fill="currentColor" />
    <circle cx="9" cy="6.5" r="1" fill="currentColor" opacity="0.5" />
    <circle cx="6" cy="13.5" r="1" fill="currentColor" />
    <circle cx="9" cy="13.5" r="1" fill="currentColor" opacity="0.5" />
  </svg>
);

// آیکون Database (برای Active Source)
export const DatabaseIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <ellipse
      cx="12"
      cy="6"
      rx="8"
      ry="3"
      stroke="currentColor"
      strokeWidth="2"
      fill="currentColor"
      opacity="0.2"
    />
    <path
      d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
    <path
      d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
    {/* خطوط داده */}
    <path
      d="M8 9v3M12 9v3M16 9v3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.5"
    />
  </svg>
);

// آیکون Sparkles (برای HF Info)
export const SparklesIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M19 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z"
      fill="currentColor"
      opacity="0.7"
    />
    <path
      d="M6 16l.5 1.5L8 18l-1.5.5L6 20l-.5-1.5L4 18l1.5-.5L6 16z"
      fill="currentColor"
      opacity="0.5"
    />
  </svg>
);

// آیکون Check (برای انتخاب شده)
export const CheckIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M5 13l4 4L19 7"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// آیکون Warning (برای Override)
export const WarningIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M12 2L2 20h20L12 2z"
      fill="currentColor"
      opacity="0.2"
    />
    <path
      d="M12 2L2 20h20L12 2z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 9v4M12 17h.01"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

// آیکون Success (برای Environment Config)
export const SuccessIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      fill="currentColor"
      opacity="0.2"
    />
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M8 12l3 3 5-6"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// آیکون Info (برای اطلاعات)
export const InfoIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="2"
      fill="currentColor"
      opacity="0.1"
    />
    <path
      d="M12 16v-4M12 8h.01"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

export default {
  HuggingFaceIcon,
  BinanceIcon,
  KuCoinIcon,
  MixedIcon,
  EnvironmentIcon,
  DatabaseIcon,
  SparklesIcon,
  CheckIcon,
  WarningIcon,
  SuccessIcon,
  InfoIcon,
};

