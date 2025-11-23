import React, { lazy, Suspense, ComponentType } from 'react';
import { Logger } from '../core/Logger.js';
import LoadingSpinner from '../components/ui/LoadingSpinner';

/**
 * Lazy load a component with a loading fallback
 * @param importFunc Dynamic import function
 * @param fallback Optional custom fallback component
 * @returns Lazy loaded component
 */

const logger = Logger.getInstance();

export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback: React.ReactNode = <LoadingSpinner size="medium" />
) {
  const LazyComponent = lazy(() => {
    return importFunc().catch((error) => {
      logger.error('Failed to lazy load component:', {}, error);
      logger.error('Import function details:', { importFunc: importFunc.toString() });
      // Return a fallback component that displays an error
      return {
        default: ((() => {
          const FallbackComponent: ComponentType<any> = () => (
            <div className="p-8 text-center">
              <div className="text-red-400 mb-4">Failed to load component</div>
              <div className="text-slate-400 text-sm">{error.message || String(error)}</div>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
              >
                Reload Page
              </button>
            </div>
          );
          FallbackComponent.displayName = 'LazyLoadError';
          return FallbackComponent;
        })()) as T
      };
    });
  });
  
  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

/**
 * Lazy load a component with retry capability
 * @param importFunc Dynamic import function
 * @param fallback Optional custom fallback component
 * @param retries Number of retries
 * @returns Lazy loaded component with retry
 */
export function lazyLoadWithRetry<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback: React.ReactNode = <LoadingSpinner size="medium" />,
  retries: number = 3
) {
  const LazyComponent = lazy(() => {
    return retryImport(importFunc, retries);
  });
  
  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

/**
 * Retry a dynamic import
 * @param importFunc Dynamic import function
 * @param retries Number of retries
 * @param delay Delay between retries in ms
 * @param backoff Backoff factor
 * @returns Promise with the module
 */
async function retryImport<T>(
  importFunc: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000,
  backoff: number = 2
): Promise<T> {
  try {
    return await importFunc();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return retryImport(importFunc, retries - 1, delay * backoff, backoff);
  }
}

/**
 * Prefetch a component to improve perceived performance
 * @param importFunc Dynamic import function
 */
export function prefetchComponent(importFunc: () => Promise<any>): void {
  importFunc().catch(() => {
    // Silently catch errors during prefetch
  });
}

/**
 * Create a component that will be loaded only when it becomes visible in the viewport
 * @param importFunc Dynamic import function
 * @param options Intersection observer options
 * @returns Component that loads when visible
 */
export function lazyLoadOnVisible<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: IntersectionObserverInit = { rootMargin: '200px' }
) {
  return function LazyOnVisible(props: React.ComponentProps<T>) {
    const [isVisible, setIsVisible] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);
    
    React.useEffect(() => {
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      }, options);
      
      if (ref.current) {
        observer.observe(ref.current);
      }
      
      return () => {
        observer.disconnect();
      };
    }, []);
    
    return (
      <div ref={ref} style={{ minHeight: '10px' }}>
        {isVisible ? lazyLoad(importFunc)(props) : <div style={{ height: '100%', width: '100%' }} />}
      </div>
    );
  };
}