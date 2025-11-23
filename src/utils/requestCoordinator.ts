/**
 * Request Coordinator - جلوگیری از race conditions و درخواست‌های تکراری
 * این ماژول از درخواست‌های همزمان برای یک resource جلوگیری می‌کند
 */

type PendingRequest<T> = Promise<T>;

export class RequestCoordinator {
  private static instance: RequestCoordinator;
  private pendingRequests: Map<string, PendingRequest<any>> = new Map();
  private requestLocks: Map<string, boolean> = new Map();

  private constructor() {}

  static getInstance(): RequestCoordinator {
    if (!RequestCoordinator.instance) {
      RequestCoordinator.instance = new RequestCoordinator();
    }
    return RequestCoordinator.instance;
  }

  /**
   * همگام‌سازی درخواست‌ها - اگر درخواست مشابهی در حال انجام است، منتظر می‌ماند
   */
  async coordinate<T>(
    key: string,
    fetchFn: () => Promise<T>,
    timeoutMs: number = 30000
  ): Promise<T> {
    // اگر درخواست قبلی در حال انجام است، منتظر نتیجه آن می‌مانیم
    if (this.pendingRequests.has(key)) {
      try {
        return await this.pendingRequests.get(key)!;
      } catch (error) {
        // اگر درخواست قبلی failed شد، دوباره تلاش می‌کنیم
        this.pendingRequests.delete(key);
        this.requestLocks.delete(key);
      }
    }

    // ایجاد درخواست جدید
    const requestPromise = this.executeWithTimeout(fetchFn, timeoutMs);
    this.pendingRequests.set(key, requestPromise);
    this.requestLocks.set(key, true);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // پاک کردن درخواست از pending list بعد از اتمام
      setTimeout(() => {
        this.pendingRequests.delete(key);
        this.requestLocks.delete(key);
      }, 100); // کمی تاخیر برای اینکه درخواست‌های همزمان بتوانند از نتیجه استفاده کنند
    }
  }

  /**
   * اجرای درخواست با timeout
   */
  private async executeWithTimeout<T>(
    fetchFn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fetchFn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      ),
    ]);
  }

  /**
   * پاک کردن همه درخواست‌های pending
   */
  clearAll(): void {
    this.pendingRequests.clear();
    this.requestLocks.clear();
  }

  /**
   * بررسی وضعیت یک درخواست
   */
  isPending(key: string): boolean {
    return this.pendingRequests.has(key);
  }

  /**
   * دریافت تعداد درخواست‌های در حال انجام
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }
}

// Export singleton instance
export const requestCoordinator = RequestCoordinator.getInstance();

