# Quick Start Guide
## BOLT AI Local Development Setup

**Document Version:** 1.0  
**Last Updated:** 2025-11-06  
**Target Audience:** Developers setting up local environment  
**Estimated Time:** 15-30 minutes

---

## Prerequisites

### Required Software

| Software | Minimum Version | Recommended | Installation |
|----------|----------------|-------------|--------------|
| **Node.js** | 18.x | 20.x LTS | [nodejs.org](https://nodejs.org/) |
| **npm** | 9.x | 10.x | Included with Node.js |
| **Git** | 2.x | Latest | [git-scm.com](https://git-scm.com/) |

### Optional Software

| Software | Purpose | Installation |
|----------|---------|--------------|
| **Redis** | Performance caching (optional) | [redis.io](https://redis.io/) |
| **Docker** | Containerized deployment | [docker.com](https://www.docker.com/) |
| **VS Code** | Recommended IDE | [code.visualstudio.com](https://code.visualstudio.com/) |

### System Requirements

- **OS:** Windows 10/11, macOS 11+, Linux (Ubuntu 20.04+)
- **RAM:** 4 GB minimum, 8 GB recommended
- **Disk:** 2 GB free space
- **CPU:** 2 cores minimum, 4+ cores recommended

---

## Step 1: Clone Repository

```bash
# Clone the repository
git clone <repository-url> bolt-ai-crypto-agent
cd bolt-ai-crypto-agent

# Verify you're on the correct branch
git branch
# Output: * main (or your working branch)
```

---

## Step 2: Install Dependencies

```bash
# Install all dependencies (frontend + backend)
npm install

# This will install:
# - 36 production dependencies
# - 26 development dependencies
# - Optional: TensorFlow.js (may fail on some platforms, non-critical)
```

**Expected Output:**
```
added 200+ packages in 45s
```

**Troubleshooting:**

### Issue: TensorFlow.js Installation Fails

**Error:**
```
npm WARN optional SKIPPING OPTIONAL DEPENDENCY: @tensorflow/tfjs-node
```

**Solution:** This is OPTIONAL. AI features will fall back to neutral predictions.

**To fix (if needed):**
```bash
# On Linux/Mac
sudo apt-get install build-essential python3
npm install @tensorflow/tfjs-node

# On Windows
# Install Windows Build Tools first
npm install --global windows-build-tools
npm install @tensorflow/tfjs-node
```

### Issue: better-sqlite3 Native Module

**Error:**
```
Error: Cannot find module 'better-sqlite3'
```

**Solution:**
```bash
npm rebuild better-sqlite3
```

---

## Step 3: Configure Environment

### 3.1 Create `.env` File

```bash
# Copy example environment file
cp env.example .env

# Edit with your preferred editor
nano .env
# OR
code .env
```

### 3.2 Minimal Configuration (No API Keys)

**For basic functionality (local mock data):**

```bash
# .env file
PORT=3001
NODE_ENV=development

# Disable Redis (not required)
DISABLE_REDIS=true
```

**Save and close.**

✅ **You can run the application now!** API keys are optional for basic testing.

### 3.3 Full Configuration (With API Keys)

**For real market data and full features:**

```bash
# ============================================================================
# Server Configuration
# ============================================================================
PORT=3001
NODE_ENV=development

# ============================================================================
# Redis (Optional - improves performance)
# ============================================================================
DISABLE_REDIS=false
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# ============================================================================
# Market Data APIs (Optional - enables real-time data)
# ============================================================================

# CoinGecko (Free tier - no key required)
# API automatically uses free tier

# CryptoCompare (Free tier)
# Get from: https://min-api.cryptocompare.com/
CRYPTOCOMPARE_KEY=your_cryptocompare_api_key_here

# CoinMarketCap (Free tier: 333 requests/day)
# Get from: https://coinmarketcap.com/api/
CMC_API_KEY=your_coinmarketcap_api_key_here

# ============================================================================
# Blockchain APIs (Optional - for blockchain queries)
# ============================================================================

# Etherscan (Free tier)
# Get from: https://etherscan.io/apis
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# BscScan (Free tier)
# Get from: https://bscscan.com/apis
BSCSCAN_API_KEY=your_bscscan_api_key_here

# ============================================================================
# Exchange APIs (Optional - for real trading)
# ============================================================================

# KuCoin (Create API key in account settings)
# Get from: https://www.kucoin.com/account/api
KUCOIN_API_KEY=your_kucoin_api_key_here
KUCOIN_SECRET_KEY=your_kucoin_secret_key_here
KUCOIN_PASSPHRASE=your_kucoin_passphrase_here

# Binance (Create API key in account settings)
# Get from: https://www.binance.com/en/my/settings/api-management
BINANCE_API_KEY=your_binance_api_key_here
BINANCE_SECRET_KEY=your_binance_secret_key_here

# ============================================================================
# News & Sentiment (Optional)
# ============================================================================

# NewsAPI (Free tier: 100 requests/day)
# Get from: https://newsapi.org/
NEWSAPI_KEY=your_newsapi_key_here

# ============================================================================
# Notifications (Optional)
# ============================================================================

# Telegram Bot (Optional - for alerts)
# Create bot: https://t.me/BotFather
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_here
```

**Save and close.**

---

## Step 4: Verify Installation

```bash
# Check Node.js version
node --version
# Expected: v18.x.x or v20.x.x

# Check npm version
npm --version
# Expected: 9.x.x or 10.x.x

# Verify package.json scripts
npm run check
# Output: Node: v20.x.x, Platform: linux/darwin/win32, ✅ Ready to run!
```

---

## Step 5: Start Development Server

### Option A: Full Stack (Recommended)

**Starts both frontend and backend concurrently:**

```bash
npm run dev
```

**Expected Output:**
```
[vite] ready in 1234 ms
[vite] Local: http://localhost:5173
[vite] Network: http://192.168.1.x:5173

🚀 =========================================
   BOLT AI - 100% REAL DATA SERVER
   =========================================
✅ Server:    http://localhost:3001
✅ Health:    http://localhost:3001/api/health
✅ WebSocket: ws://localhost:3001/ws
```

**Access Points:**
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **Health Check:** http://localhost:3001/api/health

### Option B: Frontend Only

```bash
npm run dev:frontend
```

**Use Case:** Testing UI changes without backend

### Option C: Backend Only

```bash
npm run dev:backend:real
```

**Use Case:** Testing API endpoints without frontend

---

## Step 6: Verify Application is Running

### 6.1 Open Browser

Navigate to: http://localhost:5173

**Expected:** BOLT AI dashboard loads with:
- Navigation sidebar
- Market price tickers
- Signal panels
- Charts

### 6.2 Test Health Endpoint

```bash
curl http://localhost:3001/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "server": "BOLT AI - 100% Real Data",
  "timestamp": "2025-11-06T12:34:56.789Z",
  "port": 3001,
  "realDataSources": {
    "marketData": "CoinGecko + CryptoCompare + CoinMarketCap",
    "blockchain": "Etherscan + BscScan",
    "sentiment": "Fear & Greed Index",
    "whales": "ClankApp + Whale Alert",
    "ai": "TensorFlow.js",
    "patterns": "Real SMC/Elliott/Harmonic"
  }
}
```

### 6.3 Test Market Data

```bash
curl "http://localhost:3001/api/market/prices?symbols=BTC,ETH"
```

**Expected:** JSON response with BTC and ETH prices

### 6.4 Test WebSocket

```bash
# Install wscat if not already installed
npm install -g wscat

# Connect to WebSocket
wscat -c ws://localhost:3001/ws

# Expected output:
Connected (press CTRL+C to quit)
< {"type":"connected","message":"BOLT AI - 100% Real Data Stream Active"}
```

---

## Common Issues & Solutions

### Issue 1: Port 3001 Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solution:**

```bash
# Find process using port 3001
# On Linux/Mac:
lsof -i :3001

# On Windows:
netstat -ano | findstr :3001

# Kill the process
# Linux/Mac:
kill -9 <PID>

# Windows:
taskkill /PID <PID> /F

# OR: Let server auto-find free port (it will)
# The server automatically tries 3002, 3003, etc.
```

### Issue 2: Port 5173 Already in Use

**Error:**
```
Port 5173 is in use
```

**Solution:**

```bash
# Kill Vite process
pkill -f vite

# OR: Change port in vite.config.ts
# Change: server: { port: 5173 }
# To:     server: { port: 5174 }
```

### Issue 3: Database Permission Denied

**Error:**
```
Error: EACCES: permission denied, open './data/crypto-agent.db'
```

**Solution:**

```bash
# Create data directory with correct permissions
mkdir -p data
chmod 755 data

# If on Linux, check SELinux
sestatus
# If enforcing, may need to adjust permissions
```

### Issue 4: Module Not Found

**Error:**
```
Cannot find module '@/config/apiConfig'
```

**Solution:**

```bash
# Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild native modules
npm rebuild
```

### Issue 5: Redis Connection Failed

**Error:**
```
Redis connection failed, disabling cache
```

**Solution:**

**Option A: Install Redis (recommended)**
```bash
# On macOS:
brew install redis
brew services start redis

# On Ubuntu/Debian:
sudo apt-get install redis-server
sudo systemctl start redis

# On Windows:
# Download from: https://github.com/tporadowski/redis/releases
```

**Option B: Disable Redis (simpler)**
```bash
# In .env file, add:
DISABLE_REDIS=true
```

---

## Next Steps

### Explore the Application

1. **Dashboard View** — Overview of all features
2. **Charting View** — TradingView-style price charts
3. **Scanner View** — Multi-symbol signal scanner
4. **Trading View** — Order entry and position management
5. **Training View** — AI model training interface
6. **Backtest View** — Strategy backtesting
7. **Risk View** — Portfolio risk analysis
8. **Health View** — System monitoring
9. **Settings View** — Configuration management

### API Testing

**Using curl:**
```bash
# Get real-time prices
curl "http://localhost:3001/api/market/prices?symbols=BTC,ETH,SOL"

# Get AI prediction
curl "http://localhost:3001/api/ai/predict?symbol=BTC"

# Get signal history
curl "http://localhost:3001/api/signals/history?limit=10"
```

**Using Postman/Insomnia:**

1. Import OpenAPI spec (TODO: generate from endpoints)
2. Set base URL: `http://localhost:3001`
3. Test all endpoints from [ENDPOINTS.md](./ENDPOINTS.md)

### Development Workflow

```bash
# Make code changes

# Run tests
npm test

# Run linter
npm run lint

# Build for production
npm run build

# Build frontend only
npm run build:frontend

# Preview production build
npm run preview
```

---

## Docker Deployment (Optional)

### Build Docker Image

```bash
# Build multi-stage image
docker build -t bolt-ai:latest .

# Expected: "Successfully built ..."
```

### Run Container

```bash
docker run -d \
  --name bolt-ai \
  -p 3001:3001 \
  -p 5173:5173 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  --env-file .env \
  bolt-ai:latest

# Check logs
docker logs -f bolt-ai

# Stop container
docker stop bolt-ai

# Remove container
docker rm bolt-ai
```

---

## Development Tips

### Hot Module Replacement (HMR)

- Frontend changes auto-reload (Vite HMR)
- Backend changes auto-restart (tsx watch)
- No need to manually restart during development

### Debugging

**VS Code Launch Configuration:**

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev:backend:real"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

**Chrome DevTools for Node:**
```bash
node --inspect src/server-real-data.ts
# Open chrome://inspect in Chrome
```

### Database Management

```bash
# View database with SQLite CLI
sqlite3 data/crypto-agent.db

# Show tables
.tables

# Query market data
SELECT * FROM market_data LIMIT 10;

# Exit
.exit
```

### Logs

```bash
# Tail application logs
tail -f logs/bolt-ai-$(date +%Y-%m-%d).log

# Search logs for errors
grep -i error logs/bolt-ai-*.log
```

---

## Production Deployment Checklist

Before deploying to production, ensure:

- [ ] Environment variables configured for production
- [ ] `NODE_ENV=production` set
- [ ] API keys added to secure secret storage
- [ ] Database backup configured
- [ ] HTTPS enabled (reverse proxy)
- [ ] Authentication implemented (see [RISK_NOTES.md](./RISK_NOTES.md))
- [ ] Rate limiting configured
- [ ] CORS origins restricted
- [ ] Error logging to external service (Sentry, etc.)
- [ ] Monitoring configured (health checks, alerts)
- [ ] Load testing completed
- [ ] Security audit passed

**See:** [RISK_NOTES.md](./RISK_NOTES.md) for security requirements

---

## Getting Help

### Documentation

- [REPORT.md](./REPORT.md) — Project overview
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System architecture
- [ENDPOINTS.md](./ENDPOINTS.md) — API reference
- [DATA_MODEL.md](./DATA_MODEL.md) — Database schema

### Logs

Check logs for detailed error messages:
```bash
ls logs/
cat logs/bolt-ai-$(date +%Y-%m-%d).log
```

### Community

- **Issues:** Report bugs via GitHub Issues
- **Discussions:** Ask questions in GitHub Discussions
- **Contributions:** See CONTRIBUTING.md

---

## Success Checklist

At this point, you should have:

- ✅ Dependencies installed
- ✅ Environment configured
- ✅ Frontend accessible at http://localhost:5173
- ✅ Backend API responding at http://localhost:3001
- ✅ WebSocket connection working
- ✅ Health check passing
- ✅ Basic market data loading
- ✅ AI predictions working (or gracefully degrading)

**Congratulations!** 🎉 You're ready to develop with BOLT AI.

---

**Document Maintained By:** Cursor AI Agent  
**Tested On:** macOS, Linux, Windows 11  
**Last Verified:** 2025-11-06  
**Confidence:** HIGH
