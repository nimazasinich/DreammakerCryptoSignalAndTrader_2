import React, { ReactNode } from 'react';
import { Skeleton } from './Skeleton';

interface ResponseHandlerProps<T> {
  isLoading: boolean;
  error: Error | null;
  data: T | null;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
  emptyComponent?: ReactNode;
  children: (data: T) => ReactNode;
  isEmpty?: (data: T) => boolean;
  onRetry?: () => void;
}

function ResponseHandler<T>({
  isLoading,
  error,
  data,
  loadingComponent,
  errorComponent,
  emptyComponent,
  children,
  isEmpty = (data) => !data || (Array.isArray(data) && data.length === 0),
  onRetry
}: ResponseHandlerProps<T>) {
  if (isLoading) {
    return loadingComponent ? (
      <>{loadingComponent}</>
    ) : (
      <div className="space-y-3 rounded-2xl border border-border/60 bg-surface/60 p-6">
        <Skeleton width="30%" height="1.25rem" />
        <Skeleton width="80%" />
        <Skeleton width="100%" />
        <Skeleton width="60%" />
      </div>
    );
  }

  if (error) {
    return errorComponent ? (
      <>{errorComponent}</>
    ) : (
      <div className="relative p-6 rounded-xl overflow-hidden" style={{
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        boxShadow: '0 8px 32px rgba(239, 68, 68, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.1)'
      }}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent" />
        <div className="relative z-10">
          <h3 className="text-lg font-semibold bg-gradient-to-r from-red-400 to-red-300 bg-clip-text text-transparent mb-2">
            Error
          </h3>
          <p className="text-sm text-red-300/80 mb-4">{error.message || 'An unexpected error occurred'}</p>
          {onRetry && (
            <button
              className="px-5 py-2 rounded-lg font-semibold text-sm transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(220, 38, 38, 0.9) 100%)',
                color: 'white',
                boxShadow: '0 4px 16px rgba(239, 68, 68, 0.4)'
              }}
              onClick={onRetry}
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!data || (isEmpty && isEmpty(data))) {
    return emptyComponent ? (
      <>{emptyComponent}</>
    ) : (
      <div className="relative p-6 rounded-xl text-center overflow-hidden" style={{
        background: 'linear-gradient(135deg, rgba(100, 116, 139, 0.1) 0%, rgba(71, 85, 105, 0.1) 100%)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
      }}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent" />
        <div className="relative z-10">
          <p className="text-slate-400 mb-2">No data available yet</p>
          <p className="text-slate-500 text-sm">Data will appear when backend provides it</p>
        </div>
      </div>
    );
  }

  return <>{children(data)}</>;
}

export default ResponseHandler;