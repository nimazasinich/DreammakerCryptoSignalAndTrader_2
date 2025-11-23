# Operational Notes - Feature Flags & Metrics

## Feature Flags

| Flag | Default | Description | How to Toggle |
|------|---------|-------------|---------------|
| `FEATURE_FUTURES` | `false` | Enable futures trading functionality | Set `FEATURE_FUTURES=true` in `.env` |
| `FEATURE_AI_ENHANCED` | `false` | Enable adaptive weighting + regime detection | Set `FEATURE_AI_ENHANCED=true` in `.env` |
| `DISABLE_REDIS` | `false` | Disable Redis caching (local dev) | Set `DISABLE_REDIS=true` in `.env` |
| `EXCHANGE_KUCOIN` | `true` | Enable KuCoin exchange integration | Set `EXCHANGE_KUCOIN=false` to disable |
| `FEATURE_METRICS` | `true` | Enable Prometheus /metrics endpoint | Set `FEATURE_METRICS=false` to disable |
| `FEATURE_OPENTELEMETRY` | `false` | Enable OpenTelemetry tracing | Set `FEATURE_OPENTELEMETRY=true` (requires setup) |

**Verification:**
```bash
curl http://localhost:3001/api/health
# Check response for "featureFlags" section
```

**Runtime Toggle (Advanced):**
Edit `config/feature-flags.json` and restart the server.

---

## Graceful Shutdown

**Shutdown Order:**
1. **Stop HTTP server** - No new requests accepted
2. **Close WebSocket connections** - Notify clients with code 1000
3. **Clear intervals/cron jobs** - Stop background tasks
4. **Disconnect Database** - Flush WAL and close connections
5. **Disconnect Redis** - Close pub/sub and main connections
6. **Exit process** - Clean exit with code 0

**Manual Test:**
```bash
# Start server
npm start

# In another terminal, send graceful shutdown signal
kill -SIGTERM <pid>

# Check logs for:
# "SIGTERM received, starting graceful shutdown"
# "HTTP server closed"
# "Database closed"
# "Redis service disconnected"
# "Graceful shutdown complete"
```

**Timeout Configuration:**
- Default shutdown timeout: 10 seconds
- Override: Set `GRACEFUL_SHUTDOWN_TIMEOUT_MS=15000` in `.env`

**Emergency Kill:**
```bash
kill -SIGKILL <pid>  # Force kill (not graceful)
```

---

## Metrics & Monitoring

### Prometheus /metrics Endpoint

**Endpoint:** `http://localhost:3001/metrics`

**Key Metrics:**

| Metric | Type | Description |
|--------|------|-------------|
| `http_request_duration_seconds` | Histogram | HTTP request latency (p50, p95, p99) |
| `signals_generated_total` | Counter | Total signals generated (by symbol/action) |
| `process_cpu_user_seconds_total` | Counter | CPU usage in user mode |
| `nodejs_heap_size_used_bytes` | Gauge | Memory heap usage |
| `nodejs_heap_size_total_bytes` | Gauge | Total heap size |
| `redis_cache_hits_total` | Counter | Redis cache hits (if enabled) |
| `redis_cache_misses_total` | Counter | Redis cache misses |
| `database_queries_total` | Counter | Total database queries executed |

**Sample Query (Prometheus):**
```promql
# Request latency P95
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Signals generated per minute
rate(signals_generated_total[1m])

# Memory usage trend
nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes
```

### Grafana Dashboard

**Import:**
1. Navigate to Grafana → Dashboards → Import
2. Upload `config/grafana/dashboard.json` (TODO: create template)
3. Select Prometheus data source

**Panels:**
- Request rate & latency (p50, p95, p99)
- Signals generated (by symbol)
- Memory & CPU usage
- Redis cache hit rate
- Database query performance

---

## Health Checks

### Endpoints

| Endpoint | Description | Use Case |
|----------|-------------|----------|
| `/api/health` | Basic health check | Load balancer probes |
| `/api/system/health` | Detailed system health | Monitoring dashboards |

### Health Check Response

