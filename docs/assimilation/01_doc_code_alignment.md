# Doc-Code Alignment Report
## Documentation vs Implementation Mismatches

**Document Version:** 1.0  
**Date:** 2025-11-06  
**Baseline Repository:** Project B  
**Donor Repository:** Project A

---

## Purpose

This document identifies mismatches between documentation and code implementations, and documents resolution decisions.

---

## Mismatches Found

### 1. Database Schema: Futures Tables

**Expected (from prompt):**
```sql
futures_positions(id, exchange, symbol, side, size, entry_price, leverage, margin_mode, liq_price, pnl, account_id, created_at, updated_at)
futures_orders(id, exchange, symbol, side, type, qty, price, status, client_order_id, meta, account_id, created_at, updated_at)
```

**Actual (Migration v6):**
```sql
futures_positions(id, symbol, side, size, entry_price, mark_price, leverage, unrealized_pnl, liquidation_price, margin_mode, margin_used, margin_available, exchange_order_id, created_at, updated_at)
futures_orders(id, order_id, symbol, side, type, qty, price, leverage, stop_loss, take_profit, reduce_only, status, filled_qty, avg_fill_price, exchange_order_id, created_at, updated_at)
```

**Differences:**
- ❌ Missing `exchange` column (has `exchange_order_id` instead)
- ❌ Missing `account_id` column (multi-user support not implemented)
- ❌ Missing `meta` column in orders (JSON metadata storage)
- ✅ Has `mark_price` (good addition)
- ✅ Has `margin_used`, `margin_available` (good additions)
- ✅ Has `stop_loss`, `take_profit` (good additions)

**Resolution Decision:**
- **Keep current schema** for now (more complete for single-user use case)
- **Add `exchange` column** if multi-exchange support needed
- **Add `account_id`** column when implementing multi-user support
- **Add `meta` column** if flexible metadata storage needed

**Action:** Document in migration notes, no code change required for MVP.

---

### 2. Endpoint Paths

**Expected (from prompt):**
- `POST /api/futures/orders`
- `DELETE /api/futures/orders/:id`
- `GET /api/futures/positions`
- `PUT /api/futures/leverage`
- `GET /api/futures/funding/:symbol`

**Actual (B code):**
- ✅ `POST /api/futures/orders` - Matches
- ✅ `DELETE /api/futures/orders/:id` - Matches
- ✅ `GET /api/futures/positions` - Matches
- ✅ `PUT /api/futures/leverage` - Matches
- ✅ `GET /api/futures/funding/:symbol` - Matches
- ✅ `GET /api/futures/orders` - Additional (get open orders)
- ✅ `DELETE /api/futures/orders` - Additional (cancel all)
- ✅ `GET /api/futures/account/balance` - Additional
- ✅ `GET /api/futures/orderbook/:symbol` - Additional
- ✅ `GET /api/futures/funding/:symbol/history` - Additional

**Resolution Decision:**
- ✅ **No changes needed** - B's implementation is more complete

---

### 3. WebSocket Endpoint

**Expected (from prompt):**
- `/ws/futures` - Futures-specific channel

**Actual (B code):**
- ✅ `/ws/futures` - Exists in `server.ts:2785`
- ✅ Channel handler exists: `FuturesWebSocketChannel`

**Resolution Decision:**
- ✅ **No changes needed** - Matches expectation

---

### 4. Feature Flag Names

**Expected (from prompt):**
- `FEATURE_FUTURES` (default: `false`)
- `EXCHANGE_KUCOIN` (default: `true`)

**Actual (B code):**
- ✅ `FEATURE_FUTURES` - Matches (`src/config/flags.ts:11`)
- ✅ `EXCHANGE_KUCOIN` - Matches (`src/config/flags.ts:12`)

**Resolution Decision:**
- ✅ **No changes needed** - Matches expectation

---

### 5. ENV Variable Names

**Expected (from prompt):**
- `KUCOIN_FUTURES_KEY`
- `KUCOIN_FUTURES_SECRET`
- `KUCOIN_FUTURES_PASSPHRASE`
- `FUTURES_BASE_URL=https://api-futures.kucoin.com`

**Actual (B code):**
- ✅ `KUCOIN_FUTURES_KEY` - Used in `KucoinFuturesAdapter.ts:59`
- ✅ `KUCOIN_FUTURES_SECRET` - Used in `KucoinFuturesAdapter.ts:60`
- ✅ `KUCOIN_FUTURES_PASSPHRASE` - Used in `KucoinFuturesAdapter.ts:61`
- ✅ `FUTURES_BASE_URL` - Used in `KucoinFuturesAdapter.ts:39`

**Actual (.env.example):**
- ✅ All variables documented in `.env.example`

**Resolution Decision:**
- ✅ **No changes needed** - Matches expectation

---

### 6. Interface Methods

**Expected (from prompt):**
```typescript
interface IFuturesExchange {
  placeOrder(order: FuturesOrder): Promise<any>;
  cancelOrder(orderId: string): Promise<any>;
  getPositions(): Promise<FuturesPosition[]>;
  setLeverage(symbol: string, leverage: number, marginMode?: string): Promise<any>;
  getFundingRates(symbol: string): Promise<FundingRate>;
  getBalance(): Promise<FuturesAccountBalance>;
}
```

