import React, { useEffect, useState } from 'react';
import { TrendingUp, Zap, Activity } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  showProgress?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading Dreammaker Crypto Trader',
  showProgress = false
}) => {
  const [progress, setProgress] = useState(0);
  const [dots, setDots] = useState('');

  // Animate dots for loading text
  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => (prev?.length || 0) >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(dotsInterval);
  }, []);

  // Simulate progress if needed
  useEffect(() => {
    if (!showProgress) { console.warn("Missing data"); }

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 10;
      });
    }, 300);

    return () => clearInterval(progressInterval);
  }, [showProgress]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-surface-page via-surface to-surface-muted dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-75" />
      </div>

      {/* Main loading content */}
      <div className="relative z-10 flex flex-col items-center gap-8 p-8">
        {/* Logo/Icon section with animation */}
        <div className="relative">
          {/* Outer rotating ring */}
          <div className="absolute inset-0 w-32 h-32 border-4 border-primary-500/30 rounded-full animate-spin"
               style={{ animationDuration: '3s' }} />

          {/* Inner rotating ring */}
          <div className="absolute inset-2 w-28 h-28 border-4 border-blue-500/30 rounded-full animate-spin"
               style={{ animationDuration: '2s', animationDirection: 'reverse' }} />

          {/* Center icon container */}
          <div className="relative w-32 h-32 flex items-center justify-center">
            <div className="absolute inset-4 bg-gradient-to-br from-primary-500 to-blue-500 rounded-full opacity-20 animate-pulse" />

            {/* Icons */}
            <div className="relative flex items-center justify-center gap-1">
              <TrendingUp className="w-10 h-10 text-primary-600 dark:text-primary-400 animate-bounce"
                          style={{ animationDuration: '2s', animationDelay: '0s' }} />
              <Zap className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-bounce"
                   style={{ animationDuration: '2s', animationDelay: '0.2s' }} />
              <Activity className="w-10 h-10 text-primary-600 dark:text-primary-400 animate-bounce"
                        style={{ animationDuration: '2s', animationDelay: '0.4s' }} />
            </div>
          </div>
        </div>

        {/* App name */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-transparent">
            Dreammaker
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">
            Crypto Signal & Trader
          </p>
        </div>

        {/* Loading message with animated dots */}
        <div className="flex flex-col items-center gap-4 min-h-[60px]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {message}
            <span className="inline-block w-8 text-left">{dots}</span>
          </p>

          {/* Progress bar (if enabled) */}
          {showProgress && (
            <div className="w-64 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-blue-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Spinner dots alternative */}
          {!showProgress && (
            <div className="flex gap-2">
              <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"
                   style={{ animationDelay: '0s' }} />
              <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"
                   style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"
                   style={{ animationDelay: '0.4s' }} />
            </div>
          )}
        </div>

        {/* Optional tagline */}
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center max-w-xs">
          Powered by advanced algorithms and real-time market analysis
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
