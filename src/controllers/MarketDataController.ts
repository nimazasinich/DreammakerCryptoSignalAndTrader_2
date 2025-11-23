// src/controllers/MarketDataController.ts
import { Request, Response } from 'express';
import { Logger } from '../core/Logger.js';
import { Database } from '../data/Database.js';
import { SentimentNewsService } from '../services/SentimentNewsService.js';
import { BinanceService } from '../services/BinanceService.js';
import { ConfigManager } from '../core/ConfigManager.js';
import { AdvancedCache } from '../core/AdvancedCache.js';
import { HFDataEngineAdapter } from '../services/HFDataEngineAdapter.js';
import { createErrorResponse } from '../utils/errorResponse.js';

export class MarketDataController {
  private logger = Logger.getInstance();
  private database = Database.getInstance();
  private sentimentNewsService = SentimentNewsService.getInstance();
  private binanceService = BinanceService.getInstance();
  private config = ConfigManager.getInstance();
  private cache = AdvancedCache.getInstance();

  async getPrices(req: Request, res: Response): Promise<void> {
    try {
      const { symbols, limit } = req.query;
      const useRealData = this.config.isRealDataMode();

      if (!useRealData) {
        const symbolList = typeof symbols === 'string'
          ? symbols.split(',')
          : ['BTCUSDT', 'ETHUSDT'];

        const prices = await Promise.all(
          (symbolList || []).map(async (symbol: string) => {
            try {
              const trimmed = symbol.trim();
              const price = await this.binanceService.getCurrentPrice(trimmed);
              const ticker = await this.binanceService.get24hrTicker(trimmed);

              return {
                symbol: trimmed.toUpperCase(),
                price,
                change24h: parseFloat(ticker.priceChange || '0'),
                changePercent24h: parseFloat(ticker.priceChangePercent || '0'),
                volume: parseFloat(ticker.volume || '0'),
                timestamp: Date.now()
              };
            } catch (error) {
              this.logger.error('Failed to fetch price for symbol', { symbol }, error as Error);
              return createErrorResponse({
                source: 'binance',
                reason: 'UPSTREAM_UNAVAILABLE',
                message: (error as Error).message,
                details: { symbol }
              });
            }
          })
        );

        return res.json({
          success: true,
          prices,
          source: 'binance',
          timestamp: Date.now()
        });
      }

      const symbolList = typeof symbols === 'string'
        ? symbols.split(',').map(s => s.trim().replace('USDT', ''))
        : ['BTC', 'ETH', 'ADA', 'DOT', 'LINK'];
      const limitNumber = Number(limit);

      const cacheKey = `hf:prices:${symbolList.join(',')}:${limitNumber || ''}`;
      const prices = await this.cache.getOrSet(
        cacheKey,
        async () => {
          const result = await HFDataEngineAdapter.getMarketPrices(
            Number.isFinite(limitNumber) && limitNumber > 0 ? limitNumber : undefined,
            symbolList
          );

          if (!result.ok) {
            throw Object.assign(new Error(result.message), { status: result.status, payload: result });
          }

          return result;
        },
        { ttl: 10, tags: ['market-prices'] }
      );

      if (!prices?.ok) {
        const status = prices?.status ?? 503;
        return res.status(status).json(prices);
      }

      res.json({
        success: true,
        prices: prices.data,
        source: prices.source,
        timestamp: Date.now()
      });
    } catch (error) {
      const status = (error as any)?.status ?? 500;
      const payload = (error as any)?.payload;
      this.logger.error('Failed to fetch market prices', {}, error as Error);
      res.status(status).json(
        payload ||
        createErrorResponse({
          source: 'market',
          reason: 'HF_ENGINE_ERROR',
          message: (error as Error).message
        })
      );
    }
  }

