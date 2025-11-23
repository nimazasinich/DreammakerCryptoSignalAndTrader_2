// Minimal working server for testing connectivity
import express from 'express';
import { Logger } from './core/Logger.js';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const logger = Logger.getInstance();
const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    logger.info(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Health endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        server: 'running',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// Test prices endpoint
app.get('/api/market/prices', (req, res) => {
    const symbols = req.query.symbols?.toString().split(',') || ['BTCUSDT', 'ETHUSDT'];
    
    const prices = (symbols || []).map(symbol => {
        // Handle both BTCUSDT and BTC formats
        const baseSymbol = symbol.replace('USDT', '').toUpperCase();
        const symbolMap: Record<string, string> = {
            'BTC': 'BTCUSDT',
            'ETH': 'ETHUSDT',
            'SOL': 'SOLUSDT',
            'TRX': 'TRXUSDT',
            'ADA': 'ADAUSDT',
            'BNB': 'BNBUSDT'
        };
        const fullSymbol = symbolMap[baseSymbol] || symbol;
        
        return {
            symbol: fullSymbol,
            price: Math.random() * 50000 + 1000,
            change24h: (Math.random() - 0.5) * 10,
            changePercent24h: (Math.random() - 0.5) * 10,
            volume: Math.random() * 1000000,
            timestamp: Date.now()
        };
    });
    
    res.json({ success: true, data: prices, prices });
});

// Portfolio endpoint
app.get('/api/portfolio', (req, res) => {
    res.json({
        success: true,
        data: {
            totalValue: 127549.32,
            totalChangePercent: 12.4,
            dayPnL: 3247.89,
            dayPnLPercent: 2.61,
            activePositions: 8
        },
        portfolio: {
            totalValue: 127549.32,
            totalChangePercent: 12.4,
            dayPnL: 3247.89,
            dayPnLPercent: 2.61,
            activePositions: 8
        }
    });
});

// Signals history endpoint
app.get('/api/signals/history', (req, res) => {
    const limit = parseInt(req.query.limit?.toString() || '20');
    const history = Array.from({ length: Math.min(limit, 10) }, (_, i) => {
        const actions: ('BUY' | 'SELL' | 'HOLD')[] = ['BUY', 'SELL', 'HOLD'];
        const action = actions[Math.floor(Math.random() * 3)];
        const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];
        const timeframe = timeframes[Math.floor(Math.random() * timeframes.length)];
        
        return {
            id: i + 1,
            symbol: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'BNBUSDT'][Math.floor(Math.random() * 5)],
            action: action,
            confidence: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
            confluence: Math.floor(Math.random() * 11), // 0 to 10
            timeframe: timeframe,
            timestamp: Date.now() - i * 60000,
            entry: Math.random() * 50000 + 1000,
            stopLoss: Math.random() * 49000 + 950,
            takeProfit: Math.random() * 52000 + 1100,
            reasoning: [
                `Strong ${action} signal detected`,
                `Confidence level: ${Math.floor(Math.random() * 100)}%`,
                `Market conditions favorable`
            ]
        };
    });
    
    res.json({ success: true, data: history, history });
});

// Signals statistics endpoint
app.get('/api/signals/statistics', (req, res) => {
    res.json({
        success: true,
        statistics: {
            accuracy: 0.873,
            totalSignals: 24
        }
    });
});

// Sentiment endpoint
app.get('/api/sentiment/fear-greed', (req, res) => {
    res.json({
        success: true,
        data: {
            value: Math.floor(Math.random() * 100),
            classification: ['Extreme Fear', 'Fear', 'Neutral', 'Greed', 'Extreme Greed'][Math.floor(Math.random() * 5)],
            timestamp: Date.now()
        }
    });
});

// News endpoint
app.get('/api/news/latest', (req, res) => {
    const limit = parseInt(req.query.limit?.toString() || '20');
    const news = Array.from({ length: Math.min(limit, 10) }, (_, i) => ({
        id: i + 1,
        title: `Crypto News ${i + 1}`,
        source: 'CryptoPanic',
        publishedAt: new Date(Date.now() - i * 3600000).toISOString(),
        url: `https://example.com/news/${i + 1}`,
        sentiment: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)]
    }));
    
    res.json({
        success: true,
        data: news
    });
});

// Whale transactions endpoint
app.get('/api/whale/transactions', (req, res) => {
    const symbol = req.query.symbol?.toString() || 'BTCUSDT';
    const transactions = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        symbol,
        amount: Math.random() * 1000 + 100,
        value: Math.random() * 10000000 + 1000000,
        type: ['buy', 'sell'][Math.floor(Math.random() * 2)],
        timestamp: Date.now() - i * 60000,
        exchange: ['Binance', 'Coinbase', 'Kraken'][Math.floor(Math.random() * 3)]
    }));
    
    res.json({
        success: true,
        data: transactions
    });
});

