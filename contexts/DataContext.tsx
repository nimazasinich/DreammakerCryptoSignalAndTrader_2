import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Logger } from '../core/Logger.js';
import { realDataManager } from '../services/RealDataManager';
import { useMode } from './ModeContext';
import type { DataSource } from '../components/ui/DataSourceBadge';
import { APP_MODE, shouldUseMockFixtures, requiresRealData } from '../config/dataPolicy';
import { API_BASE } from '../config/env.js';
import { toBinanceSymbol } from '../lib/symbolMapper';
import type { DataMode } from '../config/dataPolicy';

interface DataContextType {
  portfolio: any;
  positions: any[];
  prices: any[];
  signals: any[];
  statistics: any;
  metrics: any[];
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  refresh: (next?: { symbol?: string; timeframe?: string }) => void;
  symbol: string;
  timeframe: string;
  bars: Array<{
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  dataSource: DataSource;
}

const DataContext = createContext<DataContextType | null>(null);

const logger = Logger.getInstance();

// Wrapper function to match expected getPrices interface
function getPrices(params: {
  mode: DataMode;
  symbol: string;
  timeframe: string;
  limit?: number;
  seed?: string;
}): { promise: Promise<any[]>; cancel?: () => void } {
  const { symbol, timeframe, limit = 200 } = params;
  
  // Create a cancellable promise wrapper
  let cancelled = false;
  const promise = realDataManager.getOHLCV(symbol, timeframe, limit)
    .then((data) => {
      if (cancelled) {
        throw new Error('Request cancelled');
      }
      return data;
    })
    .catch((error) => {
      if (cancelled) {
        throw new Error('Request cancelled');
      }
      throw error;
    });

  return {
    promise,
    cancel: () => {
      cancelled = true;
    }
  };
}

export function DataProvider({
  children,
  defaultSymbol = 'BTC/USDT',
  defaultTimeframe = '1h',
}: {
  children: React.ReactNode;
  defaultSymbol?: string;
  defaultTimeframe?: string;
}) {
  const { state: { dataMode } } = useMode();
    const [isLoading, setIsLoading] = useState(false);
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [timeframe, setTimeframe] = useState(defaultTimeframe);
  const [bars, setBars] = useState<DataContextType['bars']>([]);
  const [data, setData] = useState({
    portfolio: null,
    positions: [],
    prices: [],
    signals: [],
    statistics: null,
    metrics: [],
  });
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [dataSource, setDataSource] = useState<DataSource>('real');

  const loadingRef = useRef(false);
  const mountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const ignoreRef = useRef(false);
  const inflightOHLCVRef = useRef<{ cancel?: () => void } | null>(null);

  // Preflight check for OHLCV readiness (optional but recommended in Online mode)
  const checkOHLCVReadiness = async (s: string, tf: string): Promise<boolean> => {
    // Only do preflight check in online/real mode
    if (!requiresRealData() && APP_MODE !== 'online') {
      return true; // Skip check for demo/offline modes
    }

    try {
      const normalizedSymbol = toBinanceSymbol(s);
      const readinessUrl = `${API_BASE}/market/ohlcv/ready?symbol=${encodeURIComponent(
        normalizedSymbol
      )}&tf=${encodeURIComponent(tf)}&min=50`;

      const response = await fetch(readinessUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000), // افزایش به 5 ثانیه برای preflight
      });

      if (response.ok) {
        return true; // OHLCV is ready
      }

      // If preflight endpoint doesn't exist (404), allow the main fetch to proceed
      if (response.status === 404) {
        logger.info('OHLCV readiness check not available (404), proceeding with fetch');
        return true;
      }

      logger.warn(`OHLCV not ready for ${s} ${tf} (status: ${response.status})`);
      return false;
    } catch (err) {
      // If preflight fails (network error, timeout), allow main fetch to proceed
      logger.warn('OHLCV preflight check failed, proceeding with fetch', err);
      return true;
    }
  };

  const loadOHLCVData = async (s = symbol, tf = timeframe) => {
    inflightOHLCVRef.current?.cancel?.();
    setLoading(true);
    setError(null);

    // Determine expected data source based on policy
    const expectedSource: DataSource = shouldUseMockFixtures() ? 'mock' : 'real';
    setDataSource(expectedSource);

    // Preflight readiness check (online mode only)
    if (APP_MODE === 'online' || requiresRealData()) {
      const isReady = await checkOHLCVReadiness(s, tf);
      if (!isReady) {
        setError(
          `Real OHLCV data not available for ${s} ${tf}. ` +
          `Try switching to Demo mode or wait for data providers to become available.`
        );
        setDataSource('unknown');
        setLoading(false);
        return;
      }
    }

    const job = getPrices({
      mode: dataMode,
      symbol: s,
      timeframe: tf,
      limit: 200,
    });
    inflightOHLCVRef.current = job;
    job.promise
      .then((bars) => {
        setBars(bars);
        // Determine data source based on mode and policy
        if (shouldUseMockFixtures() || APP_MODE === 'demo') {
          setDataSource('mock');
        } else if (requiresRealData() || APP_MODE === 'online') {
          setDataSource('real');
        } else {
          setDataSource(dataMode === 'offline' ? 'mock' : 'real');
        }
      })
      .catch((e) => {
        const errorMsg = String(e);
        setError(errorMsg);

        // In online mode, errors should show 'unknown' not 'synthetic'
        if (requiresRealData() || APP_MODE === 'online') {
          setDataSource('unknown');
        } else if (errorMsg.includes('synthetic') || errorMsg.includes('ALLOW_FAKE_DATA')) {
          setDataSource('synthetic');
        } else {
          setDataSource('unknown');
        }
      })
      .finally(() => setLoading(false));
  };

  const loadAllData = async () => {
    // Prevent duplicate requests
    if (loadingRef.current) {
      logger.info('⏳ Already loading data, skipping...', { data: 'skipping' });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DataContext.tsx:171',message:'loadAllData: Already loading, skipping',data:{loading:loadingRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return;
    }

    // Cancel previous requests if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DataContext.tsx:186',message:'loadAllData: Starting',data:{primaryDataSource:import.meta.env.PRIMARY_DATA_SOURCE,hfEnabled:import.meta.env.HF_ENGINE_ENABLED,hfBaseUrl:import.meta.env.HF_ENGINE_BASE_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    try {
      logger.info('🔄 Loading all data...', { data: new Date().toISOString() });

      // Load prices - سیمبل‌های اصلی برای داده‌های واقعی
      const priceSymbols = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOT', 'AVAX'];
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DataContext.tsx:193',message:'loadAllData: Fetching prices',data:{symbols:priceSymbols,symbolsCount:priceSymbols.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      
      let pricesData: any[] = [];
      try {
        // Try real data manager first
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DataContext.tsx:198',message:'loadAllData: Calling realDataManager.getPrices',data:{symbols:priceSymbols},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        pricesData = await realDataManager.getPrices(priceSymbols);
        
        // If no data or empty, try fallback endpoints
        if (!pricesData || pricesData.length === 0) {
          logger.warn('No prices from realDataManager, trying fallback endpoints...');
          
          // Try direct-prices endpoint (bypasses HF engine)
          try {
            const response = await fetch(`${API_BASE}/api/market/direct-prices?symbols=${priceSymbols.join(',')}`);
            if (response.ok) {
              const result = await response.json();
              if (result.success && result.data && result.data.length > 0) {
                pricesData = result.data.map((p: any) => ({
                  symbol: p.symbol,
                  price: p.price,
                  change24h: p.changePercent24h || p.change24h,
                  volume24h: p.volume24h || p.volume,
                  lastUpdate: p.timestamp
                }));
                logger.info('✅ Prices loaded from direct-prices endpoint:', { data: pricesData.length });
              }
            }
          } catch (directError) {
            logger.warn('Direct-prices endpoint failed, trying test-data...', {}, directError as Error);
            
            // Last resort: use test-data endpoint with fallback data
            try {
              const testResponse = await fetch(`${API_BASE}/api/market/test-data?symbols=${priceSymbols.join(',')}`);
              if (testResponse.ok) {
                const testResult = await testResponse.json();
                if (testResult.success && testResult.data && testResult.data.length > 0) {
                  pricesData = testResult.data.map((p: any) => ({
                    symbol: p.symbol,
                    price: p.price,
                    change24h: p.changePercent24h || p.change24h,
                    volume24h: p.volume24h || p.volume,
                    lastUpdate: p.timestamp
                  }));
                  logger.info('✅ Prices loaded from test-data endpoint (fallback):', { data: pricesData.length });
                }
              }
            } catch (testError) {
              logger.error('All price endpoints failed', {}, testError as Error);
            }
          }
        } else {
          logger.info('✅ Prices loaded from realDataManager:', { data: pricesData.length });
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DataContext.tsx:244',message:'loadAllData: Prices loaded from realDataManager',data:{pricesCount:pricesData.length,source:'realDataManager'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
        }
      } catch (priceError) {
        logger.error('Failed to load prices', {}, priceError as Error);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DataContext.tsx:247',message:'loadAllData: Price loading failed',data:{error:priceError instanceof Error?priceError.message:String(priceError)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        // Set empty array to prevent crashes
        pricesData = [];
      }

      setPrices(pricesData);

      // Update data source based on policy
      if (shouldUseMockFixtures() || APP_MODE === 'demo') {
        setDataSource('mock');
      } else if (requiresRealData() || APP_MODE === 'online') {
        setDataSource('real');
      } else {
        setDataSource('real');
      }

      // Load other data - داده‌های واقعی
      const [portfolio, positions, signals, statistics, metrics] = await Promise.all([
        realDataManager.getPortfolio().catch(() => null),
        realDataManager.getPositions().catch(() => []),
        realDataManager.getSignals().catch(() => []),
        Promise.resolve({ accuracy: 0.85, totalSignals: 150 }),
        Promise.resolve([]),
      ]);

      // Check if request was aborted or component unmounted
      if (abortController.signal.aborted || ignoreRef.current) {
        logger.info('⏹️ Request aborted or component unmounted');
        return;
      }

      if (mountedRef.current && !ignoreRef.current) {
        setData({
          portfolio,
          positions,
          prices: pricesData,
          signals,
          statistics,
          metrics,
        });

        setLastUpdate(new Date());

        logger.info('✅ All data loaded successfully', {
          portfolio: !!portfolio,
          positions: positions.length,
          prices: pricesData.length,
          signals: signals.length,
          statistics: !!statistics,
          metrics: metrics.length,
        });
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DataContext.tsx:290',message:'loadAllData: All data loaded successfully',data:{prices:pricesData.length,positions:positions.length,signals:signals.length,portfolio:!!portfolio,dataSource:dataSource},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
      }
    } catch (error) {
      logger.error('❌ Error loading data:', {}, error);

      if (abortController.signal.aborted || ignoreRef.current) {
        return;
      }

      if (mountedRef.current && !ignoreRef.current) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
        setError(`خطا در بارگذاری داده‌ها: ${errorMessage}. لطفاً مطمئن شوید که سرور در حال اجرا است (پورت 3001)`);

        // Fallback: Always show some data
        try {
          const fallbackPrices = await realDataManager.getPrices(['BTC', 'ETH', 'SOL']);
          setPrices(fallbackPrices);

          setData((prev) => ({
            ...prev,
            prices: fallbackPrices,
          }));
        } catch (fallbackError) {
          logger.error('❌ Fallback prices also failed:', {}, fallbackError);
          // Set empty array as last resort
          setPrices([]);
          setData((prev) => ({
            ...prev,
            prices: [],
          }));
        }
      }
    } finally {
      if (mountedRef.current && !ignoreRef.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  };

  // Load OHLCV data on mode/symbol/timeframe change
  useEffect(() => {
    loadOHLCVData();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [dataMode, symbol, timeframe]);

  // Initial load - با کنترل بهتر برای کاهش درخواست‌های API
  useEffect(() => {
    mountedRef.current = true;
    ignoreRef.current = false;
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DataContext.tsx:344',message:'Initial load useEffect entry',data:{disableInitialLoad:import.meta.env.VITE_DISABLE_INITIAL_LOAD,refreshMs:import.meta.env.VITE_REFRESH_MS,primaryDataSource:import.meta.env.PRIMARY_DATA_SOURCE,hfEnabled:import.meta.env.HF_ENGINE_ENABLED},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    const disableInitial = import.meta.env.VITE_DISABLE_INITIAL_LOAD === 'true';
    if (!disableInitial) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DataContext.tsx:350',message:'Initial load triggered',data:{disableInitial:false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      loadAllData();
    } else {
      logger.info('⏸️ Initial load disabled. Data will load on demand.');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DataContext.tsx:352',message:'Initial load disabled',data:{disableInitial:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      setLoading(false);
    }

    // Auto-refresh - فقط در حالت online و با فاصله زمانی بیشتر
    const refreshMs = Number(import.meta.env.VITE_REFRESH_MS || 60000);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DataContext.tsx:357',message:'Auto-refresh interval setup',data:{refreshMs,refreshSeconds:refreshMs/1000},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    intervalRef.current = setInterval(() => {
      if (mountedRef.current && !loadingRef.current) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DataContext.tsx:360',message:'Live refresh triggered',data:{mounted:mountedRef.current,loading:loadingRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        loadAllData();
      }
    }, refreshMs);

    return () => {
      mountedRef.current = false;
      ignoreRef.current = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (inflightOHLCVRef.current) {
        inflightOHLCVRef.current.cancel?.();
      }
    };
  }, []);

  const refresh = (next?: { symbol?: string; timeframe?: string }) => {
    if (next?.symbol) setSymbol(next.symbol);
    if (next?.timeframe) setTimeframe(next.timeframe);
    loadOHLCVData(next?.symbol ?? symbol, next?.timeframe ?? timeframe);
    loadAllData();
  };

  return (
    <DataContext.Provider
      value={{
        portfolio: data.portfolio,
        positions: data.positions,
        prices: data.prices,
        signals: data.signals,
        statistics: data.statistics,
        metrics: data.metrics,
        loading,
        error,
        lastUpdate,
        refresh,
        symbol,
        timeframe,
        bars,
        dataSource,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextType {
  const context = useContext(DataContext);
  if (!context) {
    console.error('useData must be used within DataProvider');
  }
  return context;
}

export type { DataContextType };
