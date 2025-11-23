import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, RefreshCw, TrendingUp, Wifi, WifiOff, Search, Plus, X, Filter, SlidersHorizontal, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Brain, Target, DollarSign, Newspaper, Waves, Radio } from 'lucide-react';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import dataManager from '../services/dataManager';
import { t } from '../i18n';
import fmt from '../lib/formatNumber';
import { Signal } from '../lib/signalEngine';
import BacktestButton from '../components/backtesting/BacktestButton';
import { useData } from '../contexts/DataContext';
import { AISignalsScanner } from '../components/scanner/AISignalsScanner';
import { TechnicalPatternsScanner } from '../components/scanner/TechnicalPatternsScanner';
import { SmartMoneyScanner } from '../components/scanner/SmartMoneyScanner';
import { NewsSentimentScanner } from '../components/scanner/NewsSentimentScanner';
import { WhaleActivityScanner } from '../components/scanner/WhaleActivityScanner';
import ScannerFeedPanel from '../components/scanner/ScannerFeedPanel';

type ScannerStatus = 'idle' | 'loading' | 'ready' | 'error';
type SortField = 'symbol' | 'price' | 'change24h' | 'volume24h' | 'score';
type SortDir = 'asc' | 'desc';
type TimeframeOption = '15m' | '1h' | '4h' | '1d';
type ScannerTab = 'overview' | 'ai-signals' | 'patterns' | 'smart-money' | 'sentiment' | 'whales' | 'feed';

interface ScannerRow {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  signal: {
    type: 'BUY' | 'SELL' | 'HOLD';
    reason: string;
    score: number;
  };
  score: number;
}

interface MarketPrice {
  symbol: string;
  price: number;
  change24h?: number;
  changePercent24h?: number;
  volume?: number;
  volume24h?: number;
  score?: number;
  signal?: {
    type: 'BUY' | 'SELL' | 'HOLD';
    reason?: string;
    score?: number;
  };
  source?: string;
  timestamp?: number;
}

interface ScreenerFilters {
  symbolQuery: string;
  timeframe: TimeframeOption;
  volumeMin: number;
  rsiMax: number;
  ch1hMin: number;
  ch1hMax: number;
}

// Extended symbol list for initial load
const DEFAULT_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT',
  'DOGEUSDT', 'DOTUSDT', 'AVAXUSDT', 'MATICUSDT', 'LINKUSDT', 'UNIUSDT',
  'ATOMUSDT', 'LTCUSDT', 'NEARUSDT', 'APTUSDT', 'ARBUSDT', 'OPUSDT',
  'SUIUSDT', 'INJUSDT', 'FILUSDT', 'ICPUSDT', 'VETUSDT', 'MANAUSDT',
  'SANDUSDT', 'AXSUSDT', 'THETAUSDT', 'ALGOUSDT', 'EOSUSDT', 'XMRUSDT'
];

const parseSignalLabel = (signal: 'BUY' | 'SELL' | 'HOLD') => {
  switch (signal) {
    case 'BUY':
      return t('scanner.signals.buy');
    case 'SELL':
      return t('scanner.signals.sell');
    default:
      return t('scanner.signals.hold');
  }
};