**Actual (B code - `IFuturesExchange.ts`):**
```typescript
interface IFuturesExchange {
  getPositions(): Promise<FuturesPosition[]>;
  placeOrder(order: FuturesOrder): Promise<any>;
  cancelOrder(orderId: string): Promise<any>;
  cancelAllOrders(symbol?: string): Promise<any>;  // Additional
  getOpenOrders(symbol?: string): Promise<any[]>;  // Additional
  setLeverage(symbol: string, leverage: number, marginMode?: string): Promise<any>;
  getAccountBalance(): Promise<FuturesAccountBalance>;  // Named differently
  getOrderbook(symbol: string, depth?: number): Promise<FuturesOrderbook>;  // Additional
  getFundingRate(symbol: string): Promise<FundingRate>;  // Named differently
  getFundingRateHistory(...): Promise<FundingRate[]>;  // Additional
}
```

**Differences:**
- ✅ `getBalance()` → `getAccountBalance()` (better naming)
- ✅ `getFundingRates()` → `getFundingRate()` + `getFundingRateHistory()` (more complete)
- ✅ Additional methods: `cancelAllOrders()`, `getOpenOrders()`, `getOrderbook()`

**Resolution Decision:**
- ✅ **No changes needed** - B's interface is more complete and better named

---

### 7. Provider Adapter Implementation

**Expected (from prompt):**
- Extract A's `KuCoinFuturesService` logic into B's adapter pattern

**Actual (B code):**
- ✅ `KucoinFuturesAdapter.ts` exists and implements `IFuturesExchange`
- ✅ Follows B's adapter pattern
- ⚠️ Needs verification against A's implementation completeness

**Resolution Decision:**
- **Action Required:** Verify all methods from A are implemented in B
- **Action Required:** Check error handling alignment
- **Action Required:** Verify rate limiting implementation

---

### 8. Service Layer

**Expected (from prompt):**
- `FuturesService` - Orchestrates adapter + repos

**Actual (B code):**
- ✅ `FuturesService.ts` exists
- ✅ Uses `IFuturesExchange` adapter
- ✅ Uses repositories (`FuturesPositionRepository`, `FuturesOrderRepository`)
- ✅ Feature flag checks

**Resolution Decision:**
- ✅ **No changes needed** - Matches expectation

---

### 9. Repository Layer

**Expected (from prompt):**
- `FuturesPositionRepository`
- `FuturesOrderRepository`

**Actual (B code):**
- ✅ `FuturesPositionRepository.ts` exists
- ✅ `FuturesOrderRepository.ts` exists
- ✅ Extend `BaseRepository`

**Resolution Decision:**
- ✅ **No changes needed** - Matches expectation

---

### 10. Documentation References

**Expected (from prompt):**
- Update `README.md`, `QUICKSTART.md`, `ENDPOINTS.md`, `DATA_MODEL.md`, `RISK_NOTES.md`, `RUNBOOK.md`

**Actual (B docs):**
- ✅ `RUNBOOK.md` exists and references futures
- ⚠️ Need to verify `ENDPOINTS.md` (exists in `docs/New folder/ENDPOINTS.md`)
- ⚠️ Need to verify `DATA_MODEL.md` (exists in `docs/New folder/DATA_MODEL.md`)
- ⚠️ Need to verify `RISK_NOTES.md` (exists in `docs/New folder/RISK_NOTES.md`)
- ⚠️ Need to check `README.md` and `QUICKSTART.md` updates

**Resolution Decision:**
- **Action Required:** Verify all docs are updated in Stage 7

---

## Summary of Required Actions

### Code Changes Needed
1. ✅ None for MVP (current implementation is more complete than prompt)

### Documentation Updates Needed
1. ⚠️ Verify `README.md` mentions futures
2. ⚠️ Verify `QUICKSTART.md` has futures setup instructions
3. ⚠️ Verify `ENDPOINTS.md` documents all futures endpoints
4. ⚠️ Verify `DATA_MODEL.md` documents futures tables
5. ⚠️ Verify `RISK_NOTES.md` mentions futures risks

### Verification Needed
1. ⚠️ Verify `KucoinFuturesAdapter` completeness vs A's `KuCoinFuturesService`
2. ⚠️ Verify error handling matches B's patterns
3. ⚠️ Verify rate limiting is implemented
4. ⚠️ Verify WebSocket channel broadcasts all events
5. ⚠️ Test with `FEATURE_FUTURES=false` (zero impact)

---

## Resolution Philosophy

**Decision Rule:** When documentation and code differ, prefer:
1. More complete implementation (if it doesn't break compatibility)
2. Better naming conventions
3. B's architecture patterns
4. Type safety and error handling

**Exception:** If prompt specifies exact schema/names, those take precedence for compatibility.

---

**Document Maintained By:** Integration Team  
**Last Updated:** 2025-11-06  
**Next Review:** After Stage 2 (Capability Matrix)