**Example Response:**
```json
{
  "status": "healthy",
  "timestamp": 1699308800000,
  "uptime": 3600,
  "version": "1.0.0",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "websocket": "healthy"
  },
  "featureFlags": {
    "FEATURE_AI_ENHANCED": false,
    "FEATURE_FUTURES": false,
    "FEATURE_METRICS": true
  }
}
```

**Kubernetes Liveness Probe:**
```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

**Readiness Probe:**
```yaml
readinessProbe:
  httpGet:
    path: /api/system/health
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 5
```

---

## Database Maintenance

### Backup

**Manual Backup:**
```bash
curl -X POST http://localhost:3001/api/database/backup
# Returns: { "backupPath": "data/boltai-backup-2025-11-07T12-00-00.db" }
```

**Automated Backup (Cron):**
```bash
# Add to crontab
0 2 * * * curl -X POST http://localhost:3001/api/database/backup
```

### Migrations

**Check Current Version:**
```bash
sqlite3 data/boltai.db "SELECT version, name FROM schema_migrations ORDER BY version DESC LIMIT 5;"
```

**Run Pending Migrations:**
Migrations run automatically on server startup. To manually trigger:
```bash
npm run migrate
```

**Rollback (Emergency):**
```typescript
// In Node.js console
const { Database } = await import('./src/data/Database.js');
const db = Database.getInstance();
await db.migrations.rollback(6); // Rollback to version 6
```

### Index Maintenance

**Check Index Usage:**
```sql
-- Run in sqlite3 console
EXPLAIN QUERY PLAN
SELECT * FROM market_data
WHERE symbol='BTCUSDT' AND interval='1h'
ORDER BY timestamp DESC LIMIT 100;

-- Should show: "USING INDEX idx_market_data_composite_desc"
```

**Rebuild Indexes (if fragmented):**
```sql
REINDEX;
VACUUM;
```

---

## Troubleshooting

### Common Issues

#### 1. Redis Connection Failures
**Symptom:** Logs show "Redis not connected, skipping cache"

**Solution:**
```bash
# Check Redis status
redis-cli ping
# Should return: PONG

# Restart Redis
sudo systemctl restart redis

# Disable Redis if not needed
export DISABLE_REDIS=true
```

#### 2. WebSocket Disconnections
**Symptom:** Frontend shows "WS Disconnected" status

**Solution:**
1. Check server logs for WebSocket errors
2. Verify firewall allows WebSocket connections
3. Test connection: `wscat -c ws://localhost:3001/ws`

#### 3. Slow Queries
**Symptom:** `/api/health` takes >1 second

**Solution:**
```sql
-- Check slow queries
SELECT * FROM market_data WHERE timestamp > 0 ORDER BY timestamp DESC LIMIT 1;
-- Should be <10ms

-- If slow, rebuild indexes
REINDEX;
```

#### 4. Memory Leaks
**Symptom:** `nodejs_heap_size_used_bytes` keeps growing

**Solution:**
```bash
# Enable heap snapshot
node --inspect server.ts

# Take heap snapshot in Chrome DevTools
# Analyze for retained objects
```

---

## Deployment Checklist

- [ ] `.env` configured with production values
- [ ] Feature flags set to desired state
- [ ] Database migrations tested (run + rollback)
- [ ] Redis connection tested
- [ ] Health checks return 200 OK
- [ ] `/metrics` endpoint accessible (if enabled)
- [ ] Graceful shutdown tested manually
- [ ] Backup cron job configured
- [ ] Monitoring alerts configured (Grafana/PagerDuty)
- [ ] Log aggregation setup (ELK/Splunk)
- [ ] SSL/TLS certificates valid
- [ ] Rate limiting configured
- [ ] CORS origins whitelisted

---

## Emergency Contacts

**On-Call Engineer:** [Your Team Contact]
**Escalation:** [Manager/Tech Lead]
**Infrastructure:** [DevOps Team]

**Runbooks:**
- [High CPU Usage](link-to-runbook)
- [Database Corruption](link-to-runbook)
- [Redis Failure](link-to-runbook)

---

**Last Updated:** 2025-11-07
**Version:** 1.0
