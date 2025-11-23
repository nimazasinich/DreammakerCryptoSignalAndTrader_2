import React, { Component, ErrorInfo, ReactNode } from 'react';

import { Logger } from '../../core/Logger.js';
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const logger = Logger.getInstance();
    
    logger.error('Error caught by ErrorBoundary:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    }, error);
    
    if (import.meta.env.DEV) {
      console.group('ErrorBoundary Details');
      logger.error('Error details:', {}, error);
      logger.error('Error info:', { componentStack: errorInfo.componentStack }, errorInfo as any);
      console.groupEnd();
    }
    
    this.props.onError?.(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="relative p-8 rounded-xl overflow-hidden" style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.1)'
        }}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center" style={{
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)'
              }}>
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-red-400 to-red-300 bg-clip-text text-transparent">
                Something went wrong
              </h2>
            </div>
            <p className="text-sm text-red-300/80 mb-6">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button 
              type="button"
              className="px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(220, 38, 38, 0.9) 100%)',
                color: 'white',
                boxShadow: '0 4px 16px rgba(239, 68, 68, 0.4)'
              }}
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;