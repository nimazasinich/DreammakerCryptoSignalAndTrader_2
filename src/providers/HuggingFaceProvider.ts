/**
 * HuggingFaceProvider - Unified Interface for HuggingFace Space API
 * 
 * This provider is the ONLY interface for HuggingFace API calls.
 * It handles:
 * - Market data (prices, OHLCV)
 * - Sentiment analysis (single & batch)
 * - News and trending data
 * - WebSocket connections
 * - Caching and retry logic
 * - Symbol normalization
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { Logger } from '../core/Logger.js';
import WebSocket from 'ws';
import { verifyHFToken, logTokenValidation, isValidTokenFormat } from './hfTokenValidator.js';

// Types
export interface HFResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    source: string;
    timestamp: number;
    cached?: boolean;
}

export interface MarketPrice {
    symbol: string;
    name?: string;
    price: number;
    change24h: number;
    changePercent24h: number;
    volume24h: number;
    source?: string;
    timestamp: number;
}

export interface OHLCVData {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface SentimentResult {
    label: string;
    score: number;
    sentiment: string;
    confidence: number;
    text?: string;
    timestamp: number;
}

export interface TrendingCoin {
    symbol: string;
    name: string;
    rank: number;
    price?: number;
    change24h?: number;
}

export interface NewsItem {
    title: string;
    description?: string;
    url?: string;
    source?: string;
    timestamp: number;
}

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

interface HFConfig {
    baseUrl: string;
    timeout: number;
    enabled: boolean;
    token?: string;
    retryAttempts: number;
    retryDelay: number;
    cacheTTL: number;
}

// Global HF WebSocket status for health endpoint
export interface HFWebSocketStatus {
    state: 'connected' | 'disconnected' | 'auth_error' | 'disabled' | 'fallback_polling' | 'unknown';
    lastError?: string;
    lastAttempt?: number;
    connectedAt?: number;
    reconnectAttempts?: number;
    hasToken?: boolean;
    permanentFailure?: boolean;
}

declare global {
    var __HF_WS_STATUS__: HFWebSocketStatus;
}

// Initialize global status
if (typeof global !== 'undefined') {
    global.__HF_WS_STATUS__ = { state: 'unknown' };
}

export class HuggingFaceProvider {
    private static instance: HuggingFaceProvider;
    private logger: Logger;
    private client: AxiosInstance;
    private config: HFConfig;
    private cache: Map<string, CacheEntry<any>>;
    private ws: WebSocket | null = null;
    private wsReconnectAttempts: number = 0;
    private wsMaxReconnectAttempts: number;
    private wsReconnectDelay: number;
    private wsBackoffFactor: number;
    private wsHeartbeatInterval: NodeJS.Timeout | null = null;
    private wsSubscriptions: Set<string> = new Set();
    private wsMessageHandlers: ((message: any) => void)[] = [];
    private wsPermanentFailure: boolean = false; // Flag to stop retrying on persistent auth failures
    private wsLastFailureCode: number | null = null;

    private constructor() {
        this.logger = Logger.getInstance();
        
        // Support both HF_TOKEN and HUGGINGFACE_API_KEY for flexibility
        const hfToken = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY;
        
        this.config = {
            baseUrl: process.env.HF_ENGINE_BASE_URL || 'https://really-amin-datasourceforcryptocurrency.hf.space',
            timeout: parseInt(process.env.HF_ENGINE_TIMEOUT_MS || '15000'),
            enabled: process.env.HF_ENGINE_ENABLED !== 'false',
            token: hfToken,
            retryAttempts: 3,
            retryDelay: 1000,
            cacheTTL: 5000 // 5 seconds
        };

        // Configurable WebSocket retry parameters
        this.wsMaxReconnectAttempts = parseInt(process.env.HF_WS_MAX_RECONNECT_ATTEMPTS || '10');
        this.wsReconnectDelay = parseInt(process.env.HF_WS_RECONNECT_DELAY_MS || '5000');
        this.wsBackoffFactor = parseFloat(process.env.HF_WS_BACKOFF_FACTOR || '1.5');
        
        // Allow disabling WebSocket entirely via environment variable
        if (process.env.HF_WS_DISABLED === 'true') {
            this.logger.info('🔌 HF WebSocket disabled via HF_WS_DISABLED=true');
        }

        this.client = axios.create({
            baseURL: this.config.baseUrl,
            timeout: this.config.timeout,
            headers: {
                'User-Agent': process.env.HF_ENGINE_USER_AGENT || 'DreammakerCryptoBackend/1.0',
                'Content-Type': 'application/json',
                ...(this.config.token && { 'Authorization': `Bearer ${this.config.token}` })
            }
        });

        this.cache = new Map();

        this.logger.info('🚀 HuggingFaceProvider initialized', {
            baseUrl: this.config.baseUrl,
            enabled: this.config.enabled,
            cacheTTL: this.config.cacheTTL
        });

        // Validate token at startup (async, non-blocking)
        if (this.config.enabled && process.env.HF_WS_DISABLED !== 'true') {
            this.validateTokenAtStartup();
        }
    }

    /**
     * Validate HF token at startup (async, non-blocking)
     */
    private async validateTokenAtStartup(): Promise<void> {
        try {
            const result = await verifyHFToken(this.config.token);
            logTokenValidation(result, !!this.config.token, this.logger);

            // Update global status based on validation
            if (!result.ok) {
                if (result.reason === 'unauthorized' || result.reason === 'invalid_format') {
                    this.updateWSStatus({ 
                        state: 'auth_error', 
                        lastError: `Token validation failed: ${result.reason}`,
                        lastAttempt: Date.now()
                    });
                }
            }
        } catch (error) {
            // Don't block startup on validation failure
            this.logger.warn('⚠️ Token validation check failed, will proceed anyway', { error });
        }
    }

    public static getInstance(): HuggingFaceProvider {
        if (!HuggingFaceProvider.instance) {
            HuggingFaceProvider.instance = new HuggingFaceProvider();
        }
        return HuggingFaceProvider.instance;
    }

    public getConfig(): HFConfig {
        return { ...this.config };
    }

    public isEnabled(): boolean {
        return this.config.enabled;
    }

    // ==================== CACHING ====================

    private getCached<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        const age = Date.now() - entry.timestamp;
        if (age > this.config.cacheTTL) {
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    private setCache<T>(key: string, data: T): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    public clearCache(): void {
        this.cache.clear();
        this.logger.info('🗑️ HF cache cleared');
    }

    // ==================== SYMBOL NORMALIZATION ====================

    private normalizeSymbol(symbol: string): string {
        // Remove USDT, USD suffixes and convert to uppercase
        return symbol.toUpperCase()
            .replace(/USDT$/, '')
            .replace(/USD$/, '')
            .trim();
    }

    // ==================== RETRY LOGIC ====================

    private async withRetry<T>(
        operation: () => Promise<T>,
        operationName: string
    ): Promise<T> {
        let lastError: any;

        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            try {
                return await operation();
            } catch (error: any) {
                lastError = error;
                
                if (attempt < this.config.retryAttempts) {
                    const delay = this.config.retryDelay * attempt;
                    this.logger.warn(`⚠️ ${operationName} failed (attempt ${attempt}/${this.config.retryAttempts})`, {
                        error: error.message,
                        retryIn: delay
                    });
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    this.logger.error(`❌ ${operationName} failed after ${this.config.retryAttempts} attempts`, {}, error);
                }
            }
        }

        throw lastError;
    }

    // ==================== HEALTH & STATUS ====================

    public async getHealth(): Promise<HFResponse<any>> {
        try {
            const response = await this.client.get('/api/health');
            
            return {
                success: true,
                data: response.data,
                source: 'hf_engine',
                timestamp: Date.now()
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                source: 'hf_engine',
                timestamp: Date.now()
            };
        }
    }

    public async isHealthy(): Promise<boolean> {
        try {
            const response = await this.getHealth();
            return response.success;
        } catch {
            return false;
        }
    }

    // ==================== MARKET DATA ====================

    public async getMarketPrices(
        symbols: string[],
        limit: number = 100
    ): Promise<HFResponse<MarketPrice[]>> {
        const cacheKey = `market_prices_${symbols.join(',')}_${limit}`;
        const cached = this.getCached<HFResponse<MarketPrice[]>>(cacheKey);
        
        if (cached) {
            return { ...cached, cached: true };
        }

        try {
            const normalizedSymbols = symbols.map(s => this.normalizeSymbol(s));
            
            // #region agent log
            if (typeof fetch !== 'undefined') {
                fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HuggingFaceProvider.ts:264',message:'Attempting HF Engine request',data:{baseURL:this.client.defaults.baseURL,endpoint:'/api/market',symbols:normalizedSymbols},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2,H5'})}).catch(()=>{});
            }
            // #endregion
            
            const result = await this.withRetry(async () => {
                const response = await this.client.get('/api/market', {
                    params: {
                        limit,
                        symbols: normalizedSymbols.join(',')
                    }
                });
                return response.data;
            }, 'getMarketPrices');

            const prices = Array.isArray(result) ? result : result?.data || result?.prices || [];
            
            const response: HFResponse<MarketPrice[]> = {
                success: true,
                data: prices.map((item: any) => this.normalizeMarketPrice(item)),
                source: 'hf_engine',
                timestamp: Date.now(),
                cached: false
            };

            this.setCache(cacheKey, response);
            return response;
        } catch (error: any) {
            this.logger.error('❌ getMarketPrices failed', {}, error);
            return {
                success: false,
                error: error.message,
                source: 'hf_engine',
                timestamp: Date.now()
            };
        }
    }

    private normalizeMarketPrice(item: any): MarketPrice {
        const toNumber = (value: unknown, fallback = 0): number => {
            if (typeof value === 'number' && Number.isFinite(value)) return value;
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : fallback;
        };

        return {
            symbol: (item?.symbol || item?.ticker || '').toString().toUpperCase(),
            name: item?.name || item?.symbol,
            price: toNumber(item?.price ?? item?.lastPrice ?? item?.close),
            change24h: toNumber(item?.change24h ?? item?.change),
            changePercent24h: toNumber(item?.changePercent24h ?? item?.changePercent),
            volume24h: toNumber(item?.volume24h ?? item?.volume),
            source: 'hf_engine',
            timestamp: Date.now()
        };
    }

    public async getOHLCV(
        symbol: string,
        timeframe: string = '1h',
        limit: number = 1000
    ): Promise<HFResponse<OHLCVData[]>> {
        const cacheKey = `ohlcv_${symbol}_${timeframe}_${limit}`;
        const cached = this.getCached<HFResponse<OHLCVData[]>>(cacheKey);
        
        if (cached) {
            return { ...cached, cached: true };
        }

        try {
            const normalizedSymbol = this.normalizeSymbol(symbol);
            
            // #region agent log
            if (typeof fetch !== 'undefined') {
                fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HuggingFaceProvider.ts:337',message:'Attempting HF Engine OHLCV request',data:{baseURL:this.client.defaults.baseURL,endpoint:'/api/market/history',symbol:normalizedSymbol,timeframe,limit},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2,H3,H5'})}).catch(()=>{});
            }
            // #endregion
            
            const result = await this.withRetry(async () => {
                const response = await this.client.get('/api/market/history', {
                    params: {
                        symbol: normalizedSymbol,
                        timeframe,
                        limit
                    }
                });
                return response.data;
            }, 'getOHLCV');

            const ohlcv = Array.isArray(result) ? result : result?.data || [];
            
            const response: HFResponse<OHLCVData[]> = {
                success: true,
                data: ohlcv,
                source: 'hf_engine',
                timestamp: Date.now(),
                cached: false
            };

            this.setCache(cacheKey, response);
            return response;
        } catch (error: any) {
            this.logger.error('❌ getOHLCV failed', {}, error);
            return {
                success: false,
                error: error.message,
                source: 'hf_engine',
                timestamp: Date.now()
            };
        }
    }

    // ==================== SENTIMENT ANALYSIS ====================

    public async analyzeSentiment(text: string): Promise<HFResponse<SentimentResult>> {
        try {
            const result = await this.withRetry(async () => {
                const response = await this.client.post('/api/sentiment/analyze', {
                    text
                });
                return response.data;
            }, 'analyzeSentiment');

            const sentiment: SentimentResult = {
                label: result?.label || result?.[0]?.label || 'NEUTRAL',
                score: result?.score || result?.[0]?.score || 0,
                sentiment: result?.sentiment || result?.label || 'neutral',
                confidence: result?.confidence || result?.score || 0,
                text,
                timestamp: Date.now()
            };

            return {
                success: true,
                data: sentiment,
                source: 'hf_engine',
                timestamp: Date.now()
            };
        } catch (error: any) {
            this.logger.error('❌ analyzeSentiment failed', {}, error);
            return {
                success: false,
                error: error.message,
                source: 'hf_engine',
                timestamp: Date.now()
            };
        }
    }

    public async analyzeBatchSentiment(texts: string[]): Promise<HFResponse<SentimentResult[]>> {
        try {
            const results = await Promise.all(
                texts.map(text => this.analyzeSentiment(text))
            );

            const successfulResults = results
                .filter(r => r.success && r.data)
                .map(r => r.data!);

            return {
                success: successfulResults.length > 0,
                data: successfulResults,
                source: 'hf_engine',
                timestamp: Date.now()
            };
        } catch (error: any) {
            this.logger.error('❌ analyzeBatchSentiment failed', {}, error);
            return {
                success: false,
                error: error.message,
                source: 'hf_engine',
                timestamp: Date.now()
            };
        }
    }

    // ==================== TRENDING & NEWS ====================

    public async getTrendingCoins(limit: number = 10): Promise<HFResponse<TrendingCoin[]>> {
        const cacheKey = `trending_${limit}`;
        const cached = this.getCached<HFResponse<TrendingCoin[]>>(cacheKey);
        
        if (cached) {
            return { ...cached, cached: true };
        }

        try {
            // Use top market prices as trending
            const pricesResponse = await this.getMarketPrices([], limit);
            
            if (!pricesResponse.success || !pricesResponse.data) {
                throw new Error('Failed to get trending data');
            }

            const trending: TrendingCoin[] = pricesResponse.data.map((price, index) => ({
                symbol: price.symbol,
                name: price.name || price.symbol,
                rank: index + 1,
                price: price.price,
                change24h: price.changePercent24h
            }));

            const response: HFResponse<TrendingCoin[]> = {
                success: true,
                data: trending,
                source: 'hf_engine',
                timestamp: Date.now(),
                cached: false
            };

            this.setCache(cacheKey, response);
            return response;
        } catch (error: any) {
            this.logger.error('❌ getTrendingCoins failed', {}, error);
            return {
                success: false,
                error: error.message,
                source: 'hf_engine',
                timestamp: Date.now()
            };
        }
    }

    public async getLatestNews(limit: number = 20): Promise<HFResponse<NewsItem[]>> {
        const cacheKey = `news_latest_${limit}`;
        const cached = this.getCached<HFResponse<NewsItem[]>>(cacheKey);
        
        if (cached) {
            return { ...cached, cached: true };
        }

        try {
            const result = await this.withRetry(async () => {
                const response = await this.client.get('/api/news/latest', {
                    params: { limit }
                });
                return response.data;
            }, 'getLatestNews');

            const news = Array.isArray(result) ? result : result?.data || result?.news || [];
            
            const response: HFResponse<NewsItem[]> = {
                success: true,
                data: news,
                source: 'hf_engine',
                timestamp: Date.now(),
                cached: false
            };

            this.setCache(cacheKey, response);
            return response;
        } catch (error: any) {
            this.logger.warn('⚠️ getLatestNews failed, returning empty array', { error: error.message });
            return {
                success: true,
                data: [],
                source: 'hf_engine',
                timestamp: Date.now()
            };
        }
    }

    public async getModelsStatus(): Promise<HFResponse<any>> {
        try {
            const result = await this.withRetry(async () => {
                const response = await this.client.get('/api/models/status');
                return response.data;
            }, 'getModelsStatus');

            return {
                success: true,
                data: result,
                source: 'hf_engine',
                timestamp: Date.now()
            };
        } catch (error: any) {
            this.logger.warn('⚠️ getModelsStatus failed', { error: error.message });
            return {
                success: true,
                data: {
                    models: [],
                    available: 0,
                    loaded: 0,
                    status: 'unavailable'
                },
                source: 'hf_engine',
                timestamp: Date.now()
            };
        }
    }

    // ==================== UTILITIES ====================

    public listEndpoints(): string[] {
        return [
            '/api/health',
            '/api/market',
            '/api/market/history',
            '/api/sentiment/analyze',
            '/api/news/latest',
            '/api/models/status',
            '/api/providers'
        ];
    }

    // ==================== WEBSOCKET ====================

    /**
     * Helper to detect if error is a 403/auth error
     */
    private isLikelyAuthError(error: any): boolean {
        const msg = (error?.message || String(error)).toLowerCase();
        return msg.includes('403') || 
               msg.includes('forbidden') || 
               msg.includes('access denied') ||
               msg.includes('unauthorized') ||
               error?.code === 1008; // WebSocket close code for policy violation
    }

    /**
     * Update global WebSocket status for health endpoint visibility
     */
    private updateWSStatus(status: Partial<HFWebSocketStatus>): void {
        if (typeof global !== 'undefined') {
            global.__HF_WS_STATUS__ = {
                ...global.__HF_WS_STATUS__,
                ...status,
                hasToken: !!this.config.token,
                reconnectAttempts: this.wsReconnectAttempts,
                permanentFailure: this.wsPermanentFailure
            };
        }
    }

    public async connectWebSocket(): Promise<WebSocket | null> {
        // Check if WebSocket is disabled or permanently failed
        if (process.env.HF_WS_DISABLED === 'true') {
            this.logger.info('🔌 HF WebSocket disabled via HF_WS_DISABLED=true (using HTTP polling only)');
            this.updateWSStatus({ state: 'disabled', lastAttempt: Date.now() });
            return null;
        }

        if (this.wsPermanentFailure) {
            this.logger.debug('🔌 HF WebSocket permanently disabled due to persistent authentication failures');
            this.updateWSStatus({ 
                state: 'auth_error', 
                lastAttempt: Date.now(),
                lastError: 'Permanent auth failure after multiple 403 errors' 
            });
            return null;
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.logger.info('🔌 WebSocket already connected');
            return this.ws;
        }

        try {
            // Convert HTTP/HTTPS URL to WebSocket URL (ws:// or wss://)
            const wsUrl = this.config.baseUrl
                .replace(/^https/, 'wss')
                .replace(/^http/, 'ws') + '/ws';
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HuggingFaceProvider.ts:609',message:'HF WebSocket connection attempt START',data:{wsUrl,hasToken:!!this.config.token,attempt:this.wsReconnectAttempts+1,maxAttempts:this.wsMaxReconnectAttempts},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5,H6'})}).catch(()=>{});
            // #endregion
            
            // Warn if no token is configured
            if (!this.config.token) {
                this.logger.warn('⚠️ No HF_TOKEN detected. WebSocket auth may be rate-limited or disallowed.');
                this.logger.warn('   ACTION: Set HF_TOKEN in .env (token with "write" scope)');
                this.logger.warn('   Get token from: https://huggingface.co/settings/tokens');
            } else {
                // Verify token format and log that we're using it
                const tokenFormatValid = isValidTokenFormat(this.config.token);
                if (!tokenFormatValid) {
                    this.logger.warn('⚠️ HF_TOKEN format appears invalid (should start with "hf_" and be ~37 chars)');
                    this.logger.warn('   ACTION: Verify HF_TOKEN in .env file');
                } else {
                    this.logger.info('🔑 Using HF_TOKEN for WebSocket authentication', { 
                        tokenFormat: 'valid',
                        tokenLength: this.config.token.length,
                        note: 'Ensure token has "write" role at https://huggingface.co/settings/tokens'
                    });
                }
            }
            
            this.logger.info('🔌 Connecting to HF WebSocket', { 
                url: wsUrl,
                hasToken: !!this.config.token,
                tokenFormatValid: this.config.token ? isValidTokenFormat(this.config.token) : false
            });
            this.updateWSStatus({ state: 'disconnected', lastAttempt: Date.now() });

            // Create WebSocket with authentication header if token is present
            const wsOptions: any = {};
            if (this.config.token) {
                wsOptions.headers = {
                    'Authorization': `Bearer ${this.config.token}`
                };
                this.logger.debug('🔐 WebSocket connection will include Authorization header');
            } else {
                this.logger.debug('⚠️ WebSocket connection without authentication (may be rate-limited)');
            }

            this.ws = new WebSocket(wsUrl, wsOptions);

            this.ws.on('open', () => {
                this.logger.info('✅ HF WebSocket connected successfully');
                this.wsReconnectAttempts = 0; // Reset on successful connection
                this.updateWSStatus({ 
                    state: 'connected', 
                    connectedAt: Date.now(),
                    lastError: undefined 
                });
                this.startHeartbeat();
            });

            this.ws.on('message', (data: WebSocket.Data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleWebSocketMessage(message);
                } catch (error) {
                    this.logger.error('❌ Failed to parse WS message', {}, error as Error);
                }
            });

            this.ws.on('error', (error: any) => {
                const errorMessage = error?.message || String(error);
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HuggingFaceProvider.ts:632',message:'HF WebSocket ERROR event',data:{errorMessage,errorCode:error?.code,hasToken:!!this.config.token,attempt:this.wsReconnectAttempts+1,readyState:this.ws?.readyState},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5,H6'})}).catch(()=>{});
                // #endregion
                
                // Check for HTTP 403 (Forbidden) - indicates authentication issues
                if (this.isLikelyAuthError(error)) {
                    this.wsLastFailureCode = 403;
                    // Early exit after 3 auth failures
                    if (this.wsReconnectAttempts >= 2) {
                        this.wsPermanentFailure = true;
                        this.logger.error('❌ HF WebSocket permanently disabled (auth_error)', {
                            attempts: this.wsReconnectAttempts + 1,
                            hasToken: !!this.config.token,
                            tokenFormatValid: this.config.token ? isValidTokenFormat(this.config.token) : false,
                            suggestion: this.config.token 
                                ? '❌ Token exists but lacks "write" role OR token is expired/invalid'
                                : '❌ No token configured',
                            action: [
                                '1. Navigate to https://huggingface.co/settings/tokens',
                                '2. Create "New token" with "write" role (NOT "read" role)',
                                '3. Copy token and set HF_TOKEN=<new_token> in .env file',
                                '4. Restart server'
                            ],
                            workaround: 'Set HF_WS_DISABLED=true to prevent WS attempts until token fixed',
                            note: 'System will continue using HTTP polling fallback. WebSocket requires "write" role for interactive features.'
                        }, error);
                        this.updateWSStatus({ 
                            state: 'auth_error', 
                            lastError: `HTTP 403 after ${this.wsReconnectAttempts + 1} attempts`,
                            lastAttempt: Date.now()
                        });
                    } else {
                        this.logger.error('❌ HF WebSocket access denied (HTTP 403)', {
                            attempt: this.wsReconnectAttempts + 1,
                            maxAttempts: this.wsMaxReconnectAttempts,
                            hasToken: !!this.config.token,
                            tokenFormatValid: this.config.token ? isValidTokenFormat(this.config.token) : false,
                            action: this.config.token 
                                ? 'Token may lack "write" role or be expired. Verify at https://huggingface.co/settings/tokens - token MUST have "write" role for WebSocket access'
                                : 'Add HF_TOKEN to .env with token that has "write" role from https://huggingface.co/settings/tokens',
                            note: 'Will retry with exponential backoff. System continues with HTTP polling.'
                        }, error);
                        this.updateWSStatus({ 
                            state: 'auth_error', 
                            lastError: `HTTP 403 (attempt ${this.wsReconnectAttempts + 1})`,
                            lastAttempt: Date.now()
                        });
                    }
                } else {
                    this.wsLastFailureCode = null; // Reset on non-auth errors
                    this.logger.error('❌ HF WebSocket error', { 
                        errorMessage,
                        attempt: this.wsReconnectAttempts + 1,
                        note: 'Check network connectivity and HF Space availability.'
                    }, error);
                    this.updateWSStatus({ 
                        state: 'fallback_polling', 
                        lastError: errorMessage,
                        lastAttempt: Date.now()
                    });
                }
            });

            this.ws.on('close', (code: number, reason: Buffer) => {
                const reasonStr = reason?.toString() || '';
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HuggingFaceProvider.ts:663',message:'HF WebSocket CLOSE event',data:{code,reason:reasonStr,hasToken:!!this.config.token,attempt:this.wsReconnectAttempts,willRetry:!this.wsPermanentFailure},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5,H6'})}).catch(()=>{});
                // #endregion
                
                // Check for HTTP 403 in close reason
                const closeError = { message: reasonStr, code };
                if (this.isLikelyAuthError(closeError)) {
                    this.wsLastFailureCode = 403;
                    // Early exit after 2 auth failures
                    if (this.wsReconnectAttempts >= 2) {
                        this.wsPermanentFailure = true;
                        this.logger.error('❌ HF WebSocket permanently disabled (auth_error on close)', {
                            code,
                            reason: reasonStr,
                            attempts: this.wsReconnectAttempts + 1,
                            hasToken: !!this.config.token,
                            tokenFormatValid: this.config.token ? isValidTokenFormat(this.config.token) : false,
                            action: [
                                'Token requires "write" role for WebSocket access',
                                '1. Go to https://huggingface.co/settings/tokens',
                                '2. Create new token with "write" role (NOT "read")',
                                '3. Update HF_TOKEN in .env and restart server'
                            ],
                            workaround: 'Set HF_WS_DISABLED=true to disable WebSocket and use HTTP polling only'
                        });
                        this.updateWSStatus({ 
                            state: 'auth_error', 
                            lastError: `Close code ${code}: ${reasonStr || 'Auth failure'}`,
                            lastAttempt: Date.now()
                        });
                        this.stopHeartbeat();
                        return; // Don't retry on permanent failure
                    } else {
                        this.logger.warn('⚠️ HF WebSocket closed due to authentication failure', {
                            code,
                            reason: reasonStr,
                            attempt: this.wsReconnectAttempts + 1,
                            hasToken: !!this.config.token,
                            tokenFormatValid: this.config.token ? isValidTokenFormat(this.config.token) : false,
                            action: this.config.token 
                                ? 'Verify token has "write" role at https://huggingface.co/settings/tokens'
                                : 'Add HF_TOKEN with "write" role to .env file'
                        });
                        this.updateWSStatus({ 
                            state: 'auth_error', 
                            lastError: `Auth close (attempt ${this.wsReconnectAttempts + 1})`,
                            lastAttempt: Date.now()
                        });
                    }
                } else {
                    this.wsLastFailureCode = null; // Reset on non-auth errors
                    this.logger.warn('⚠️ HF WebSocket closed', { code, reason: reasonStr });
                    this.updateWSStatus({ 
                        state: 'fallback_polling', 
                        lastError: `Close code ${code}`,
                        lastAttempt: Date.now()
                    });
                }
                this.stopHeartbeat();
                this.reconnectWebSocket();
            });

            // Return the WebSocket object (connection may still be in progress)
            // Callers should check readyState or use isWebSocketConnected() to verify
            return this.ws;
        } catch (error) {
            this.logger.error('❌ Failed to connect HF WebSocket', {}, error as Error);
            this.logger.info('💡 System will continue using HTTP polling fallback');
            return null;
        }
    }

    private reconnectWebSocket(): void {
        // Don't retry if permanently failed or disabled
        if (this.wsPermanentFailure) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HuggingFaceProvider.ts:711',message:'HF WebSocket reconnect SKIPPED (permanent failure)',data:{permanentFailure:this.wsPermanentFailure,lastFailureCode:this.wsLastFailureCode,attempts:this.wsReconnectAttempts},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H6'})}).catch(()=>{});
            // #endregion
            this.logger.info('💡 System continues using HTTP polling fallback. WebSocket reconnection disabled.');
            this.updateWSStatus({ 
                state: this.wsLastFailureCode === 403 ? 'auth_error' : 'fallback_polling',
                lastError: 'Permanent failure - no further reconnect attempts'
            });
            return;
        }

        if (process.env.HF_WS_DISABLED === 'true') {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HuggingFaceProvider.ts:711',message:'HF WebSocket reconnect SKIPPED (disabled)',data:{disabled:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H6'})}).catch(()=>{});
            // #endregion
            this.updateWSStatus({ state: 'disabled' });
            return;
        }

        if (this.wsReconnectAttempts >= this.wsMaxReconnectAttempts) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HuggingFaceProvider.ts:715',message:'HF WebSocket max retries reached',data:{attempts:this.wsReconnectAttempts,maxAttempts:this.wsMaxReconnectAttempts,lastFailureCode:this.wsLastFailureCode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H6'})}).catch(()=>{});
            // #endregion
            this.logger.error('❌ Max WebSocket reconnect attempts reached', {
                attempts: this.wsReconnectAttempts,
                maxAttempts: this.wsMaxReconnectAttempts,
                lastFailureCode: this.wsLastFailureCode,
                suggestion: this.wsLastFailureCode === 403
                    ? 'Authentication failed. Verify HF_TOKEN or HUGGINGFACE_API_KEY. Set HF_WS_DISABLED=true to disable WebSocket.'
                    : 'Check network connectivity and HF Space availability. Set HF_WS_DISABLED=true to disable WebSocket.'
            });
            this.wsPermanentFailure = true;
            this.updateWSStatus({ 
                state: this.wsLastFailureCode === 403 ? 'auth_error' : 'fallback_polling',
                lastError: 'Max reconnect attempts exceeded'
            });
            return;
        }

        this.wsReconnectAttempts++;
        
        // Exponential backoff with jitter
        const baseDelay = this.wsReconnectDelay;
        const exponentialDelay = baseDelay * Math.pow(this.wsBackoffFactor, this.wsReconnectAttempts - 1);
        const jitter = exponentialDelay * 0.1 * (Math.random() * 2 - 1); // ±10% jitter
        const delay = Math.min(exponentialDelay + jitter, 60000); // Cap at 60 seconds

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HuggingFaceProvider.ts:728',message:'HF WebSocket reconnect scheduled',data:{attempt:this.wsReconnectAttempts,maxAttempts:this.wsMaxReconnectAttempts,delay:Math.round(delay),baseDelay,exponentialDelay,jitter,backoffFactor:this.wsBackoffFactor},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H6'})}).catch(()=>{});
        // #endregion

        this.logger.info(`🔄 Reconnecting WebSocket in ${Math.round(delay)}ms (attempt ${this.wsReconnectAttempts}/${this.wsMaxReconnectAttempts})`, {
            delay: Math.round(delay),
            backoffFactor: this.wsBackoffFactor,
            lastFailureCode: this.wsLastFailureCode
        });

        setTimeout(() => {
            this.connectWebSocket();
        }, delay);
    }

    private startHeartbeat(): void {
        this.wsHeartbeatInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000); // 30 seconds
    }

    private stopHeartbeat(): void {
        if (this.wsHeartbeatInterval) {
            clearInterval(this.wsHeartbeatInterval);
            this.wsHeartbeatInterval = null;
        }
    }

    private handleWebSocketMessage(message: any): void {
        // Call all registered handlers
        this.wsMessageHandlers.forEach(handler => {
            try {
                handler(message);
            } catch (error) {
                this.logger.error('❌ WS message handler error', {}, error as Error);
            }
        });
    }

    public onWebSocketMessage(handler: (message: any) => void): void {
        this.wsMessageHandlers.push(handler);
    }

    public async subscribeToMarketData(symbols: string[]): Promise<boolean> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.logger.warn('⚠️ Cannot subscribe: WebSocket not connected');
            return false;
        }

        try {
            this.ws.send(JSON.stringify({
                type: 'subscribe',
                channel: 'market_data',
                symbols: symbols.map(s => this.normalizeSymbol(s))
            }));
            this.wsSubscriptions.add('market_data');
            this.logger.info('✅ Subscribed to market data', { symbols });
            return true;
        } catch (error) {
            this.logger.error('❌ Failed to subscribe to market data', {}, error as Error);
            return false;
        }
    }

    public async subscribeToSentiment(): Promise<boolean> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return false;
        }

        try {
            this.ws.send(JSON.stringify({
                type: 'subscribe',
                channel: 'sentiment'
            }));
            this.wsSubscriptions.add('sentiment');
            this.logger.info('✅ Subscribed to sentiment updates');
            return true;
        } catch (error) {
            this.logger.error('❌ Failed to subscribe to sentiment', {}, error as Error);
            return false;
        }
    }

    public async subscribeToNews(): Promise<boolean> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return false;
        }

        try {
            this.ws.send(JSON.stringify({
                type: 'subscribe',
                channel: 'news'
            }));
            this.wsSubscriptions.add('news');
            this.logger.info('✅ Subscribed to news alerts');
            return true;
        } catch (error) {
            this.logger.error('❌ Failed to subscribe to news', {}, error as Error);
            return false;
        }
    }

    public async subscribeToTradingSignals(): Promise<boolean> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return false;
        }

        try {
            this.ws.send(JSON.stringify({
                type: 'subscribe',
                channel: 'trading_signals'
            }));
            this.wsSubscriptions.add('trading_signals');
            this.logger.info('✅ Subscribed to trading signals');
            return true;
        } catch (error) {
            this.logger.error('❌ Failed to subscribe to trading signals', {}, error as Error);
            return false;
        }
    }

    public disconnectWebSocket(): void {
        if (this.ws) {
            this.stopHeartbeat();
            this.ws.close();
            this.ws = null;
            this.wsSubscriptions.clear();
            this.logger.info('🔌 HF WebSocket disconnected');
        }
    }

    /**
     * Reset permanent failure flag and reconnect attempts
     * Useful after fixing authentication issues
     */
    public resetWebSocketFailure(): void {
        this.wsPermanentFailure = false;
        this.wsReconnectAttempts = 0;
        this.wsLastFailureCode = null;
        this.logger.info('🔄 WebSocket failure state reset - will attempt reconnection on next connect');
    }

    /**
     * Get WebSocket connection status and configuration
     */
    public getWebSocketStatus(): {
        connected: boolean;
        permanentFailure: boolean;
        reconnectAttempts: number;
        maxAttempts: number;
        disabled: boolean;
        hasToken: boolean;
    } {
        return {
            connected: this.isWebSocketConnected(),
            permanentFailure: this.wsPermanentFailure,
            reconnectAttempts: this.wsReconnectAttempts,
            maxAttempts: this.wsMaxReconnectAttempts,
            disabled: process.env.HF_WS_DISABLED === 'true',
            hasToken: !!this.config.token
        };
    }

    public isWebSocketConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    public getWSReconnectAttempts(): number {
        return this.wsReconnectAttempts;
    }

    public getWSSubscriptions(): string[] {
        return Array.from(this.wsSubscriptions);
    }
}

