/**
 * مثال یکپارچه‌سازی با Express
 */

import express from 'express';
import { TestingMiddleware, healthCheckWithTests } from '../src/testing';

const app = express();
const testingMiddleware = new TestingMiddleware();

// استفاده از middleware
app.use(testingMiddleware.metricsCollector());

// Routes
app.get('/api/health', healthCheckWithTests());

app.get('/api/test-metrics', testingMiddleware.getMetricsEndpoint());

app.get('/api/market/prices', (req, res) => {
  res.json({ BTC: 50000, ETH: 3000 });
});

app.post('/api/signals/generate', (req, res) => {
  res.json({ signal: 'BUY', confidence: 85 });
});

// Start server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 Test metrics: http://localhost:${PORT}/api/test-metrics`);
});