// Positions endpoint
app.get('/api/positions', (req, res) => {
    const symbol = req.query.symbol?.toString();
    const positions = [
        {
            symbol: 'BTCUSDT',
            side: 'LONG',
            size: 0.5,
            entryPrice: 45000,
            currentPrice: 46500,
            unrealizedPnl: 750,
            unrealizedPnlPercent: 3.33,
            leverage: 10,
            margin: 2250,
            timestamp: Date.now() - 3600000
        },
        {
            symbol: 'ETHUSDT',
            side: 'LONG',
            size: 2.5,
            entryPrice: 3200,
            currentPrice: 3180,
            unrealizedPnl: -50,
            unrealizedPnlPercent: -0.625,
            leverage: 5,
            margin: 1600,
            timestamp: Date.now() - 7200000
        }
    ];
    
    const filtered = symbol 
        ? positions.filter(p => p.symbol === symbol)
        : positions;
    
    res.json({
        success: true,
        positions: filtered,
        count: filtered.length,
        data: filtered
    });
});

// Training metrics endpoint
app.get('/api/training-metrics', (req, res) => {
    const limit = parseInt(req.query.limit?.toString() || '100');
    const metrics = Array.from({ length: Math.min(limit, 50) }, (_, i) => ({
        id: i + 1,
        epoch: i + 1,
        loss: Math.random() * 0.5 + 0.1,
        accuracy: Math.random() * 0.3 + 0.7,
        precision: Math.random() * 0.2 + 0.75,
        recall: Math.random() * 0.2 + 0.75,
        f1Score: Math.random() * 0.2 + 0.75,
        timestamp: Date.now() - (limit - i) * 60000
    }));
    
    res.json(metrics);
});

// Historical market data endpoint
app.get('/api/market/historical', (req, res) => {
    const symbol = req.query.symbol?.toString() || 'BTCUSDT';
    const timeframe = req.query.timeframe?.toString() || '1h';
    const limit = parseInt(req.query.limit?.toString() || '100');
    
    // Generate mock OHLCV data
    const basePrice = 45000;
    const data = Array.from({ length: Math.min(limit, 200) }, (_, i) => {
        const priceChange = (Math.random() - 0.5) * 1000;
        const open = basePrice + priceChange;
        const close = open + (Math.random() - 0.5) * 500;
        const high = Math.max(open, close) + Math.random() * 200;
        const low = Math.min(open, close) - Math.random() * 200;
        
        return {
            symbol,
            timestamp: Date.now() - (limit - i) * 3600000, // 1 hour intervals
            open: parseFloat(open.toFixed(2)),
            high: parseFloat(high.toFixed(2)),
            low: parseFloat(low.toFixed(2)),
            close: parseFloat(close.toFixed(2)),
            volume: Math.random() * 1000000,
            interval: timeframe
        };
    });
    
    res.json({
        success: true,
        data: data
    });
});

// WebSocket server at root path
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    logger.info('✅ WebSocket client connected');
    ws.send(JSON.stringify({ type: 'connected', message: 'Welcome to BOLT AI!' }));
    
    // Send test data every 5 seconds
    const interval = setInterval(() => {
        ws.send(JSON.stringify({
            type: 'price_update',
            symbol: 'BTCUSDT',
            price: Math.random() * 50000 + 1000,
            timestamp: Date.now()
        }));
    }, 5000);
    
    ws.on('close', () => {
        clearInterval(interval);
        logger.info('❌ WebSocket client disconnected');
    });
    
    ws.on('error', (error) => {
        logger.error('❌ WebSocket error:', {}, error);
    });
});

// WebSocket server at /ws endpoint (for frontend compatibility)
const wsServer = new WebSocketServer({ server, path: '/ws' });

wsServer.on('connection', (ws) => {
    logger.info('✅ WebSocket client connected to /ws');
    ws.send(JSON.stringify({ type: 'connected', message: 'Welcome to BOLT AI!' }));
    
    // Send test data every 5 seconds
    const interval = setInterval(() => {
        ws.send(JSON.stringify({
            type: 'price_update',
            symbol: 'BTCUSDT',
            price: Math.random() * 50000 + 1000,
            timestamp: Date.now()
        }));
    }, 5000);
    
    ws.on('close', () => {
        clearInterval(interval);
        logger.info('❌ WebSocket client disconnected from /ws');
    });
    
    ws.on('error', (error) => {
        logger.error('❌ WebSocket error:', {}, error);
    });
});

// Start server
server.listen(PORT, () => {
    logger.info('\n🚀 =========================================');
    logger.info(`   BOLT AI SIMPLE SERVER RUNNING`);
    logger.info('   =========================================');
    logger.info(`✅ Health:    http://localhost:${PORT}/api/health`);
    logger.info(`✅ Prices:    http://localhost:${PORT}/api/market/prices`);
    logger.info(`✅ WebSocket: ws://localhost:${PORT}/ws`);
    logger.info('🚀 =========================================\n');
});

// Error handling
server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${PORT} is already in use!`);
        logger.error('   Kill existing process or use a different port');
        process.exit(1);
    }
    logger.error('❌ Server error:', {}, error.message);
});

// Graceful shutdown
process.on('SIGINT', () => {
    logger.info('\n\n🛑 Shutting down server gracefully...');
    server.close(() => {
        logger.info('✅ Server closed');
        process.exit(0);
    });
});

process.on('uncaughtException', (error) => {
    logger.error('❌ Uncaught Exception:', {}, error);
});

process.on('unhandledRejection', (reason, promise) => {
    const errorObj = reason instanceof Error ? reason : new Error(String(reason));
    logger.error('❌ Unhandled Rejection at:', {}, errorObj);
});

