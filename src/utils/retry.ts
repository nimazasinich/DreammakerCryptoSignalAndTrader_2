// src/utils/retry.ts
export interface RetryOptions {
    retries?: number;
    baseMs?: number;
    factor?: number;
    maxMs?: number;
    jitter?: number;
    shouldRetry?: (error: any) => boolean;
}

export async function backoffRetry<T>(
    fn: () => Promise<T>,
    opts: RetryOptions = {}
): Promise<T> {
    const {
        retries = 4,
        baseMs = 500,
        factor = 2,
        maxMs = 8000,
        jitter = 0.25,
        shouldRetry = (error: any) => {
            // Don't retry on 404 errors (Not Found)
            if (error?.status === 404 || error?.statusCode === 404) {
                return false;
            }
            // Don't retry on 401/403 errors (Unauthorized/Forbidden)
            if (error?.status === 401 || error?.status === 403 ||
                error?.statusCode === 401 || error?.statusCode === 403) {
                return false;
            }
            return true;
        }
    } = opts;

    let attempt = 0;
    let delay = baseMs;

    while (true) {
        try {
            return await fn();
        } catch (err: any) {
            attempt++;

            // Check if we should retry this error
            if (!shouldRetry(err)) {
                throw err;
            }

            if (attempt > retries) throw err;

            const jitterAmount = delay * jitter * (Math.random() * 2 - 1);
            const sleepMs = Math.min(maxMs, Math.max(0, delay + jitterAmount));

            await new Promise(r => setTimeout(r, sleepMs));
            delay = Math.min(maxMs, delay * factor);
        }
    }
}

// Simplified retry function with delay and backoff options
export async function retry<T>(
    fn: () => Promise<T>,
    options: {
        retries?: number;
        delay?: number;
        backoff?: number;
        shouldRetry?: (error: any) => boolean;
    } = {}
): Promise<T> {
    const {
        retries = 3,
        delay: baseDelay = 1000,
        backoff: factor = 2,
        shouldRetry
    } = options;

    return backoffRetry(fn, {
        retries,
        baseMs: baseDelay,
        factor,
        maxMs: 10000,
        jitter: 0.1,
        shouldRetry
    });
}


