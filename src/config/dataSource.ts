// Default HuggingFace Space URL - this is REMOTE, not localhost!
const DEFAULT_ENGINE_BASE = 'https://really-amin-datasourceforcryptocurrency.hf.space';
const AVAILABLE_SOURCES = ['huggingface', 'binance', 'kucoin', 'mixed'] as const;

export type DataSourceType = typeof AVAILABLE_SOURCES[number];

export interface ProviderConfig {
  enabled: boolean;
  baseUrl?: string;
  timeout?: number;
  notes?: string;
}

export interface DataSourceConfig {
  primarySource: DataSourceType;
  availableSources: DataSourceType[];
  overrides: {
    primarySource: DataSourceType | null;
  };
  huggingface: ProviderConfig & {
    baseUrl: string;
    timeout: number;
    userAgent: string;
  };
  binance: ProviderConfig;
  kucoin: ProviderConfig;
  mixed: ProviderConfig & {
    strategy: 'balanced' | 'failover';
  };
}

const normalizeBaseUrl = (value?: string): string => {
  if (!value) {
    return DEFAULT_ENGINE_BASE;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_ENGINE_BASE;
  }

  return trimmed.replace(/\/+$/, '');
};

const normalizeSource = (value?: string): DataSourceType => {
  const normalized = (value || '').toLowerCase();
  if (AVAILABLE_SOURCES.includes(normalized as DataSourceType)) {
    return normalized as DataSourceType;
  }
  return 'huggingface';
};

const toBoolean = (value: string | undefined, fallback = true): boolean => {
  if (value === undefined || value === null) {
    return fallback;
  }
  const normalized = value.toString().trim().toLowerCase();
  if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) {
    return false;
  }
  return fallback;
};

const toInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

let primarySourceOverride: DataSourceType | null = null;

export const setPrimaryDataSourceOverride = (source: DataSourceType | null): DataSourceType => {
  primarySourceOverride = source;
  return getPrimaryDataSource();
};

export const clearPrimaryDataSourceOverride = (): void => {
  primarySourceOverride = null;
};

export const getPrimaryDataSource = (): DataSourceType =>
  primarySourceOverride ?? normalizeSource(process.env.PRIMARY_DATA_SOURCE);

export const getAvailableDataSources = (): DataSourceType[] => [...AVAILABLE_SOURCES];

export const getHuggingFaceBaseUrl = (): string => {
  const baseUrl = normalizeBaseUrl(process.env.HF_ENGINE_BASE_URL);
  
  // Warn if accidentally using localhost for HuggingFace
  if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
    console.warn('⚠️  WARNING: HuggingFace configured with localhost URL!');
    console.warn(`   Current: ${baseUrl}`);
    console.warn(`   Should be: ${DEFAULT_ENGINE_BASE}`);
    console.warn('   Set HF_ENGINE_BASE_URL in env file to the remote Space URL');
  }
  
  return baseUrl;
};

export const getHuggingFaceTimeout = (): number =>
  toInteger(process.env.HF_ENGINE_TIMEOUT_MS, 12000);

export const isHuggingFaceEnabled = (): boolean =>
  toBoolean(process.env.HF_ENGINE_ENABLED, true);

export const getDataSourceConfig = (): DataSourceConfig => {
  const primarySource = getPrimaryDataSource();

  return {
    primarySource,
    availableSources: getAvailableDataSources(),
    overrides: {
      primarySource: primarySourceOverride
    },
    huggingface: {
      enabled: isHuggingFaceEnabled(),
      baseUrl: getHuggingFaceBaseUrl(),
      timeout: getHuggingFaceTimeout(),
      userAgent: process.env.HF_ENGINE_USER_AGENT || 'DreammakerCryptoBackend/1.0',
      notes: 'Primary AI-powered data engine hosted on HuggingFace Spaces'
    },
    binance: {
      enabled: toBoolean(process.env.ENABLE_BINANCE_SOURCE, false),
      baseUrl: process.env.BINANCE_BASE_URL,
      notes: 'Legacy direct Binance integration (REST/WebSocket)'
    },
    kucoin: {
      enabled: toBoolean(process.env.ENABLE_KUCOIN_SOURCE, false),
      baseUrl: process.env.KUCOIN_BASE_URL,
      notes: 'Legacy KuCoin integration'
    },
    mixed: {
      enabled: toBoolean(process.env.ENABLE_MIXED_SOURCE, false),
      strategy: (process.env.MIXED_SOURCE_STRATEGY as 'balanced' | 'failover') || 'balanced',
      notes: 'Hybrid mode that mixes HuggingFace engine with exchange fallbacks'
    }
  };
};

export const HF_ENGINE_BASE_URL = getHuggingFaceBaseUrl();

export const HF_ENGINE_TIMEOUT_MS = getHuggingFaceTimeout();

export const HF_ENGINE_USER_AGENT =
  process.env.HF_ENGINE_USER_AGENT || 'DreammakerCryptoBackend/1.0';

