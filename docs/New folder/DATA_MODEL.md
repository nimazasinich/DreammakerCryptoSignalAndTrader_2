# Data Model & Schema Documentation
## BOLT AI Database Architecture

**Document Version:** 1.0  
**Last Updated:** 2025-11-06  
**Database Type:** SQLite with AES-256-CBC Encryption  
**Migration System:** Version-controlled migrations with transaction rollback

---

## Table of Contents

1. [Overview](#overview)
2. [Database Configuration](#database-configuration)
3. [Schema Tables](#schema-tables)
4. [Entity Relationships](#entity-relationships)
5. [Migration System](#migration-system)
6. [Data Access Patterns](#data-access-patterns)
7. [Backup & Recovery](#backup--recovery)

---

## Overview

### Database Technology Stack

**Primary Database:** SQLite 3  
**Node.js Driver:** better-sqlite3 12.2.0  
**Encryption:** AES-256-CBC via EncryptedDatabase wrapper  
**Location:** `./data/crypto-agent.db` (configurable)  
**Size (typical):** 50-500 MB depending on historical data retention

### Key Characteristics

- **Embedded:** No separate server process, runs in-process
- **ACID Compliant:** Full transaction support with rollback
- **Thread-Safe:** Synchronous API with better-sqlite3
- **Encrypted at Rest:** All data encrypted with AES-256-CBC
- **Version Controlled:** Schema migrations track versions
- **Indexed:** Strategic indexes on high-frequency queries

---

## Database Configuration

### Connection Settings

**File:** `config/api.json`

```json
{
  "database": {
    "path": "./data/crypto-agent.db",
    "encryptionKey": "auto_generated",
    "backupPath": "./data/backups/",
    "retentionDays": 90
  }
}
```

### Environment Variables

```bash
# Optional: Override database location
DB_PATH=./data/crypto-agent.db

# Optional: Custom encryption key (auto-generated if not provided)
DB_KEY=your-32-byte-hex-key

# Optional: Secret key for encryption (stored in .env)
SECRET_KEY=your-secret-key
```

### Encryption Key Management

**Key Generation:** Auto-generated on first run  
**Key Storage:** Git-ignored file `.db_key` or environment variable  
**Algorithm:** AES-256-CBC with HMAC-SHA256 for integrity  
**Risk:** ⚠️ Key loss = permanent data loss, no recovery mechanism

**Code Reference:** `src/data/EncryptedDatabase.ts`

---

## Schema Tables

### 1. schema_migrations

**Purpose:** Track applied database migrations (schema version control)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `version` | INTEGER | PRIMARY KEY | Migration version number |
| `name` | TEXT | NOT NULL | Human-readable migration name |
| `applied_at` | INTEGER | NOT NULL, DEFAULT now | Unix timestamp of application |

**Indexes:** None (small table, primary key sufficient)

**Code Reference:** `src/data/DatabaseMigrations.ts:26-31`

---

### 2. market_data

**Purpose:** Store historical OHLCV (Open, High, Low, Close, Volume) market data

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique record ID |
| `symbol` | TEXT | NOT NULL | Cryptocurrency symbol (e.g., `BTC`, `BTCUSDT`) |
| `timestamp` | INTEGER | NOT NULL | Unix timestamp (milliseconds) |
| `open` | REAL | NOT NULL | Opening price |
| `high` | REAL | NOT NULL | Highest price in period |
| `low` | REAL | NOT NULL | Lowest price in period |
| `close` | REAL | NOT NULL | Closing price |
| `volume` | REAL | NOT NULL | Trading volume |
| `interval` | TEXT | NOT NULL, DEFAULT `1m` | Timeframe: `1m`, `5m`, `1h`, `1d`, etc. |
| `created_at` | INTEGER | DEFAULT now | Record creation time |

**Unique Constraint:** `(symbol, timestamp, interval)`

**Indexes:**
- `idx_market_data_composite` on `(symbol, timestamp, interval)` — Fast queries by symbol & time range
- `idx_market_data_timestamp` on `(timestamp)` — Time-series queries

**Typical Size:** ~1M rows = ~150 MB

**Code Reference:** `src/data/DatabaseMigrations.ts:88-103`

---

### 3. training_metrics

**Purpose:** Track AI model training progress (loss, accuracy, exploration metrics)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique record ID |
| `epoch` | INTEGER | NOT NULL | Training epoch number |
| `timestamp` | INTEGER | NOT NULL | Unix timestamp |
| `model_version` | TEXT | NOT NULL, DEFAULT `v1.0` | Model version identifier |
| `mse` | REAL | NOT NULL | Mean Squared Error |
| `mae` | REAL | NOT NULL | Mean Absolute Error |
| `r_squared` | REAL | NOT NULL | R² coefficient of determination |
| `directional_accuracy` | REAL | NOT NULL | Directional prediction accuracy (0-1) |
| `classification_accuracy` | REAL | NOT NULL | Classification accuracy (0-1) |
| `gradient_norm` | REAL | NOT NULL | Gradient norm (stability metric) |
| `learning_rate` | REAL | NOT NULL | Current learning rate |
| `nan_count` | INTEGER | DEFAULT 0 | Count of NaN values detected |
| `inf_count` | INTEGER | DEFAULT 0 | Count of Inf values detected |
| `reset_count` | INTEGER | DEFAULT 0 | Network reset count |
| `epsilon` | REAL | DEFAULT 0 | Exploration epsilon (ε-greedy) |
| `exploration_ratio` | REAL | DEFAULT 0 | Exploration action ratio |
| `exploitation_ratio` | REAL | DEFAULT 0 | Exploitation action ratio |
| `created_at` | INTEGER | DEFAULT now | Record creation time |

**Indexes:**
- `idx_training_metrics_timestamp` on `(timestamp)` — Time-series analysis
- `idx_training_metrics_version` on `(model_version)` — Version comparison

**Typical Size:** ~10K rows = ~2 MB

**Code Reference:** `src/data/DatabaseMigrations.ts:116-144`

---

### 4. experience_buffer

**Purpose:** Reinforcement learning replay memory (stores state-action-reward tuples)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique record ID |
| `state_features` | BLOB | NOT NULL | Serialized feature vector (state) |
| `action` | INTEGER | NOT NULL | Action taken (0=HOLD, 1=BUY, 2=SELL) |
| `reward` | REAL | NOT NULL | Reward received |
| `next_state_features` | BLOB | NOT NULL | Serialized next state features |
| `terminal` | INTEGER | NOT NULL | Terminal state flag (0/1) |
| `td_error` | REAL | DEFAULT 0 | Temporal difference error |
| `priority_score` | REAL | DEFAULT 1.0 | Priority for sampling |
| `timestamp` | INTEGER | NOT NULL | Unix timestamp |
| `symbol` | TEXT | NOT NULL | Associated trading symbol |
| `created_at` | INTEGER | DEFAULT now | Record creation time |

**Indexes:**
- `idx_experience_buffer_priority` on `(priority_score DESC)` — Prioritized experience replay
- `idx_experience_buffer_symbol` on `(symbol)` — Symbol-specific queries

**Typical Size:** ~50K rows = ~25 MB (capped by replay buffer size)

**Code Reference:** `src/data/DatabaseMigrations.ts:151-174`

---

### 5. backtest_results

**Purpose:** Store backtesting strategy performance summary

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique backtest ID |
| `strategy_name` | TEXT | NOT NULL | Strategy identifier |
| `start_date` | INTEGER | NOT NULL | Backtest period start (Unix timestamp) |
| `end_date` | INTEGER | NOT NULL | Backtest period end |
| `initial_capital` | REAL | NOT NULL | Starting capital |
| `final_capital` | REAL | NOT NULL | Ending capital |
| `total_return` | REAL | NOT NULL | Total return (%) |
| `annualized_return` | REAL | NOT NULL | Annualized return (%) |
| `sharpe_ratio` | REAL | NOT NULL | Risk-adjusted return metric |
| `sortino_ratio` | REAL | NOT NULL | Downside risk metric |
| `max_drawdown` | REAL | NOT NULL | Maximum drawdown (%) |
| `calmar_ratio` | REAL | NOT NULL | Return / max drawdown |
| `profit_factor` | REAL | NOT NULL | Gross profit / gross loss |
| `win_rate` | REAL | NOT NULL | Winning trades ratio |
| `avg_win` | REAL | NOT NULL | Average winning trade |
| `avg_loss` | REAL | NOT NULL | Average losing trade |
| `total_trades` | INTEGER | NOT NULL | Total trades executed |
| `var_95` | REAL | NOT NULL | Value at Risk (95%) |
| `cvar_95` | REAL | NOT NULL | Conditional VaR (95%) |
| `created_at` | INTEGER | DEFAULT now | Record creation time |

**Indexes:**
- `idx_backtest_results_strategy` on `(strategy_name)` — Strategy comparison

**Typical Size:** ~100 rows = ~0.1 MB

**Code Reference:** `src/data/DatabaseMigrations.ts:181-226`

---

### 6. backtest_trades

**Purpose:** Individual trade records from backtesting

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique trade ID |
| `backtest_id` | INTEGER | NOT NULL, FOREIGN KEY | Links to `backtest_results.id` |
| `trade_id` | TEXT | NOT NULL | Trade identifier |
| `symbol` | TEXT | NOT NULL | Trading pair |
| `entry_time` | INTEGER | NOT NULL | Entry timestamp |
| `exit_time` | INTEGER | NOT NULL | Exit timestamp |
| `entry_price` | REAL | NOT NULL | Entry price |
| `exit_price` | REAL | NOT NULL | Exit price |
| `quantity` | REAL | NOT NULL | Trade size |
| `direction` | TEXT | NOT NULL | `LONG` or `SHORT` |
| `profit_loss` | REAL | NOT NULL | Trade P&L |
| `profit_loss_pct` | REAL | NOT NULL | P&L percentage |
| `fees` | REAL | NOT NULL | Trading fees |
| `entry_signal` | TEXT | | Entry reason |
| `exit_signal` | TEXT | | Exit reason |
| `created_at` | INTEGER | DEFAULT now | Record creation time |

**Indexes:**
- `idx_backtest_trades_backtest_id` on `(backtest_id)` — Fast join with results
- `idx_backtest_trades_symbol` on `(symbol)` — Symbol-specific analysis

**Typical Size:** ~10K rows = ~1 MB per backtest

**Code Reference:** `src/data/DatabaseMigrations.ts:204-232`

---

### 7. opportunities

**Purpose:** Detected trading opportunities (signals) with scoring details

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique opportunity ID (UUID) |
| `symbol` | TEXT | NOT NULL | Trading symbol |
| `detection_time` | INTEGER | NOT NULL | Detection timestamp |
| `pattern_type` | TEXT | NOT NULL | Pattern type (SMC, Elliott, Harmonic, etc.) |
| `confidence` | REAL | NOT NULL | Confidence score (0-1) |
| `technical_score` | REAL | NOT NULL | Technical analysis score |
| `sentiment_score` | REAL | NOT NULL | Sentiment score |
| `whale_score` | REAL | NOT NULL | Whale activity score |
| `combined_score` | REAL | NOT NULL | Weighted combined score |
| `target_price` | REAL | NOT NULL | Price target |
| `stop_loss` | REAL | NOT NULL | Stop loss price |
| `expected_return` | REAL | NOT NULL | Expected return (%) |
| `risk_reward` | REAL | NOT NULL | Risk/reward ratio |
| `status` | TEXT | NOT NULL, DEFAULT `NEW` | `NEW`, `ACTIVE`, `CLOSED`, `EXPIRED` |
| `reasoning` | TEXT | | Human-readable explanation |
| `created_at` | INTEGER | DEFAULT now | Record creation time |

**Indexes:**
- `idx_opportunities_symbol` on `(symbol)` — Symbol queries
- `idx_opportunities_status` on `(status)` — Active opportunities
- `idx_opportunities_score` on `(combined_score DESC)` — Top opportunities

**Typical Size:** ~1K rows = ~0.5 MB

**Code Reference:** `src/data/DatabaseMigrations.ts:240-280`

---

### 8. alerts

**Purpose:** User-configured price/condition alerts with trigger tracking

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique alert ID (UUID) |
| `symbol` | TEXT | NOT NULL | Trading symbol |
| `type` | TEXT | NOT NULL | Alert type: `PRICE`, `VOLUME`, `TECHNICAL` |
| `condition_text` | TEXT | NOT NULL | Condition description |
| `threshold` | REAL | NOT NULL | Trigger threshold value |
| `current_value` | REAL | NOT NULL | Latest checked value |
| `triggered` | INTEGER | DEFAULT 0 | Triggered flag (0/1) |
| `trigger_time` | INTEGER | | Timestamp when triggered |
| `priority` | TEXT | NOT NULL, DEFAULT `MEDIUM` | `LOW`, `MEDIUM`, `HIGH` |
| `message` | TEXT | NOT NULL | Alert message template |
| `enabled` | INTEGER | NOT NULL, DEFAULT 1 | Enabled flag (0/1) |
| `user_id` | TEXT | | User ID (future multi-user support) |
| `created_at` | INTEGER | DEFAULT now | Record creation time |

**Indexes:**
- `idx_alerts_symbol` on `(symbol)` — Symbol-specific alerts
- `idx_alerts_triggered` on `(triggered, enabled)` — Active alerts check

**Typical Size:** ~100 rows = ~0.1 MB

**Code Reference:** `src/data/DatabaseMigrations.ts:260-285`

---

## Entity Relationships

### ER Diagram

```
┌─────────────────────┐
│   market_data       │
│─────────────────────│
│ PK  id              │
│     symbol          │◄───────────┐
│     timestamp       │            │
│     open, high, ... │            │
└─────────────────────┘            │
                                   │ Used by
                                   │
┌─────────────────────┐            │
│  opportunities      │────────────┘
│─────────────────────│
│ PK  id              │
│ FK  symbol          │
│     confidence      │
│     target_price    │
└─────────────────────┘
          │
          │ Referenced by
          ▼
┌─────────────────────┐
│      alerts         │
│─────────────────────│
│ PK  id              │
│ FK  symbol          │
│     threshold       │
│     triggered       │
└─────────────────────┘


┌─────────────────────┐
│  backtest_results   │
│─────────────────────│
│ PK  id              │
│     strategy_name   │
│     total_return    │
│     sharpe_ratio    │
└─────────────────────┘
          │
          │ One-to-Many
          ▼
┌─────────────────────┐
│  backtest_trades    │
│─────────────────────│
│ PK  id              │
│ FK  backtest_id     │
│     entry_price     │
│     profit_loss     │
└─────────────────────┘


┌─────────────────────┐
│ training_metrics    │
│─────────────────────│
│ PK  id              │
│     model_version   │
│     epoch           │
│     mse, mae, ...   │
└─────────────────────┘
          │
          │ Feeds
          ▼
┌─────────────────────┐
│ experience_buffer   │
│─────────────────────│
│ PK  id              │
│     state_features  │
│     action, reward  │
│     priority_score  │
└─────────────────────┘
```

### Relationships Summary

| Parent Table | Child Table | Relationship | Constraint |
|--------------|-------------|--------------|------------|
| `backtest_results` | `backtest_trades` | 1:N | `backtest_trades.backtest_id` → `backtest_results.id` |
| `opportunities` | `alerts` | 1:N (implicit) | Shared `symbol` field |
| `training_metrics` | `experience_buffer` | 1:N (logical) | Training uses experience data |

**Note:** SQLite does not enforce foreign key constraints by default. Current implementation relies on application-level integrity.

---

## Migration System

### Migration Workflow

**File:** `src/data/DatabaseMigrations.ts`

**Process:**

1. **Initialize:** Create `schema_migrations` table
2. **Check Version:** Query current schema version
3. **Detect Pending:** Compare with available migrations
4. **Apply (Transaction):**
   - Execute migration `up` SQL
   - Record version in `schema_migrations`
   - Rollback on any error
5. **Confirm:** Log successful application

### Migration Versions

| Version | Name | Description | Tables Created |
|---------|------|-------------|----------------|
| `0` | Initial | Empty database | `schema_migrations` |
| `1` | create_core_tables | Market data storage | `market_data` |
| `2` | create_training_tables | AI training metrics | `training_metrics` |
| `3` | create_experience_buffer | Replay memory | `experience_buffer` |
| `4` | create_backtest_tables | Backtesting results | `backtest_results`, `backtest_trades` |
| `5` | create_opportunities_and_alerts | Signal tracking | `opportunities`, `alerts` |

### Running Migrations

**Automatic (on startup):**
```typescript
const database = Database.getInstance();
await database.initialize(); // Runs pending migrations
```

**Manual:**
```typescript
const migrations = DatabaseMigrations.getInstance(db);
await migrations.runMigrations();
```

**Code Reference:** `src/data/DatabaseMigrations.ts:44-79`

---

## Data Access Patterns

### Repository Pattern

**Location:** `src/data/repositories/`

**Purpose:** Abstract database queries into reusable data access objects

**Repositories:**
- `MarketDataRepository` — CRUD for market_data
- `TrainingMetricsRepository` — Training metrics queries
- (More repositories planned for other tables)

### Usage Example

```typescript
import { Database } from './data/Database';

const db = Database.getInstance();
await db.initialize();

// Insert market data
await db.insertMarketData({
  symbol: 'BTC',
  timestamp: Date.now(),
  open: 43100,
  high: 43300,
  low: 43050,
  close: 43250,
  volume: 1250.45,
  interval: '1h'
});

// Query historical data
const history = await db.getMarketData('BTC', '1h', 100);

// Insert training metrics
await db.insertTrainingMetrics({
  epoch: 1,
  timestamp: Date.now(),
  model_version: 'v1.0',
  mse: 0.05,
  // ...other fields
});
```

**Code Reference:** `src/data/Database.ts`

---

## Backup & Recovery

### Automatic Backups

**Backup Service:** Implemented in `EncryptedDatabase`

**Schedule:** Manual trigger via API endpoint

**Endpoint:** `POST /api/database/backup` (not in real-data server, in full server)

**Backup Location:** `./data/backups/crypto-agent-backup-YYYY-MM-DD-HH-mm-ss.db`

**Retention:** Configurable (default 90 days)

### Manual Backup

```bash
# Copy database file (server must be stopped)
cp ./data/crypto-agent.db ./backups/manual-backup-$(date +%Y-%m-%d).db

# Or use API
curl -X POST http://localhost:3001/api/database/backup
```

### Recovery Process

1. **Stop server**
2. **Replace database file:**
   ```bash
   cp ./backups/crypto-agent-backup-YYYY-MM-DD.db ./data/crypto-agent.db
   ```
3. **Restart server** (migrations auto-apply if needed)

**⚠️ WARNING:** Backup files are encrypted with the same key. Losing encryption key = losing all data.

---

## Performance Optimization

### Index Strategy

**Philosophy:** Index high-frequency queries, avoid over-indexing

**Indexes in Use:**
- Composite indexes for multi-column queries (symbol + timestamp)
- Foreign key indexes for joins
- Priority/score indexes for sorted queries

### Query Optimization Tips

1. **Use prepared statements** (better-sqlite3 default)
2. **Batch inserts** within transactions (10-100x faster)
3. **Limit result sets** with `LIMIT` clause
4. **Use covering indexes** to avoid table lookups
5. **Vacuum periodically** to reclaim space:
   ```sql
   VACUUM;
   ```

### Database Size Management

**Retention Policy:** Delete old market_data beyond X days

**Example:**
```sql
DELETE FROM market_data 
WHERE timestamp < (strftime('%s', 'now') - 7776000) * 1000; -- 90 days
```

**Status:** ⚠️ Not automated, manual cleanup required

---

## Security Considerations

### Encryption

**Method:** AES-256-CBC with HMAC-SHA256  
**Key Storage:** `.db_key` file (git-ignored) or environment variable  
**Risk:** Key exposure = data exposure

### SQL Injection Protection

**Status:** ✅ Protected by parameterized queries (prepared statements)

**Good (Safe):**
```typescript
db.prepare('SELECT * FROM market_data WHERE symbol = ?').all(symbol);
```

**Bad (Vulnerable):**
```typescript
db.exec(`SELECT * FROM market_data WHERE symbol = '${symbol}'`); // Don't do this!
```

### Access Control

**Status:** ⚠️ No row-level security (single-user system)

**Recommendation:** Implement user_id column in all tables for multi-user support

---

## Future Enhancements

| Enhancement | Priority | Effort | Value |
|-------------|----------|--------|-------|
| **PostgreSQL Migration** | 🟡 MEDIUM | HIGH | Multi-instance scaling |
| **Row-Level Security** | 🟡 MEDIUM | MEDIUM | Multi-user support |
| **Automated Backups** | 🟡 MEDIUM | LOW | Data safety |
| **Key Rotation** | 🔴 HIGH | MEDIUM | Security best practice |
| **Data Archival** | 🟢 LOW | MEDIUM | Storage optimization |
| **Replication** | 🟢 LOW | HIGH | High availability |

---

**Document Maintained By:** Cursor AI Agent  
**Schema Version:** 5 (current)  
**Last Schema Change:** Migration v5 (opportunities + alerts)  
**Confidence:** HIGH