  async getMarketData(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.params;
      const { interval = '1h', limit = 100 } = req.query;

      this.logger.info('Fetching market data', { symbol, interval, limit });

      const cacheKey = `market-data:${symbol}:${interval}:${limit}`;
      const cachedData = await this.cache.getOrSet(
        cacheKey,
        async () => {
          const data = await this.database.getMarketData(
            symbol.toUpperCase(),
            interval as string,
            Number(limit)
          );

          if ((data?.length || 0) > 0) {
            return data;
          }

          // Fetch from multi-provider service if no cached data
          try {
            const symbolWithoutUSDT = symbol.replace('USDT', '').toUpperCase();
            const getIntervalMinutes = (interval: string): number => {
              const intervalMap: Record<string, number> = {
                '1m': 1, '5m': 5, '15m': 15, '30m': 30,
                '1h': 60, '4h': 240, '1d': 1440
              };
              return intervalMap[interval] || 60;
            };
            
            const days = Math.ceil(Number(limit) * getIntervalMinutes(interval as string) / 1440);
            const ohlcvData = await this.multiProviderService.getHistoricalData(
              symbolWithoutUSDT,
              interval as string,
              days
            );

            // Convert to MarketData format
            const marketData = (ohlcvData || []).map(data => ({
              symbol: symbol.toUpperCase(),
              timestamp: data.timestamp,
              open: data.open,
              high: data.high,
              low: data.low,
              close: data.close,
              volume: data.volume,
              interval: data.interval || interval as string
            }));

            // Store in database
            for (const dataPoint of marketData) {
              await this.database.insertMarketData(dataPoint);
            }

            return marketData;
          } catch (error) {
            this.logger.warn('Multi-provider failed, trying Binance fallback', {}, error as Error);
            // Fallback to Binance
            const marketData = await this.binanceService.getKlines(
              symbol,
              interval as string,
              Number(limit)
            );

            for (const dataPoint of marketData) {
              await this.database.insertMarketData(dataPoint);
            }

            return marketData;
          }
        },
        { ttl: 60, tags: ['market-data', symbol.toUpperCase()] }
      );

      res.json(cachedData);
    } catch (error) {
      this.logger.error('Failed to fetch market data', {
        symbol: req.params.symbol
      }, error as Error);

      res.status(500).json({
        error: 'Failed to fetch market data',
        message: (error as Error).message
      });
    }
  }

  async getCurrentPrice(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.params;
      
      if (this.config.isRealDataMode()) {
        const cleanSymbol = symbol.replace('USDT', '').toUpperCase();
        const cacheKey = `hf:price:${cleanSymbol}`;

        const priceResult = await this.cache.getOrSet(
          cacheKey,
          async () => {
            const result = await HFDataEngineAdapter.getMarketPrices(1, [cleanSymbol]);
            if (!result.ok) {
              throw Object.assign(new Error(result.message), { status: result.status, payload: result });
            }
            return result;
          },
          { ttl: 10, tags: ['price', cleanSymbol] }
        );

        if (!priceResult?.ok) {
          const status = priceResult?.status ?? 503;
          return res.status(status).json(priceResult);
        }

        const priceData = priceResult.data[0];
        return res.json({
          symbol: priceData?.symbol || cleanSymbol,
          price: priceData?.price ?? 0,
          timestamp: priceData?.timestamp ?? Date.now(),
          source: priceResult.source
        });
      } else {
        const price = await this.binanceService.getCurrentPrice(symbol);
        res.json({ symbol, price, timestamp: Date.now() });
      }
    } catch (error) {
      this.logger.error('Failed to fetch current price', {
        symbol: req.params.symbol
      }, error as Error);

      res.status(500).json({
        error: 'Failed to fetch current price',
        message: (error as Error).message
      });
    }
  }

  async getLatestNews(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 20 } = req.query;
      const cacheKey = `news:latest:${limit}`;
      
      const news = await this.cache.getOrSet(
        cacheKey,
        async () => {
          return await this.sentimentNewsService.getCryptoNews(Number(limit));
        },
        { ttl: 300, tags: ['news'] }
      );

      res.json({
        success: true,
        news,
        count: news.length,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to fetch latest news', {}, error as Error);
      res.status(500).json({
        error: 'Failed to fetch latest news',
        message: (error as Error).message
      });
    }
  }

  async getSentiment(req: Request, res: Response): Promise<void> {
    try {
      const { keyword } = req.query;
      const cacheKey = keyword ? `sentiment:keyword:${keyword}` : 'sentiment:market';
      
      const sentiment = await this.cache.getOrSet(
        cacheKey,
        async () => {
          if (keyword && typeof keyword === 'string') {
            return await this.sentimentNewsService.analyzeKeywordSentiment(keyword);
          }
          return await this.sentimentNewsService.getAggregatedSentiment();
        },
        { ttl: 600, tags: ['sentiment'] }
      );

      res.json({
        success: true,
        sentiment,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to fetch market sentiment', {}, error as Error);
      res.status(500).json({
        error: 'Failed to fetch market sentiment',
        message: (error as Error).message
      });
    }
  }

  async testRealData(req: Request, res: Response): Promise<void> {
    try {
      if (!this.config.isRealDataMode()) {
        res.status(400).json({
          error: 'Real data mode is not enabled',
          message: 'Enable realDataMode in config to use this endpoint'
        });
        return;
      }

      const marketPrices = await HFDataEngineAdapter.getMarketPrices(1, ['BTC']);
      if (!marketPrices.ok) {
        const status = marketPrices.status ?? 503;
        return res.status(status).json(marketPrices);
      }

      const btcPrice = marketPrices.data[0];
      const sentiment = await this.sentimentNewsService.getAggregatedSentiment();

      res.json({
        success: true,
        realDataMode: true,
        test: {
          btc: {
            symbol: btcPrice.symbol,
            price: btcPrice.price,
            change24h: btcPrice.change24h,
            volume: btcPrice.volume24h,
            source: btcPrice.source,
            timestamp: btcPrice.timestamp
          },
          sentiment: {
            overallSentiment: sentiment.overallSentiment,
            overallScore: sentiment.overallScore,
            fearGreedIndex: sentiment.fearGreedIndex,
            newsSentiment: sentiment.newsSentiment,
            timestamp: sentiment.timestamp
          }
        },
        config: {
          primarySource: this.config.getExchangeConfig().primarySource,
          fallbackSources: this.config.getExchangeConfig().fallbackSources,
          tradingEnabled: this.config.getExchangeConfig().tradingEnabled
        },
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to test real data', {}, error as Error);
      res.status(500).json({
        error: 'Failed to test real data',
        message: (error as Error).message,
        stack: (error as Error).stack
      });
    }
  }
}

