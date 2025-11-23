// Throttled logging utility to prevent log spam
const lastLogAt: Record<string, number> = {};
let cleanupInterval: NodeJS.Timeout | null = null;

export function logThrottled(key: string, callback: () => void, minMs = 60000): void {
  const now = Date.now();
  if (!lastLogAt[key] || (now - lastLogAt[key]) > minMs) {
    lastLogAt[key] = now;
    callback();
  }
  
  // Initialize cleanup interval only once
  if (!cleanupInterval && typeof window !== 'undefined') {
    cleanupInterval = setInterval(clearThrottledLogs, 30 * 60 * 1000);
    
    // Cleanup on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (cleanupInterval) {
          clearInterval(cleanupInterval);
          cleanupInterval = null;
        }
      });
    }
  }
}

// Clear old log entries to prevent memory leak
export function clearThrottledLogs(): void {
  const now = Date.now();
  const maxAge = 3600000; // 1 hour
  
  for (const key in lastLogAt) {
    if ((now - lastLogAt[key]) > maxAge) {
      delete lastLogAt[key];
    }
  }
}

// Export cleanup function for manual cleanup if needed
export function cleanupLogThrottle(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  clearThrottledLogs();
}

