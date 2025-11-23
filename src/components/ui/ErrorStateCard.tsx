import React from 'react';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

interface ErrorStateCardProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export function ErrorStateCard({
  title = 'Something went wrong',
  message = 'We could not complete this request.',
  onRetry,
  retryLabel = 'Retry',
  hint,
  icon,
}: ErrorStateCardProps) {
  const { isOnline } = useOnlineStatus();

  return (
    <div className="rounded-2xl border border-red-200/40 bg-gradient-to-br from-red-500/5 via-red-500/10 to-red-500/5 p-5 shadow-lg shadow-red-900/5 backdrop-blur">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
          {icon ?? <AlertTriangle className="h-5 w-5" />}
        </div>
        <div>
          <p className="text-base font-semibold text-red-300">{isOnline ? title : 'You are offline'}</p>
          <p className="text-sm text-red-200/80">
            {isOnline ? message : 'Reconnect to the internet and we will resume automatically.'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={!isOnline}
            className="inline-flex items-center gap-2 rounded-lg border border-red-400/30 px-4 py-2 text-sm font-semibold text-red-100 shadow-sm transition hover:border-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isOnline ? (
              <>
                <RefreshCw className="h-4 w-4" />
                {retryLabel}
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4" />
                Waiting for connection…
              </>
            )}
          </button>
        )}
        {hint && (
          <span className="text-xs text-red-200/70" role="status">
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}

export default ErrorStateCard;

