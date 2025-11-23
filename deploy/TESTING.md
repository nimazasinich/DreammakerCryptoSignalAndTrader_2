# Local Testing & Release Guide

## Quick Start

```bash
# 1. Setup environment (first time only)
cd deploy
cp .env.prod.template .env.prod
# Edit .env.prod with your actual values

# 2. Run comprehensive test suite
./test-local.sh

# 3. Or run manually
docker compose -f docker-compose.prod.yml up -d --build
```

## Manual Testing Commands

### Basic Health Checks

```bash
# Nginx root (SPA)
curl -sI http://localhost            # Should return 200 OK

# Health endpoint (via Nginx)
curl -s http://localhost/status/health

# System status
curl -s "http://localhost/api/system/status" | jq .

# Metrics (direct to server, port 8000)
curl -s http://localhost:8000/metrics | head -20
```

### HuggingFace API Endpoints

```bash
# OHLCV data (via HF proxy)
curl -s "http://localhost/api/hf/ohlcv?symbol=BTCUSDT&timeframe=1h&limit=120" | jq .

# Sentiment analysis
curl -s -X POST "http://localhost/api/hf/sentiment" \
  -H "content-type: application/json" \
  -d '{"texts":["BTC to the moon","ETH looks weak"]}' | jq .

# Price prediction
curl -s -X POST "http://localhost/api/hf/predict-price" \
  -H "content-type: application/json" \
  -d '{"symbol":"BTCUSDT","timeframe":"1h"}' | jq .
```

### Crypto Resources Ultimate Endpoints

```bash
# OHLCV data (via crypto_resources_ultimate)
curl -s "http://localhost/api/crypto/ohlcv?symbol=BTCUSDT&timeframe=1h&limit=600" | jq .

# Multiple symbols
curl -s "http://localhost/api/crypto/ohlcv-multi?symbols=BTCUSDT,ETHUSDT&timeframe=1h&limit=100" | jq .
```

### Redis Testing

```bash
# Check Redis connectivity
docker exec -it $(docker ps --format '{{.Names}}' | grep redis) redis-cli ping

# Test cache effect (2nd call should be faster)
time curl -s "http://localhost/api/crypto/ohlcv?symbol=BTCUSDT&timeframe=1h&limit=600" > /dev/null
time curl -s "http://localhost/api/crypto/ohlcv?symbol=BTCUSDT&timeframe=1h&limit=600" > /dev/null

# View cached keys
docker exec -it $(docker ps --format '{{.Names}}' | grep redis) redis-cli KEYS '*'
```

### WebSocket Testing

```bash
# Using websocat (recommended)
websocat ws://localhost/ws

# Using wscat (npm)
npx wscat -c ws://localhost/ws
```

### Container Management

```bash
# View running containers
docker compose -f docker-compose.prod.yml ps

# View logs (all services)
docker compose -f docker-compose.prod.yml logs -f --tail=200

# View logs (specific service)
docker compose -f docker-compose.prod.yml logs -f server
docker compose -f docker-compose.prod.yml logs -f client
docker compose -f docker-compose.prod.yml logs -f redis

# Restart services
docker compose -f docker-compose.prod.yml restart

# Stop all services
docker compose -f docker-compose.prod.yml down

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build
```

## Troubleshooting

### Port Conflicts

```bash
# Check what's using port 80
lsof -i :80 -sTCP:LISTEN || ss -lntp | grep ':80 '

# Check what's using port 8000
lsof -i :8000 -sTCP:LISTEN || ss -lntp | grep ':8000 '

# Check what's using port 6379 (Redis)
lsof -i :6379 -sTCP:LISTEN || ss -lntp | grep ':6379 '
```

### Health Check Issues

```bash
# Check container health status
docker compose -f docker-compose.prod.yml ps

# Direct health check (bypassing Nginx)
curl -s http://localhost:8000/status/health

# Nginx proxied health check
curl -s http://localhost/status/health

# Inspect container
docker inspect $(docker ps -qf "name=server") | jq '.[0].State.Health'
```

### Network Issues

```bash
# Test server directly (bypass Nginx)
curl -s http://localhost:8000/api/system/status

# Test Nginx configuration
docker compose -f docker-compose.prod.yml exec client nginx -t

# Restart Nginx
docker compose -f docker-compose.prod.yml restart client
```

### Database/Cache Issues

```bash
# Check Redis memory usage
docker exec $(docker ps --format '{{.Names}}' | grep redis) redis-cli INFO memory

# Clear Redis cache
docker exec $(docker ps --format '{{.Names}}' | grep redis) redis-cli FLUSHALL

# Monitor Redis in real-time
docker exec $(docker ps --format '{{.Names}}' | grep redis) redis-cli MONITOR
```

## Release to Production

### 1. Tag and Push (Triggers CI/CD)

```bash
# Create and push a tag
git tag v1.0.0
git push origin v1.0.0

# Or create a release tag
git tag -a v1.0.0 -m "Release v1.0.0: Add trading signals"
git push origin v1.0.0
```

### 2. GitHub Actions Workflow

The `cd.yml` workflow will:
1. Build Docker images
2. Push to GitHub Container Registry (GHCR)
3. SSH to your production server
4. Pull latest images
5. Restart services with zero-downtime

### 3. Required GitHub Secrets

Ensure these are set in your repository settings:

```
SSH_HOST         # Production server IP/hostname
SSH_USER         # SSH username
SSH_KEY          # Private SSH key
SSH_PORT         # SSH port (optional, defaults to 22)

HUGGINGFACE_API_KEY    # HuggingFace API key
REDIS_URL              # Redis connection string (optional)
TELEGRAM_BOT_TOKEN     # Telegram bot token (optional)
TELEGRAM_CHAT_ID       # Telegram chat ID (optional)
```

### 4. Monitor Deployment

```bash
# SSH to production server
ssh user@your-server

# Check running containers
docker ps

# View logs
docker logs -f <container-name>

# Check health
curl http://localhost/status/health
```

## Performance Testing

### Load Testing with Apache Bench

```bash
# Test health endpoint
ab -n 1000 -c 10 http://localhost/status/health

# Test API endpoint
ab -n 100 -c 5 "http://localhost/api/crypto/ohlcv?symbol=BTCUSDT&timeframe=1h&limit=100"
```

### Load Testing with wrk

```bash
# Install wrk
sudo apt-get install wrk  # Debian/Ubuntu

# Run benchmark
wrk -t4 -c100 -d30s http://localhost/status/health
```

## Security Checklist

- [ ] All secrets are in `.env.prod` (not committed to git)
- [ ] `.env.prod` is listed in `.gitignore`
- [ ] HTTPS is configured (via reverse proxy or load balancer)
- [ ] Rate limiting is enabled (via Nginx or application)
- [ ] API keys are rotated regularly
- [ ] Container images are scanned for vulnerabilities
- [ ] Logs don't contain sensitive information

## Environment Files

### `.env.prod` (local testing)

```bash
HUGGINGFACE_API_KEY=hf_xxx
REDIS_URL=redis://redis:6379
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

### Using with Docker Compose

```bash
# Explicit env file
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d

# Auto-detected (if .env exists)
docker compose -f docker-compose.prod.yml up -d
```

## Next Steps

1. **Monitoring**: Add Prometheus + Grafana
2. **Alerting**: Configure Alertmanager
3. **Backup**: Set up Redis persistence
4. **SSL/TLS**: Add Let's Encrypt certificates
5. **CDN**: Configure Cloudflare for static assets

## Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [GitHub Actions Documentation](https://docs.github.com/actions)
