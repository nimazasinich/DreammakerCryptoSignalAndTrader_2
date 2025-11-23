/**
 * SidebarErrorBoundary - کنترل خطا برای Sidebar
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Logger } from '../../core/Logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

const logger = Logger.getInstance();

export class SidebarErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Sidebar Error Boundary caught an error', {
      error: error.message,
      componentStack: errorInfo.componentStack,
    }, error);

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <aside className="w-full lg:w-sidebar glass-purple border-t border-purple-200/30 lg:border-t-0 lg:border-l shadow-glass-xl flex-shrink-0 lg:h-screen relative overflow-hidden flex flex-col">
          {/* هاله پس‌زمینه */}
          <div className="absolute -top-20 -right-10 w-40 h-40 bg-red-400/20 rounded-full blur-3xl animate-pulse-slow pointer-events-none" />
          
          <div className="flex-1 flex items-center justify-center p-6 relative z-10">
            <div className="text-center space-y-4 max-w-xs">
              {/* آیکون خطا */}
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-pink-500 text-white flex items-center justify-center shadow-lg animate-pulse">
                  <AlertTriangle className="w-8 h-8" />
                </div>
              </div>

              {/* پیام خطا */}
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-purple-900">
                  Navigation Error
                </h3>
                <p className="text-sm text-purple-600 font-medium">
                  Something went wrong with the sidebar navigation.
                </p>
              </div>

              {/* جزئیات خطا (فقط در حالت توسعه) */}
              {import.meta.env.DEV && this.state.error && (
                <div className="rounded-xl glass border border-red-400/40 bg-red-500/10 p-3 text-left">
                  <p className="text-xs text-red-700 font-mono break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              {/* دکمه بازنشانی */}
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-purple text-white font-semibold text-sm shadow-purple-glow-sm hover:shadow-purple-glow transition-all duration-300 hover:scale-105"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>

              {/* لینک پشتیبانی */}
              <p className="text-xs text-purple-500">
                If the problem persists, please contact support
              </p>
            </div>
          </div>
        </aside>
      );
    }

    return this.props.children;
  }
}

export default SidebarErrorBoundary;

