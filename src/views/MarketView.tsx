import React, { useState, useEffect, useContext } from 'react';
import { Logger } from '../core/Logger.js';
import {
    TrendingUp,
    TrendingDown,
    Activity,
    Brain,
    BarChart3,
    DollarSign,
    Search,
    Filter,
    Settings,
    AlertCircle
} from 'lucide-react';
import { PriceChart, MarketTicker } from '../components/market';
import { NewsFeed } from '../components/news';
import { AIPredictor } from '../components/ai';
import { dataManager } from '../services/dataManager';
import { LiveDataContext } from '../components/LiveDataContext';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import ResponseHandler from '../components/ui/ResponseHandler';
import { APP_MODE, USE_MOCK_DATA } from '../config/env.js';
import { getTopPairs, searchPairs, PairItem, toBinanceSymbol, getChangePct } from '../services/marketUniverse';
import BacktestButton from '../components/backtesting/BacktestButton';
import { ExchangeSelector } from '../components/ExchangeSelector';

// Helper function to generate sample analysis data
const generateSampleAnalysisData = (symbol: string): AnalysisData => {
    return {
        smc: {
            trend: 'BULLISH',
            orderBlocks: [],
            liquidityZones: []
        },
        elliott: {
            currentWave: 3,
            nextWave: 4,
            confidence: 0.75
        },
        harmonic: {
            pattern: 'GARTLEY',
            completion: 0.85,
            prz: { upper: 0, lower: 0 }
        },
        sentiment: {
            score: 0.65,
            sources: {
                twitter: 0.7,
                reddit: 0.6,
                news: 0.65
            }
        }
    };
};

interface MarketData {
    symbol: string;
    price: number;
    change24h: number;
    changePercent24h: number;
    volume24h: number;
    high24h: number;
    low24h: number;
}

interface AnalysisData {
    smc?: any;
    elliott?: any;
    harmonic?: any;
    sentiment?: any;
}


const logger = Logger.getInstance();

