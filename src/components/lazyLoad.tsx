import React from 'react';

// Lightweight loading fallback for view transitions
const ViewLoadingFallback: React.FC<{ name: string }> = ({ name }) => (
  <div role="status" aria-live="polite" className="flex items-center justify-center min-h-[400px]">
    <div className="text-center space-y-4">
      <div className="flex justify-center gap-2">
        <div className="w-3 h-3 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
        <div className="w-3 h-3 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        <div className="w-3 h-3 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">Loading {name}...</p>
    </div>
  </div>
);

export function lazyLoad<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T } | { [key: string]: T }>,
  name: string
) {
  const Cmp = React.lazy(() =>
    importFn().then(module => {
      // If module has the named export matching 'name', use it as default
      if (name in module && !(module as any).default) {
        return { default: (module as any)[name] };
      }
      // Otherwise use default export as-is
      return module as { default: T };
    })
  );
  return function Wrapped(props: React.ComponentProps<T>) {
    return (
      <React.Suspense fallback={<ViewLoadingFallback name={name} />}>
        <ErrorBoundary name={name}>
          <Cmp {...props} />
        </ErrorBoundary>
      </React.Suspense>
    );
  };
}

class ErrorBoundary extends React.Component<{ name: string; children: React.ReactNode }, { error?: Error }> {
  state = { error: undefined as Error | undefined };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div role="alert" style={{ padding: 12, border: '1px solid #fca5a5', borderRadius: 8 }}>
          Failed to load "{this.props.name}".
          <div style={{ marginTop: 6, fontSize: 12, direction: 'ltr' }}>
            {this.state.error.message}
          </div>
        </div>
      );
    }
    return this.props.children as any;
  }
}

