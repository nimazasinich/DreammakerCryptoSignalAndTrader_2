// src/utils/additiveProviderRegistry.ts
// Additive Provider Registry - جلوگیری از overwrite و حذف providerهای موجود

import { Logger } from '../core/Logger.js';

const logger = Logger.getInstance();

/**
 * رجیستری ایمن برای Providerها
 * تضمین می‌کند که providerهای جدید فقط اضافه می‌شوند و هیچ provider موجودی حذف نمی‌شود
 */
export class AdditiveProviderRegistry<T> {
  private providers: Map<string, T> = new Map();

  constructor(private registryName: string = 'Provider') {}

  /**
   * افزودن provider جدید (فقط اگر قبلاً موجود نباشد)
   */
  register(name: string, provider: T, options?: { overwrite?: boolean }): boolean {
    const exists = this.providers.has(name);

    if (exists && !options?.overwrite) {
      logger.debug(`⏭️  ${this.registryName} '${name}' already exists, skipping (use overwrite: true to replace)`);
      return false;
    }

    if (exists && options?.overwrite) {
      logger.warn(`⚠️  ${this.registryName} '${name}' is being overwritten`);
    }

    this.providers.set(name, provider);
    logger.debug(`➕ Registered ${this.registryName}: ${name} ${exists ? '(replaced)' : '(new)'}`);
    return true;
  }

  /**
   * افزودن چند provider به صورت bulk (additive)
   */
  registerMany(providers: Array<{ name: string; provider: T }>, options?: { overwrite?: boolean }): number {
    let added = 0;
    for (const { name, provider } of providers) {
      if (this.register(name, provider, options)) {
        added++;
      }
    }
    logger.info(`✅ Registered ${added}/${providers.length} ${this.registryName}s (${this.providers.size} total)`);
    return added;
  }

  /**
   * دریافت provider با نام
   */
  get(name: string): T | undefined {
    return this.providers.get(name);
  }

  /**
   * دریافت همه providerها
   */
  getAll(): T[] {
    return Array.from(this.providers.values());
  }

  /**
   * دریافت نام همه providerها
   */
  getNames(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * تعداد providerها
   */
  count(): number {
    return this.providers.size;
  }

  /**
   * بررسی وجود provider
   */
  has(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * حذف provider (با اخطار)
   */
  unregister(name: string): boolean {
    if (!this.providers.has(name)) {
      logger.warn(`⚠️  Cannot unregister ${this.registryName} '${name}': not found`);
      return false;
    }

    logger.warn(`🗑️  Unregistering ${this.registryName}: ${name}`);
    this.providers.delete(name);
    return true;
  }

  /**
   * پاک کردن همه (با اخطار شدید)
   */
  clear(): void {
    const count = this.providers.size;
    logger.error(`🚨 CLEARING ALL ${this.registryName}s (${count} providers will be removed)`);
    this.providers.clear();
  }
}

/**
 * Helper برای merge کردن لیست‌های provider بدون حذف موجود
 */
export function mergeProviderLists<T>(
  existing: T[],
  newProviders: T[],
  getKey: (provider: T) => string,
  registryName = 'Provider'
): T[] {
  const merged = new Map<string, T>();

  // ابتدا موجودها را اضافه کن
  for (const provider of existing) {
    const key = getKey(provider);
    merged.set(key, provider);
  }

  const existingCount = merged.size;

  // سپس جدیدها را اضافه کن (فقط اگر تکراری نباشد)
  for (const provider of newProviders) {
    const key = getKey(provider);
    if (!merged.has(key)) {
      merged.set(key, provider);
      logger.debug(`➕ Merged ${registryName}: ${key}`);
    } else {
      logger.debug(`⏭️  Skipped duplicate ${registryName}: ${key}`);
    }
  }

  const addedCount = merged.size - existingCount;

  logger.info(`🔀 Merged ${registryName}s: ${existingCount} existing + ${addedCount} new = ${merged.size} total`);

  return Array.from(merged.values());
}

/**
 * Helper برای merge کردن آرایه‌های primitive بدون تکرار
 */
export function mergeUnique<T>(existing: T[], newItems: T[]): T[] {
  const set = new Set([...existing, ...newItems]);
  const result = Array.from(set);

  if ((result?.length || 0) > existing.length) {
    logger.debug(`🔀 Merged array: ${existing.length} + ${result.length - existing.length} = ${result.length} items`);
  }

  return result;
}

/**
 * مثال استفاده:
 *
 * // در MultiProviderMarketDataService:
 * import { AdditiveProviderRegistry, mergeProviderLists } from '../utils/additiveProviderRegistry.js';
 *
 * // استفاده از رجیستری:
 * const registry = new AdditiveProviderRegistry<ProviderFn>('MarketData');
 *
 * registry.register('CoinGecko', () => this.getPricesFromCoinGecko(symbols));
 * registry.register('Binance', () => this.getPricesFromBinance(symbols));
 * // ... سایر providerها
 *
 * // یا استفاده از merge:
 * const coreProviders = [
 *   { name: 'CoinGecko', fn: () => this.getPricesFromCoinGecko(symbols) },
 *   { name: 'Binance', fn: () => this.getPricesFromBinance(symbols) }
 * ];
 *
 * const optionalProviders = [
 *   { name: 'NewsAPI', fn: () => this.getNewsFromNewsAPI() },
 *   { name: 'Santiment', fn: () => this.getSentimentFromSantiment() }
 * ];
 *
 * // ادغام بدون حذف:
 * const allProviders = mergeProviderLists(
 *   coreProviders,
 *   optionalProviders,
 *   (p) => p.name,
 *   'MarketDataProvider'
 * );
 */