const ScannerView: React.FC = () => {
  const dataContext = useData();
  const globalSymbol = dataContext?.symbol ?? 'BTC/USDT';
  const globalTimeframe = dataContext?.timeframe ?? '1h';

  // Tab state
  const [activeTab, setActiveTab] = useState<ScannerTab>('overview');

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [rows, setRows] = useState<ScannerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [watchedSymbols, setWatchedSymbols] = useState<string[]>(DEFAULT_SYMBOLS.slice(0, 10));
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddSymbol, setShowAddSymbol] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [filters, setFilters] = useState<ScreenerFilters>({
    symbolQuery: '',
    timeframe: '1h',
    volumeMin: 0,
    rsiMax: 100,
    ch1hMin: -100,
    ch1hMax: 100,
  });

  // Sort & Pagination
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'volume24h', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);


  const loadData = async (signal?: AbortSignal) => {
    setStatus('loading');
    setError(null);

    try {
      // Build query params
      const symbolsParam = watchedSymbols.join(',');
      const params = new URLSearchParams({
        symbols: symbolsParam,
        timeframe: filters.timeframe,
        limit: String(pageSize),
        page: String(page),
        sort: `${sort.field}:${sort.dir}`,
      });

      const response = await dataManager.fetchData<{ prices?: MarketPrice[]; data?: MarketPrice[] }>(
        `/market/prices?${params.toString()}`,
        signal ? { signal } : undefined
      );

      if (signal?.aborted) return;

      const priceList: MarketPrice[] = response?.prices || response?.data || [];

      // Map to scanner rows - REAL DATA ONLY
      const mapped = priceList
        .map((market): ScannerRow | null => {
          if (!market || !market.symbol) return null;

          // Apply filters
          const volume = market.volume24h ?? market.volume ?? 0;
          if (volume < filters.volumeMin) return null;

          const change = market.changePercent24h ?? market.change24h ?? 0;
          if (change < filters.ch1hMin || change > filters.ch1hMax) return null;

          // Map signal from API or default to HOLD
          const signal = market.signal ? {
            type: market.signal.type,
            reason: market.signal.reason || 'No analysis',
            score: market.signal.score ?? market.score ?? 0
          } : {
            type: 'HOLD' as const,
            reason: 'No signal data',
            score: 0
          };

          return {
            symbol: market.symbol,
            price: market.price ?? 0,
            change24h: change,
            volume24h: volume,
            signal,
            score: market.score ?? signal.score
          };
        })
        .filter((row): row is ScannerRow => row !== null);

      setRows(mapped);
      setStatus('ready');
    } catch (err: any) {
      if (err.name === 'AbortError') return;

      setError((err as Error).message ?? t('scanner.error'));
      setRows([]); // NO synthetic data fallback
      setStatus('error');
    }
  };

  // Initial load
  useEffect(() => {
    loadData();
  }, [watchedSymbols, filters.timeframe, page, pageSize, sort]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshIntervalRef.current = setInterval(() => {
        loadData();
      }, 15000); // Every 15 seconds
    } else {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    }

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [autoRefresh, watchedSymbols, filters.timeframe, page, pageSize, sort]);

  // HTTP polling for live updates (replaces WebSocket)
  useEffect(() => {
    if (!autoRefresh) return;

    const pollInterval = setInterval(async () => {
      try {
        // Fetch latest prices for watched symbols
        const symbols = watchedSymbols.join(',');
        if (!symbols) return;

        const response = await fetch(`/api/market/prices?symbols=${symbols}`);
        if (response.ok) {
          const prices = await response.json();
          
          // Update existing rows only (don't add/remove)
          setRows(prevRows => (prevRows || []).map(row => {
            const priceData = prices[row.symbol];
            if (priceData) {
              return {
                ...row,
                price: priceData.price ?? row.price,
                change24h: priceData.change24h ?? row.change24h,
                volume24h: priceData.volume24h ?? row.volume24h,
              };
            }
            return row;
          }));
        }
      } catch (e) {
        // Silently fail - will retry on next poll
      }
    }, 3000); // Poll every 3 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [autoRefresh, watchedSymbols]);

  // Available symbols to add (not already in watchlist)
  const availableSymbols = useMemo(() => {
    return DEFAULT_SYMBOLS.filter(s => !watchedSymbols.includes(s));
  }, [watchedSymbols]);

  // Filtered symbols based on search
  const filteredAvailableSymbols = useMemo(() => {
    if (!searchQuery.trim()) return availableSymbols;
    const query = searchQuery.toLowerCase();
    return availableSymbols.filter(s => s.toLowerCase().includes(query));
  }, [availableSymbols, searchQuery]);

  // Client-side filtering
  const filteredRows = useMemo(() => {
    let filtered = [...rows];

    // Symbol query filter
    if (filters.symbolQuery.trim()) {
      const query = filters.symbolQuery.toLowerCase();
      filtered = filtered.filter(row => row.symbol.toLowerCase().includes(query));
    }

    return filtered;
  }, [rows, filters.symbolQuery]);

  // Client-side sorting
  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];

    sorted.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sort.field) {
        case 'symbol':
          aVal = a.symbol;
          bVal = b.symbol;
          break;
        case 'price':
          aVal = a.price;
          bVal = b.price;
          break;
        case 'change24h':
          aVal = a.change24h;
          bVal = b.change24h;
          break;
        case 'volume24h':
          aVal = a.volume24h;
          bVal = b.volume24h;
          break;
        case 'score':
          aVal = a.score;
          bVal = b.score;
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string') {
        return sort.dir === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sort.dir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  }, [filteredRows, sort]);

  // Pagination
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page, pageSize]);

  const totalPages = Math.ceil(sortedRows.length / pageSize);

  const summary = useMemo(() => {
    if (!filteredRows.length) {
      return {
        buy: 0,
        sell: 0,
        hold: 0,
        avgScore: 0,
      };
    }

    const buy = filteredRows.filter((row) => row.signal.type === 'BUY').length;
    const sell = filteredRows.filter((row) => row.signal.type === 'SELL').length;
    const hold = filteredRows.filter((row) => row.signal.type === 'HOLD').length;
    const avgScore = filteredRows.reduce((sum, row) => sum + row.score, 0) / filteredRows.length;

    return {
      buy,
      sell,
      hold,
      avgScore,
    };
  }, [filteredRows]);

  const addSymbol = (symbol: string) => {
    if (!watchedSymbols.includes(symbol)) {
      setWatchedSymbols([...watchedSymbols, symbol]);
    }
    setShowAddSymbol(false);
    setSearchQuery('');
  };

  const removeSymbol = (symbol: string) => {
    setWatchedSymbols(watchedSymbols.filter(s => s !== symbol));
  };

  const handleSort = (field: SortField) => {
    setSort(prev => ({
      field,
      dir: prev.field === field && prev.dir === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleRefresh = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    loadData(abortControllerRef.current.signal);
  };

  return (
    <ErrorBoundary>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-12 px-6">
        {/* Header Section */}
        <section className="card-base rounded-2xl shadow-sm">
          <div className="flex flex-col gap-6 p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--primary-50)] px-3 py-1 text-xs font-semibold text-[color:var(--primary-700)]">
                <Activity className="h-4 w-4" aria-hidden="true" />
                <span>
                  {status === 'loading'
                    ? 'Scanning...'
                    : status === 'error'
                      ? 'Error'
                      : `${filteredRows.length} Assets`}
                </span>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--primary-600)] to-[var(--primary-400)] bg-clip-text text-transparent">
                Market Scanner
              </h1>
              <p className="max-w-xl text-sm text-[color:var(--text-secondary)]">
                Real-time analysis of crypto assets with AI-powered signals and technical indicators
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Auto-refresh toggle */}
              <button
                type="button"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`card-base px-4 py-2 rounded-lg hover:shadow-md transition-all flex items-center gap-2 ${
                  autoRefresh ? 'bg-emerald-50 border-emerald-300' : ''
                }`}
              >
                {autoRefresh ? <ToggleRight className="h-4 w-4 text-emerald-600" /> : <ToggleLeft className="h-4 w-4" />}
                <span className="text-sm font-medium">{autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}</span>
              </button>

              <button
                type="button"
                className="card-base px-4 py-2 rounded-lg hover:shadow-md transition-all flex items-center gap-2"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                <span className="text-sm font-medium">Filters</span>
              </button>

              <button
                type="button"
                className="card-base px-4 py-2 rounded-lg hover:shadow-md transition-all flex items-center gap-2"
                onClick={() => setShowAddSymbol(!showAddSymbol)}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span className="text-sm font-medium">Add Symbol</span>
              </button>

              <BacktestButton
                symbolUI={globalSymbol}
                timeframe={globalTimeframe}
                className="btn-secondary"
              />

              <button
                type="button"
                className="btn-primary"
                onClick={handleRefresh}
                disabled={status === 'loading'}
                aria-label="Refresh scanner data"
              >
                <RefreshCw className={`h-4 w-4 ${status === 'loading' ? 'animate-spin-slow' : ''}`} aria-hidden="true" />
                {t('scanner.actions.refresh')}
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="border-t border-[color:var(--border)] p-6 space-y-4">
              <h3 className="text-sm font-bold text-[color:var(--text-primary)]">Filter Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Symbol Search */}
                <div>
                  <label className="text-xs text-[color:var(--text-secondary)] block mb-2">Symbol Search</label>
                  <input
                    type="text"
                    placeholder="e.g., BTC, ETH..."
                    value={filters.symbolQuery}
                    onChange={(e) => setFilters(prev => ({ ...prev, symbolQuery: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-[color:var(--surface)] border border-[color:var(--border)] text-[color:var(--text-primary)] text-sm"
                  />
                </div>

                {/* Timeframe */}
                <div>
                  <label className="text-xs text-[color:var(--text-secondary)] block mb-2">Timeframe</label>
                  <select
                    value={filters.timeframe}
                    onChange={(e) => setFilters(prev => ({ ...prev, timeframe: e.target.value as TimeframeOption }))}
                    className="w-full px-3 py-2 rounded-lg bg-[color:var(--surface)] border border-[color:var(--border)] text-[color:var(--text-primary)] text-sm"
                  >
                    <option value="15m">15 Minutes</option>
                    <option value="1h">1 Hour</option>
                    <option value="4h">4 Hours</option>
                    <option value="1d">1 Day</option>
                  </select>
                </div>

                {/* Min Volume */}
                <div>
                  <label className="text-xs text-[color:var(--text-secondary)] block mb-2">
                    Min Volume: ${fmt(filters.volumeMin, { maximumFractionDigits: 0 })}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10000000"
                    step="100000"
                    value={filters.volumeMin}
                    onChange={(e) => setFilters(prev => ({ ...prev, volumeMin: Number(e.target.value) }))}
                    className="w-full accent-[color:var(--primary-500)]"
                  />
                </div>

                {/* Change Range */}
                <div>
                  <label className="text-xs text-[color:var(--text-secondary)] block mb-2">
                    Change Min: {filters.ch1hMin}%
                  </label>
                  <input
                    type="range"
                    min="-100"
                    max="0"
                    value={filters.ch1hMin}
                    onChange={(e) => setFilters(prev => ({ ...prev, ch1hMin: Number(e.target.value) }))}
                    className="w-full accent-[color:var(--primary-500)]"
                  />
                </div>

                <div>
                  <label className="text-xs text-[color:var(--text-secondary)] block mb-2">
                    Change Max: {filters.ch1hMax}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.ch1hMax}
                    onChange={(e) => setFilters(prev => ({ ...prev, ch1hMax: Number(e.target.value) }))}
                    className="w-full accent-[color:var(--primary-500)]"
                  />
                </div>

                {/* Reset Filters */}
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setFilters({
                        symbolQuery: '',
                        timeframe: '1h',
                        volumeMin: 0,
                        rsiMax: 100,
                        ch1hMin: -100,
                        ch1hMax: 100,
                      });
                    }}
                    className="w-full px-4 py-2 rounded-lg bg-[color:var(--surface-muted)] hover:bg-[color:var(--primary-50)] text-[color:var(--text-secondary)] text-sm font-medium transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Symbol Panel */}
          {showAddSymbol && (
            <div className="border-t border-[color:var(--border)] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[color:var(--text-primary)]">Add Symbol to Watchlist</h3>
                <button
                  onClick={() => {
                    setShowAddSymbol(false);
                    setSearchQuery('');
                  }}
                  className="p-1 hover:bg-[color:var(--surface-muted)] rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search symbols..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 rounded-lg bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text-primary)] text-sm focus:border-[color:var(--primary-500)] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-64 overflow-y-auto">
                {(filteredAvailableSymbols || []).map(symbol => (
                  <button
                    key={symbol}
                    onClick={() => addSymbol(symbol)}
                    className="px-3 py-2 rounded-lg bg-[color:var(--surface-muted)] hover:bg-[color:var(--primary-50)] hover:border-[color:var(--primary-500)] border border-[color:var(--border)] text-sm font-medium transition-colors"
                  >
                    {symbol.replace('USDT', '')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Tab Navigation */}
        <section className="card-base rounded-2xl shadow-sm overflow-hidden">
          <div className="flex flex-wrap border-b border-[color:var(--border)]">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`flex-1 min-w-[140px] px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-2 ${
                activeTab === 'overview'
                  ? 'border-[color:var(--primary-600)] text-[color:var(--primary-600)] bg-[color:var(--primary-50)]'
                  : 'border-transparent text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--surface-muted)]'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Market Overview</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ai-signals')}
              className={`flex-1 min-w-[140px] px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-2 ${
                activeTab === 'ai-signals'
                  ? 'border-[color:var(--primary-600)] text-[color:var(--primary-600)] bg-[color:var(--primary-50)]'
                  : 'border-transparent text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--surface-muted)]'
              }`}
            >
              <Brain className="w-4 h-4" />
              <span>AI Signals</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('patterns')}
              className={`flex-1 min-w-[140px] px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-2 ${
                activeTab === 'patterns'
                  ? 'border-[color:var(--primary-600)] text-[color:var(--primary-600)] bg-[color:var(--primary-50)]'
                  : 'border-transparent text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--surface-muted)]'
              }`}
            >
              <Target className="w-4 h-4" />
              <span>Patterns</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('smart-money')}
              className={`flex-1 min-w-[140px] px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-2 ${
                activeTab === 'smart-money'
                  ? 'border-[color:var(--primary-600)] text-[color:var(--primary-600)] bg-[color:var(--primary-50)]'
                  : 'border-transparent text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--surface-muted)]'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Smart Money</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sentiment')}
              className={`flex-1 min-w-[140px] px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-2 ${
                activeTab === 'sentiment'
                  ? 'border-[color:var(--primary-600)] text-[color:var(--primary-600)] bg-[color:var(--primary-50)]'
                  : 'border-transparent text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--surface-muted)]'
              }`}
            >
              <Newspaper className="w-4 h-4" />
              <span>Sentiment</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('whales')}
              className={`flex-1 min-w-[140px] px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-2 ${
                activeTab === 'whales'
                  ? 'border-[color:var(--primary-600)] text-[color:var(--primary-600)] bg-[color:var(--primary-50)]'
                  : 'border-transparent text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--surface-muted)]'
              }`}
            >
              <Waves className="w-4 h-4" />
              <span>Whales</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('feed')}
              className={`flex-1 min-w-[140px] px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-2 ${
                activeTab === 'feed'
                  ? 'border-[color:var(--primary-600)] text-[color:var(--primary-600)] bg-[color:var(--primary-50)]'
                  : 'border-transparent text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--surface-muted)]'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>Scanner Feed</span>
            </button>
          </div>
        </section>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* KPI Cards */}
            <section className="grid gap-4 lg:grid-cols-4">
          <div className="card-base rounded-xl px-5 py-4 bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Buy Signals</p>
            <div className="mt-2 flex items-center gap-2 text-2xl font-semibold text-emerald-900 tabular-nums">
              <TrendingUp className="h-5 w-5" aria-hidden="true" />
              <span>{summary.buy}</span>
            </div>
          </div>
          <div className="card-base rounded-xl px-5 py-4 bg-gradient-to-br from-rose-50 to-red-50 border-rose-200">
            <p className="text-xs font-medium uppercase tracking-wide text-rose-700">Sell Signals</p>
            <div className="mt-2 flex items-center gap-2 text-2xl font-semibold text-rose-900 tabular-nums">
              <Activity className="h-5 w-5" aria-hidden="true" />
              <span>{summary.sell}</span>
            </div>
          </div>
          <div className="card-base rounded-xl px-5 py-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Hold Signals</p>
            <div className="mt-2 flex items-center gap-2 text-2xl font-semibold text-amber-900 tabular-nums">
              <Activity className="h-5 w-5" aria-hidden="true" />
              <span>{summary.hold}</span>
            </div>
          </div>
          <div className="card-base rounded-xl px-5 py-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Avg Score</p>
            <div className="mt-2 text-2xl font-semibold text-blue-900 tabular-nums">{fmt(summary.avgScore * 100, {
              maximumFractionDigits: 1,
            })}</div>
          </div>
        </section>

        {/* Table Section */}
        <section className="card-base rounded-2xl shadow-sm">
          <div className="flex items-center justify-between border-b border-[color:var(--border)] px-6 py-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Market Overview</h2>
              <div className="text-sm text-[color:var(--text-muted)]">
                Page {page} of {totalPages || 1}
              </div>
            </div>
            {status === 'error' && <span className="text-sm text-[color:var(--danger)]">{error ?? t('scanner.error')}</span>}
          </div>
          {paginatedRows.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <Activity className="w-12 h-12 mx-auto mb-3 text-[color:var(--text-muted)]" />
              <p className="text-sm text-[color:var(--text-muted)]">
                {status === 'error'
                  ? 'Failed to load data. Please check your connection and try again.'
                  : rows.length === 0
                    ? 'No symbols in watchlist. Add some symbols to get started!'
                    : 'No assets match your current filters'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-[color:var(--border)] text-left text-xs uppercase tracking-wide text-[color:var(--text-secondary)]">
                      <th
                        className="px-4 py-3 font-medium cursor-pointer hover:text-[color:var(--primary-600)]"
                        onClick={() => handleSort('symbol')}
                      >
                        <div className="flex items-center gap-1">
                          Symbol
                          {sort.field === 'symbol' && (sort.dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 font-medium cursor-pointer hover:text-[color:var(--primary-600)]"
                        onClick={() => handleSort('price')}
                      >
                        <div className="flex items-center gap-1">
                          Price
                          {sort.field === 'price' && (sort.dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 font-medium cursor-pointer hover:text-[color:var(--primary-600)]"
                        onClick={() => handleSort('change24h')}
                      >
                        <div className="flex items-center gap-1">
                          24h Change
                          {sort.field === 'change24h' && (sort.dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 font-medium cursor-pointer hover:text-[color:var(--primary-600)]"
                        onClick={() => handleSort('volume24h')}
                      >
                        <div className="flex items-center gap-1">
                          Volume
                          {sort.field === 'volume24h' && (sort.dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th className="px-4 py-3 font-medium">Signal</th>
                      <th
                        className="px-4 py-3 font-medium cursor-pointer hover:text-[color:var(--primary-600)]"
                        onClick={() => handleSort('score')}
                      >
                        <div className="flex items-center gap-1">
                          Score
                          {sort.field === 'score' && (sort.dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th className="px-4 py-3 font-medium">Reason</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(paginatedRows || []).map((row) => (
                      <tr key={row.symbol} className="border-b border-[color:var(--border)]/60 hover:bg-[color:var(--surface-muted)] transition-colors">
                        <td className="px-4 py-3 font-semibold text-[color:var(--text-primary)]">{row.symbol.replace('USDT', '')}</td>
                        <td className="px-4 py-3 text-[color:var(--text-primary)] tabular-nums">${fmt(row.price, { maximumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 tabular-nums">
                          <ChangeCell value={row.change24h} />
                        </td>
                        <td className="px-4 py-3 text-[color:var(--text-primary)] tabular-nums">{fmt(row.volume24h, {
                          maximumFractionDigits: row.volume24h > 1_000_000 ? 0 : 2,
                        })}</td>
                        <td className="px-4 py-3">
                          <SignalBadge signal={row.signal.type} />
                        </td>
                        <td className="px-4 py-3 text-[color:var(--text-primary)] tabular-nums">{fmt(row.score * 100, { maximumFractionDigits: 1 })}</td>
                        <td className="px-4 py-3 text-xs text-[color:var(--text-secondary)]">{row.signal.reason}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => removeSymbol(row.symbol)}
                            className="p-1 hover:bg-rose-100 rounded text-rose-600 transition-colors"
                            title="Remove from watchlist"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="border-t border-[color:var(--border)] px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-[color:var(--text-secondary)]">Rows per page:</label>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="px-3 py-1 rounded-lg bg-[color:var(--surface)] border border-[color:var(--border)] text-[color:var(--text-primary)] text-sm"
                    >
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 rounded-lg bg-[color:var(--surface-muted)] hover:bg-[color:var(--primary-50)] text-[color:var(--text-primary)] text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-[color:var(--text-secondary)]">
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1 rounded-lg bg-[color:var(--surface-muted)] hover:bg-[color:var(--primary-50)] text-[color:var(--text-primary)] text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
          </>
        )}

        {/* AI Signals Tab */}
        {activeTab === 'ai-signals' && (
          <section className="card-base rounded-2xl shadow-sm p-6">
            <AISignalsScanner />
          </section>
        )}

        {/* Technical Patterns Tab */}
        {activeTab === 'patterns' && (
          <section className="card-base rounded-2xl shadow-sm p-6">
            <TechnicalPatternsScanner />
          </section>
        )}

        {/* Smart Money Tab */}
        {activeTab === 'smart-money' && (
          <section className="card-base rounded-2xl shadow-sm p-6">
            <SmartMoneyScanner />
          </section>
        )}

        {/* News Sentiment Tab */}
        {activeTab === 'sentiment' && (
          <section className="card-base rounded-2xl shadow-sm p-6">
            <NewsSentimentScanner />
          </section>
        )}

        {/* Whale Activity Tab */}
        {activeTab === 'whales' && (
          <section className="card-base rounded-2xl shadow-sm p-6">
            <WhaleActivityScanner />
          </section>
        )}

        {/* Scanner Feed Tab */}
        {activeTab === 'feed' && (
          <section className="card-base rounded-2xl shadow-sm p-6">
            <ScannerFeedPanel />
          </section>
        )}
      </div>
    </ErrorBoundary>
  );
};

const ChangeCell: React.FC<{ value: number }> = ({ value }) => {
  if (!Number.isFinite(value)) {
    return <span className="text-[color:var(--text-muted)]">—</span>;
  }

  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
        <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        {fmt(value, { maximumFractionDigits: 2 })}%
      </span>
    );
  }

  if (value < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">
        <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
        {fmt(value, { maximumFractionDigits: 2 })}%
      </span>
    );
  }

  return <span className="text-xs text-[color:var(--text-muted)]">0.00%</span>;
};

const SignalBadge: React.FC<{ signal: 'BUY' | 'SELL' | 'HOLD' }> = ({ signal }) => {
  const label = parseSignalLabel(signal);

  if (signal === 'BUY') {
    return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{label}</span>;
  }

  if (signal === 'SELL') {
    return <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">{label}</span>;
  }

  return <span className="rounded-full bg-[color:var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[color:var(--text-muted)]">{label}</span>;
};

export default ScannerView;
