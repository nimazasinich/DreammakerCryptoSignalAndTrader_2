/**
 * Resource Controller - کنترل کامل درخواست‌های منابع
 * جلوگیری از درخواست‌های بی‌رویه در initial load
 */

export type Priority = 'critical' | 'high' | 'normal' | 'low';

interface QueuedRequest {
  id: string;
  priority: Priority;
  fn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
}

interface ResourceControllerConfig {
  maxConcurrent: number;           // حداکثر درخواست همزمان
  maxRequestsPerSecond: number;    // حداکثر درخواست در ثانیه
  initialLoadDelay: number;        // تاخیر برای initial load
  enableLazyLoading: boolean;      // فعال‌سازی lazy loading
}

export class ResourceController {
  private static instance: ResourceController;
  private queue: QueuedRequest[] = [];
  private activeRequests: Set<string> = new Set();
  private requestHistory: number[] = []; // timestamps
  private isInitialLoad: boolean = true;
  private initialLoadComplete: boolean = false;
  
  private config: ResourceControllerConfig = {
    maxConcurrent: 3,              // فقط 3 درخواست همزمان در initial load
    maxRequestsPerSecond: 5,       // حداکثر 5 درخواست در ثانیه
    initialLoadDelay: 500,         // 500ms تاخیر بین درخواست‌ها
    enableLazyLoading: true,
  };

  private constructor() {
    // بعد از 10 ثانیه، initial load تمام شده
    setTimeout(() => {
      this.isInitialLoad = false;
      this.initialLoadComplete = true;
      // افزایش محدودیت‌ها بعد از initial load
      this.config.maxConcurrent = 6;
      this.config.maxRequestsPerSecond = 10;
      this.config.initialLoadDelay = 200;
      this.processQueue(); // شروع مجدد queue
    }, 10000);
  }

  static getInstance(): ResourceController {
    if (!ResourceController.instance) {
      ResourceController.instance = new ResourceController();
    }
    return ResourceController.instance;
  }

  /**
   * ثبت یک درخواست با priority
   */
  async request<T>(
    id: string,
    fn: () => Promise<T>,
    priority: Priority = 'normal'
  ): Promise<T> {
    // اگر در initial load هستیم و priority پایین است، defer کن
    if (this.isInitialLoad && (priority === 'low' || priority === 'normal')) {
      if (this.config.enableLazyLoading) {
        console.log(`🔄 Deferring ${id} (priority: ${priority}) until after initial load`);
        // defer تا بعد از initial load
        await this.waitForInitialLoad();
      }
    }

    return new Promise<T>((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id,
        priority,
        fn,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      // اضافه کردن به queue بر اساس priority
      this.addToQueue(queuedRequest);
      this.processQueue();
    });
  }

  /**
   * اضافه کردن به queue با مرتب‌سازی بر اساس priority
   */
  private addToQueue(request: QueuedRequest): void {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    
    // پیدا کردن جایگاه مناسب در queue
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      if (priorityOrder[request.priority] < priorityOrder[this.queue[i].priority]) {
        insertIndex = i;
        break;
      }
    }
    
    this.queue.splice(insertIndex, 0, request);
    console.log(`📋 Queued: ${request.id} (priority: ${request.priority}, queue size: ${this.queue.length})`);
  }

  /**
   * پردازش queue
   */
  private async processQueue(): Promise<void> {
    // بررسی محدودیت‌ها
    if (!this.canProcessMore()) {
      return;
    }

    // دریافت درخواست بعدی
    const request = this.queue.shift();
    if (!request) {
      return;
    }

    // بررسی rate limit
    await this.enforceRateLimit();

    // اجرای درخواست
    this.activeRequests.add(request.id);
    this.requestHistory.push(Date.now());

    console.log(`🚀 Processing: ${request.id} (active: ${this.activeRequests.size}/${this.config.maxConcurrent})`);

    try {
      const result = await request.fn();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    } finally {
      this.activeRequests.delete(request.id);
      
      // تاخیر بین درخواست‌ها در initial load
      if (this.isInitialLoad) {
        await this.sleep(this.config.initialLoadDelay);
      }
      
      // پردازش درخواست بعدی
      this.processQueue();
    }
  }

  /**
   * بررسی اینکه آیا می‌توان درخواست بیشتری پردازش کرد
   */
  private canProcessMore(): boolean {
    // بررسی تعداد درخواست‌های همزمان
    if (this.activeRequests.size >= this.config.maxConcurrent) {
      return false;
    }

    // بررسی rate limit
    const now = Date.now();
    const recentRequests = this.requestHistory.filter(t => now - t < 1000);
    if (recentRequests.length >= this.config.maxRequestsPerSecond) {
      return false;
    }

    return true;
  }

  /**
   * اعمال rate limit
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    
    // پاک کردن history قدیمی
    this.requestHistory = this.requestHistory.filter(t => t > oneSecondAgo);
    
    // بررسی تعداد درخواست‌ها در ثانیه گذشته
    const recentCount = this.requestHistory.length;
    
    if (recentCount >= this.config.maxRequestsPerSecond) {
      // محاسبه زمان انتظار
      const oldestRecent = this.requestHistory[0];
      const waitTime = 1000 - (now - oldestRecent) + 100; // +100ms buffer
      
      if (waitTime > 0) {
        console.log(`⏳ Rate limit: waiting ${waitTime}ms`);
        await this.sleep(waitTime);
      }
    }
  }

  /**
   * انتظار تا اتمام initial load
   */
  private async waitForInitialLoad(): Promise<void> {
    return new Promise(resolve => {
      if (this.initialLoadComplete) {
        resolve();
        return;
      }
      
      const checkInterval = setInterval(() => {
        if (this.initialLoadComplete) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 500);
    });
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * دریافت وضعیت فعلی
   */
  getStatus() {
    return {
      isInitialLoad: this.isInitialLoad,
      queueSize: this.queue.length,
      activeRequests: this.activeRequests.size,
      maxConcurrent: this.config.maxConcurrent,
      recentRequestsPerSecond: this.requestHistory.filter(
        t => Date.now() - t < 1000
      ).length,
    };
  }

  /**
   * پاک کردن queue
   */
  clearQueue(): void {
    this.queue = [];
    console.log('🗑️ Queue cleared');
  }

  /**
   * تغییر تنظیمات
   */
  updateConfig(config: Partial<ResourceControllerConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('⚙️ Config updated:', this.config);
  }
}

// Export singleton
export const resourceController = ResourceController.getInstance();

