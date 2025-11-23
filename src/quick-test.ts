// src/quick-test.ts - سرور ساده برای تست سریع
import express from 'express';
import { Logger } from './core/Logger.js';

const logger = Logger.getInstance();
const app = express();
const PORT = 3001;

app.use(express.json());

// Basic health endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Server is running',
    server: 'quick-test'
  });
});

// Simple market data test
app.get('/api/test/market', async (req, res) => {
  try {
    // Test direct API call without dependencies
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', { mode: "cors", headers: { "Content-Type": "application/json" } });
    const data = await response.json();
    
    res.json({
      success: true,
      bitcoin: data.bitcoin,
      source: 'coingecko',
      timestamp: Date.now()
    });
  } catch (error) {
    res.json({
      success: false,
      error: (error as Error).message,
      fallback: true,
      timestamp: Date.now()
    });
  }
});

app.listen(PORT, () => {
  logger.info(`✅ Quick test server running on port ${PORT}`);
  logger.info(`🔗 Health: http://localhost:${PORT}/api/health`);
  logger.info(`🔗 Market test: http://localhost:${PORT}/api/test/market`);
});