export const MarketView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USDT');
  const [timeframe, setTimeframe] = useState('1h');
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
    const [analysisData, setAnalysisData] = useState<AnalysisData>({});
    const [showFilters, setShowFilters] = useState(false);
    const [pairs, setPairs] = useState<PairItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [topGainers, setTopGainers] = useState<Array<{ symbol: string; changePct: number; price?: number }>>([]);
    const [topLosers, setTopLosers] = useState<Array<{ symbol: string; changePct: number; price?: number }>>([]);

    // Get live data context
    const liveDataContext = useContext(LiveDataContext);

    const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];
    const displayPairs = searchQuery ? searchPairs(searchQuery) : pairs.slice(0, 50); // Limit display for performance

    // Load top pairs on mount
    useEffect(() => {
        getTopPairs('USDT', 300)
            .then(setPairs)
            .catch(err => logger.error('Failed to load top pairs:', {}, err));
    }, []);

    // Define fetchAnalysisData first so it can be used in callbacks
    const fetchAnalysisData = React.useCallback(async (symbol: string) => {
        const binanceSymbol = toBinanceSymbol(symbol);
        try {
            // Use existing analysis endpoints
            const [smcResult, elliottResult, harmonicResult] = await Promise.allSettled([
                dataManager.fetchData(`/api/analysis/smc?symbol=${binanceSymbol}`),
                dataManager.fetchData(`/api/analysis/elliott`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ symbol: binanceSymbol })
                }),
                dataManager.fetchData(`/api/analysis/harmonic`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ symbol: binanceSymbol })
                })
            ]);

            const analysis: AnalysisData = {};

            if (smcResult.status === 'fulfilled' && (smcResult.value as any)?.success) {
                analysis.smc = (smcResult.value as any).data;
            }
            if (elliottResult.status === 'fulfilled' && (elliottResult.value as any)?.success) {
                analysis.elliott = (elliottResult.value as any).data;
            }
            if (harmonicResult.status === 'fulfilled' && (harmonicResult.value as any)?.success) {
                analysis.harmonic = (harmonicResult.value as any).data;
            }

            if (Object.keys(analysis).length > 0) {
                setAnalysisData(analysis);
            } else {
                // Only use sample data when explicitly in demo mode
                if (APP_MODE === 'demo') {
                    setAnalysisData(generateSampleAnalysisData(symbol));
                } else {
                    logger.warn('No analysis data available for symbol:', { symbol });
                    setAnalysisData({});
                }
            }
        } catch (err) {
            logger.error('Failed to fetch analysis data:', {}, err);
            // Only use sample data when explicitly in demo mode
            if (APP_MODE === 'demo') {
                setAnalysisData(generateSampleAnalysisData(symbol));
            } else {
                setAnalysisData({});
            }
        }
    }, []);

    // Handle real-time market data updates - defined before useEffect
    const handleRealTimeUpdate = React.useCallback((data: any) => {
        if (data && data.symbol && data.price) {
            setMarketData(prevData => {
                const updatedData = [...prevData];
                const index = updatedData.findIndex(item => item.symbol === data.symbol);

                if (index !== -1) {
                    // Calculate change based on previous price
                    const prevPrice = updatedData[index].price;
                    const change = data.price - prevPrice;
                    const changePercent = (change / prevPrice) * 100;

                    // Update existing entry
                    updatedData[index] = {
                        ...updatedData[index],
                        price: data.price,
                        change24h: updatedData[index].change24h + change,
                        changePercent24h: data.changePercent24h || updatedData[index].changePercent24h,
                        volume24h: data.volume ? updatedData[index].volume24h + data.volume : updatedData[index].volume24h,
                        high24h: Math.max(updatedData[index].high24h, data.price),
                        low24h: Math.min(updatedData[index].low24h, data.price)
                    };
                }

                return updatedData;
            });

            // If this is the selected symbol, update analysis data
            if (data.symbol === selectedSymbol) {
                fetchAnalysisData(selectedSymbol);
            }
        }
    }, [selectedSymbol, fetchAnalysisData]);

    const fetchMarketData = React.useCallback(async () => {
        if (pairs.length === 0) return;

        try {
            setLoading(true);
            setError(null);

            // Fetch prices for top 20 pairs for the overview
            const symbolsToFetch = pairs.slice(0, 20).map(p => p.symbolBinance).join(',');
            const result = await dataManager.fetchData(`/api/market/prices?symbols=${symbolsToFetch}`) as any;

            if (result && result.success && result.data) {
                const formatted = ((result.data as any[]) || []).map((p: any) => ({
                    symbol: p.symbol,
                    price: p.price,
                    change24h: p.change24h || 0,
                    changePercent24h: p.changePercent24h || 0,
                    volume24h: p.volume || 0,
                    high24h: p.high24h || p.price * 1.02,
                    low24h: p.low24h || p.price * 0.98
                }));
                setMarketData(formatted);
            } else {
                logger.error('No market data available from API', {});
                setError('No market data available. Please ensure backend is running.');
            }

            // Fetch analysis data for selected symbol
            await fetchAnalysisData(selectedSymbol);
        } catch (err) {
            logger.error('Failed to fetch market data:', {}, err);
            setError('Failed to fetch market data. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    }, [pairs, selectedSymbol, fetchAnalysisData]);


    // Compute top gainers/losers from real OHLC data
    const computeGainersLosers = React.useCallback(async () => {
        if (pairs.length === 0) return;

        try {
            // Compute from real OHLC across top pairs
            const universe = pairs.slice(0, 60);
            const changes = await Promise.all(
                (universe || []).map(async (p) => {
                    try {
                        const pct = await getChangePct(p.symbolUI, timeframe);
                        return { symbol: p.symbolUI, changePct: pct };
                    } catch {
                        return { symbol: p.symbolUI, changePct: Number.NEGATIVE_INFINITY };
                    }
                })
            );

            const valid = changes.filter(x => Number.isFinite(x.changePct));
            valid.sort((a, b) => b.changePct - a.changePct);

            setTopGainers(valid.slice(0, 10));
            setTopLosers(valid.slice(-10).reverse());
        } catch (err) {
            logger.error('Failed to compute gainers/losers:', {}, err);
            setTopGainers([]);
            setTopLosers([]);
        }
    }, [pairs, timeframe]);

    // Compute gainers/losers when pairs or timeframe changes
    useEffect(() => {
        if ((pairs?.length || 0) > 0) {
            computeGainersLosers();
        }
    }, [pairs, timeframe, computeGainersLosers]);

    // Subscribe to live data updates
    useEffect(() => {
        if (liveDataContext && liveDataContext.subscribeToMarketData) {
            try {
                const binanceSymbol = toBinanceSymbol(selectedSymbol);
                const unsubscribe = liveDataContext.subscribeToMarketData([binanceSymbol], handleRealTimeUpdate);

                return () => {
                    if (unsubscribe) {
                        unsubscribe();
                    }
                };
            } catch (error) {
                logger.error('Failed to subscribe to market data:', {}, error);
                setError('Failed to subscribe to real-time updates');
            }
        }
    }, [liveDataContext, handleRealTimeUpdate, selectedSymbol]);

    // Fetch market data on mount and when pairs are loaded
    useEffect(() => {
        if ((pairs?.length || 0) > 0) {
            fetchMarketData();

            // Set up interval to refresh data every 30 seconds
            const interval = setInterval(() => {
                fetchMarketData();
            }, 30000);

            return () => clearInterval(interval);
        }
    }, [pairs, selectedSymbol, timeframe, fetchMarketData]);

    // Fetch analysis data when symbol or timeframe changes
    useEffect(() => {
        fetchAnalysisData(selectedSymbol);
    }, [selectedSymbol, timeframe, fetchAnalysisData]);

    const currentSymbolData = marketData.find(d => d.symbol === toBinanceSymbol(selectedSymbol));

    return (
        <div className="w-full min-h-full animate-fade-in">
            <style>{`
                @keyframes shimmer {
                    0% { background-position: -1000px 0; }
                    100% { background-position: 1000px 0; }
                }
                
                .animate-shimmer {
                    animation: shimmer 8s infinite linear;
                    background: linear-gradient(
                        90deg,
                        transparent 0%,
                        rgba(255, 255, 255, 0.03) 50%,
                        transparent 100%
                    );
                    background-size: 1000px 100%;
                }
            `}</style>

            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-2 drop-shadow-[0_0_30px_rgba(59,130,246,0.4)]">
                            Market Analysis
                        </h1>
                        <p className="text-slate-400 text-xs">Comprehensive market intelligence and trading insights</p>
                        {error && (
                            <div className="mt-2 flex items-center gap-2 text-orange-400 text-xs">
                                <AlertCircle className="w-3 h-3" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Backtest Button */}
                        <div
                            className="px-4 py-2 rounded-xl backdrop-blur-sm transition-all hover:scale-105"
                            style={{
                                background: 'rgba(15, 15, 24, 0.6)',
                                border: '1px solid rgba(139, 92, 246, 0.2)',
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 40px rgba(139, 92, 246, 0.1)'
                            }}
                        >
                            <BacktestButton
                                symbolUI={selectedSymbol}
                                timeframe={timeframe}
                                className="text-purple-400"
                            />
                        </div>

                        {/* Filter Button */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="px-4 py-2 rounded-xl backdrop-blur-sm transition-all hover:scale-105"
                            style={{
                                background: 'rgba(15, 15, 24, 0.6)',
                                border: '1px solid rgba(139, 92, 246, 0.2)',
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 40px rgba(139, 92, 246, 0.1)'
                            }}
                            aria-label="Toggle filters"
                            title="Toggle filters"
                        >
                            <Filter className="w-4 h-4 text-purple-400" aria-hidden="true" />
                        </button>

                        {/* Settings Button */}
                        <button
                            className="px-4 py-2 rounded-xl backdrop-blur-sm transition-all hover:scale-105"
                            style={{
                                background: 'rgba(15, 15, 24, 0.6)',
                                border: '1px solid rgba(139, 92, 246, 0.2)',
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 40px rgba(139, 92, 246, 0.1)'
                            }}
                            aria-label="Open settings"
                            title="Open settings"
                        >
                            <Settings className="w-4 h-4 text-purple-400" aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {/* Filters */}
                {showFilters && (
                    <div
                        className="mt-4 p-4 rounded-xl backdrop-blur-sm"
                        style={{
                            background: 'rgba(15, 15, 24, 0.9)',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)'
                        }}
                    >
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <label className="text-xs text-slate-400 mb-2 block">Search Symbol</label>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Type to search (e.g., BTC, MATIC)..."
                                    className="w-full px-3 py-2 rounded-lg text-sm transition-all"
                                    style={{
                                        background: 'rgba(20, 20, 30, 0.8)',
                                        border: '1px solid rgba(139, 92, 246, 0.3)',
                                        color: 'white'
                                    }}
                                />
                            </div>

                            <div className="flex-1">
                                <label className="text-xs text-slate-400 mb-2 block">Symbol ({displayPairs.length} pairs)</label>
                                <select
                                    value={selectedSymbol}
                                    onChange={(e) => setSelectedSymbol(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                                    style={{
                                        background: 'rgba(20, 20, 30, 0.8)',
                                        border: '1px solid rgba(139, 92, 246, 0.3)',
                                        color: 'white'
                                    }}
                                >
                                    {(displayPairs || []).map(pair => (
                                        <option key={pair.symbolBinance} value={pair.symbolUI}>{pair.symbolUI}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex-1">
                                <label className="text-xs text-slate-400 mb-2 block">Timeframe</label>
                                <select
                                    value={timeframe}
                                    onChange={(e) => setTimeframe(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                                    style={{
                                        background: 'rgba(20, 20, 30, 0.8)',
                                        border: '1px solid rgba(139, 92, 246, 0.3)',
                                        color: 'white'
                                    }}
                                >
                                    {(timeframes || []).map(tf => (
                                        <option key={tf} value={tf}>{tf}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Exchange Selector */}
                <div className="mt-4">
                    <ExchangeSelector />
                </div>
            </div>

            {/* Market Overview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Top Gainers */}
                <div
                    className="rounded-2xl p-6 backdrop-blur-sm"
                    style={{
                        background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(16, 185, 129, 0.15)'
                    }}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                        <h3 className="text-lg font-bold text-white">Top Gainers</h3>
                    </div>

                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {topGainers.length === 0 && (
                                <div className="text-center text-slate-400 text-sm py-4">
                                    {APP_MODE === 'online' ? 'Loading real data...' : 'No data available'}
                                </div>
                            )}
                            {(topGainers || []).map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
                                    style={{ background: 'rgba(16, 185, 129, 0.1)' }}
                                >
                                    <div>
                                        <span className="text-white font-semibold text-sm">{item.symbol}</span>
                                        <div className="text-emerald-400 font-bold text-xs">
                                            +{item.changePct.toFixed(2)}%
                                        </div>
                                    </div>
                                    {item.price && <span className="text-white font-bold">${item.price.toLocaleString()}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Top Losers */}
                <div
                    className="rounded-2xl p-6 backdrop-blur-sm"
                    style={{
                        background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(239, 68, 68, 0.15)'
                    }}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <TrendingDown className="w-5 h-5 text-rose-400" />
                        <h3 className="text-lg font-bold text-white">Top Losers</h3>
                    </div>

                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500 mx-auto"></div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {topLosers.length === 0 && (
                                <div className="text-center text-slate-400 text-sm py-4">
                                    {APP_MODE === 'online' ? 'Loading real data...' : 'No data available'}
                                </div>
                            )}
                            {(topLosers || []).map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
                                    style={{ background: 'rgba(239, 68, 68, 0.1)' }}
                                >
                                    <div>
                                        <span className="text-white font-semibold text-sm">{item.symbol}</span>
                                        <div className="text-rose-400 font-bold text-xs">
                                            {item.changePct.toFixed(2)}%
                                        </div>
                                    </div>
                                    {item.price && <span className="text-white font-bold">${item.price.toLocaleString()}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Market Stats */}
                <div
                    className="rounded-2xl p-6 backdrop-blur-sm"
                    style={{
                        background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(139, 92, 246, 0.15)'
                    }}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <Activity className="w-5 h-5 text-purple-400" />
                        <h3 className="text-lg font-bold text-white">Market Stats</h3>
                    </div>

                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <span className="text-slate-400 text-xs">Total Markets</span>
                                <div className="text-white font-bold text-2xl">{marketData.length}</div>
                            </div>
                            <div>
                                <span className="text-slate-400 text-xs">24h Volume</span>
                                <div className="text-white font-bold text-2xl">
                                    ${marketData.reduce((sum, d) => sum + d.volume24h, 0).toLocaleString()}
                                </div>
                            </div>
                            <div>
                                <span className="text-slate-400 text-xs">Active Analysis</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                                    <span className="text-emerald-400 font-bold text-lg">Live</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Chart - Takes 2 columns */}
                <div className="lg:col-span-2">
                    <div className="rounded-2xl overflow-hidden backdrop-blur-sm"
                        style={{
                            background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)'
                        }}
                    >
                        <PriceChart
                            symbol={selectedSymbol}
                            autoFetch={true}
                            initialTimeframe={timeframe}
                        />
                    </div>
                </div>

                {/* AI Predictions - Takes 1 column */}
                <div>
                    <div className="rounded-2xl overflow-hidden backdrop-blur-sm"
                        style={{
                            background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)'
                        }}
                    >
                        <AIPredictor
                            symbol={selectedSymbol}
                            autoFetch={true}
                            refreshInterval={60000}
                        />
                    </div>
                </div>
            </div>

            {/* Bottom Section - News Feed */}
            <div className="mb-6">
                <NewsFeed autoRefresh={true} refreshInterval={60000} />
            </div>

            {/* Status Banner */}
            <div
                className="rounded-2xl p-4 backdrop-blur-sm"
                style={{
                    background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 50%, rgba(236, 72, 153, 0.15) 100%)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    boxShadow: '0 12px 40px rgba(99, 102, 241, 0.25)'
                }}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"
                            style={{ boxShadow: '0 0 20px rgba(52, 211, 153, 1)' }}
                        />
                        <span className="font-bold text-sm text-white">
                            Real-time Market Data Active
                        </span>
                        <span className="text-xs text-slate-400">
                            • {marketData.length} markets monitored • AI analysis enabled
                        </span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                        Updated: {new Date().toLocaleTimeString()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarketView;

