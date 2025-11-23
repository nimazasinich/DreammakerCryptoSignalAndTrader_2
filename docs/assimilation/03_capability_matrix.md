# Capability Matrix & Unification Plan
## Stage 2: Decision Matrix for A → B Integration

**Document Version:** 1.0  
**Date:** 2025-11-06  
**Baseline:** Project B  
**Donor:** Project A

---

## Matrix Format

| Domain | B Status | A Status | Source of Truth | Merge Action | File(s) |
|--------|----------|----------|-----------------|--------------|---------|
| ... | ... | ... | ... | ... | ... |

---

## Capability Matrix

### Futures Trading (Core Domain)

| Domain | B Status | A Status | Source of Truth | Merge Action | File(s) |
|--------|----------|----------|-----------------|--------------|---------|
| **Futures Positions** | ✅ Complete | ✅ Complete | B | ✅ Keep B | `src/providers/futures/KucoinFuturesAdapter.ts:169-190` |
| **Futures Orders** | ✅ Complete | ✅ Complete | B | ✅ Keep B | `src/providers/futures/KucoinFuturesAdapter.ts:192-219` |
| **Order Cancellation** | ✅ Complete | ✅ Complete | B | ✅ Keep B | `src/providers/futures/KucoinFuturesAdapter.ts:221-240` |
| **Leverage Management** | ✅ Complete | ✅ Complete | B | ⚠️ Verify endpoint | `src/providers/futures/KucoinFuturesAdapter.ts:257-270` |
| **Account Balance** | ✅ Complete | ✅ Complete | B | ✅ Keep B | `src/providers/futures/KucoinFuturesAdapter.ts:272-288` |
| **Orderbook** | ✅ Complete | ✅ Complete | B | ✅ Keep B | `src/providers/futures/KucoinFuturesAdapter.ts:290-303` |
| **Funding Rates** | ✅ Complete | ❌ Missing | B | ✅ Keep B | `src/providers/futures/KucoinFuturesAdapter.ts:305-350` |
| **Close Position** | ❌ Missing | ✅ Has helper | A | 🔄 Add to service | Add to `FuturesService.ts` |
| **Rate Limiting** | ✅ Implemented | ❌ Missing | B | ✅ Keep B | Built into adapter |
| **Retry Logic** | ✅ Implemented | ❌ Missing | B | ✅ Keep B | Built into adapter |
| **Error Mapping** | ✅ Complete | ⚠️ Basic | B | ✅ Keep B | `KucoinFuturesAdapter.ts:115-167` |

---

### Scoring System

| Domain | B Status | A Status | Source of Truth | Merge Action | File(s) |
|--------|----------|----------|-----------------|--------------|---------|
| **Multi-Factor Scoring** | ✅ Complete | ✅ Similar | B | ✅ Keep B | `src/scoring/` |
| **Opportunity Detection** | ✅ Complete | ✅ Similar | B | ✅ Keep B | `src/scoring/service.ts` |
| **Score Combiner** | ✅ Complete | ✅ Similar | B | ✅ Keep B | `src/scoring/combiner.ts` |

---

### Monitoring & Health

| Domain | B Status | A Status | Source of Truth | Merge Action | File(s) |
|--------|----------|----------|-----------------|--------------|---------|
| **Health Checks** | ✅ Complete | ✅ Similar | B | ✅ Keep B | `src/monitoring/HealthCheckService.ts` |
| **Performance Metrics** | ✅ Complete | ✅ Similar | B | ✅ Keep B | `src/monitoring/PerformanceMonitor.ts` |
| **Alert Management** | ✅ Complete | ✅ Similar | B | ✅ Keep B | `src/monitoring/AlertManager.ts` |

---

### Providers/Exchange Integrations

| Domain | B Status | A Status | Source of Truth | Merge Action | File(s) |
|--------|----------|----------|-----------------|--------------|---------|
| **Binance Spot** | ✅ Complete | ✅ Similar | B | ✅ Keep B | `src/services/BinanceService.ts` |
| **KuCoin Spot** | ✅ Complete | ✅ Similar | B | ✅ Keep B | `src/services/KuCoinService.ts` |
| **KuCoin Futures** | ✅ Complete | ✅ Complete | B | ✅ Keep B + Verify | `src/providers/futures/KucoinFuturesAdapter.ts` |

---

### Realtime/WebSocket

| Domain | B Status | A Status | Source of Truth | Merge Action | File(s) |
|--------|----------|----------|-----------------|--------------|---------|
| **General WS** | ✅ Complete | ✅ Similar | B | ✅ Keep B | `src/server.ts:WebSocket` |
| **Futures WS Channel** | ✅ Complete | ❌ Missing | B | ✅ Keep B | `src/ws/futuresChannel.ts` |
| **Position Updates** | ✅ Complete | ❌ Missing | B | ✅ Keep B | `futuresChannel.ts:position_update` |
| **Order Updates** | ✅ Complete | ❌ Missing | B | ✅ Keep B | `futuresChannel.ts:order_update` |
| **Funding Ticks** | ✅ Complete | ❌ Missing | B | ✅ Keep B | `futuresChannel.ts:funding_tick` |

---

### Redis/Caching

| Domain | B Status | A Status | Source of Truth | Merge Action | File(s) |
|--------|----------|----------|-----------------|--------------|---------|
| **Redis Service** | ✅ Optional | ✅ Similar | B | ✅ Keep B | `src/services/RedisService.ts` |
| **Cache Layer** | ✅ Complete | ✅ Similar | B | ✅ Keep B | `src/core/AdvancedCache.ts` |

---

### AI/Backtest

| Domain | B Status | A Status | Source of Truth | Merge Action | File(s) |
|--------|----------|----------|-----------------|--------------|---------|
| **Neural Network** | ✅ Complete | ✅ Similar | B | ✅ Keep B | `src/ai/BullBearAgent.ts` |
| **Training Engine** | ✅ Complete | ✅ Similar | B | ✅ Keep B | `src/ai/TrainingEngine.ts` |
| **Backtest Engine** | ✅ Complete | ✅ Similar | B | ✅ Keep B | `src/ai/BacktestEngine.ts` |
| **Feature Engineering** | ✅ Complete | ✅ Similar | B | ✅ Keep B | `src/ai/FeatureEngineering.ts` |

---

### Data/Migrations

| Domain | B Status | A Status | Source of Truth | Merge Action | File(s) |
|--------|----------|----------|-----------------|--------------|---------|
| **Encrypted DB** | ✅ Complete | ⚠️ Basic | B | ✅ Keep B | `src/data/EncryptedDatabase.ts` |
| **Migrations** | ✅ Complete | ⚠️ Basic | B | ✅ Keep B | `src/data/DatabaseMigrations.ts` |
| **Futures Tables** | ✅ Complete (v6) | ❌ Missing | B | ✅ Keep B | Migration v6 |
| **Repositories** | ✅ Complete | ❌ Missing | B | ✅ Keep B | `src/data/repositories/` |

---

### Security

| Domain | B Status | A Status | Source of Truth | Merge Action | File(s) |
|--------|----------|----------|-----------------|--------------|---------|
| **Feature Flags** | ✅ Complete | ❌ Missing | B | ✅ Keep B | `src/config/flags.ts` |
| **ENV Credentials** | ✅ Complete | ⚠️ localStorage | B | ✅ Keep B | `.env.example` |
| **Error Handling** | ✅ Complete | ⚠️ Basic | B | ✅ Keep B | Throughout |
| **Input Validation** | ✅ Partial | ⚠️ Basic | B | ✅ Keep B | `FuturesController.ts` |

---

## Merge Action Legend

- ✅ **Keep B** - B's implementation is superior, keep as-is
- ✅ **Keep B + Verify** - Keep B but verify correctness against A
- ⚠️ **Verify** - Need to verify which is correct
- 🔄 **Add to B** - A has something B is missing, add to B
- ❌ **Skip** - A has it but B doesn't need it

---

## Detailed Merge Actions

### 1. Futures Positions (✅ Keep B)
**Reason:** B's implementation is complete with proper error handling, type safety, and mapping.

**Action:** No changes needed.

---

### 2. Futures Orders (✅ Keep B)
**Reason:** B's implementation matches A's functionality plus better error handling.

**Action:** No changes needed.

---

### 3. Leverage Management (⚠️ Verify Endpoint)
**Issue:** A uses `/api/v1/position/risk-limit-level/change`, B uses `/api/v1/leverage`

**Action:** 
1. Check KuCoin API docs for correct endpoint
2. Update B if A's endpoint is correct
3. Or verify B's endpoint is correct

**Files:** `src/providers/futures/KucoinFuturesAdapter.ts:257-270`

---

### 4. Funding Rates (✅ Keep B)
**Reason:** B has funding rates, A doesn't. This is an enhancement.

**Action:** No changes needed.

---

### 5. Close Position (🔄 Add to Service Layer)
**A Has:** `closePosition(symbol)` helper method  
**B Has:** Not in adapter (service layer could add it)

**Action:** Add convenience method to `FuturesService.ts`:
```typescript
async closePosition(symbol: string): Promise<any> {
  const positions = await this.getPositions();
  const position = positions.find(p => p.symbol === symbol);
  if (!position) {
    throw new Error(`Position not found for symbol: ${symbol}`);
  }
  return await this.placeOrder({
    symbol,
    side: position.side === 'long' ? 'sell' : 'buy',
    type: 'market',
    qty: position.size,
    reduceOnly: true
  });
}
```

**Files:** `src/services/FuturesService.ts`

---

### 6. Rate Limiting (✅ Keep B)
**Reason:** B has rate limiting, A doesn't. Critical for production.

**Action:** No changes needed.

---

### 7. Error Handling (✅ Keep B)
**Reason:** B's error handling is more comprehensive with proper Axios error mapping.

**Action:** No changes needed.

---

### 8. Order Placement Field Names (⚠️ Verify)
**A Uses:** `stopLoss`, `takeProfit`  
**B Uses:** `stop`, `takeProfit`

**Action:** Verify KuCoin API expects `stop` or `stopLoss`. Update B if needed.

**Files:** `src/providers/futures/KucoinFuturesAdapter.ts:192-219`

---

### 9. Symbol Normalization (⚠️ Verify)
**A Assumes:** Exact symbol format from frontend  
**B:** Should normalize symbols

**Action:** Add symbol normalization if needed:
- `BTCUSDTM` vs `BTC-USDTM` vs `BTCUSDT-M`
- Check KuCoin Futures symbol format

**Files:** `src/providers/futures/KucoinFuturesAdapter.ts`

---

### 10. Quantity/Price Precision (⚠️ Verify)
**Issue:** No precision handling in A or B

**Action:** Add precision handling:
- Get contract specs from exchange
- Round quantities/prices to correct precision
- Validate min/max quantities

**Files:** `src/providers/futures/KucoinFuturesAdapter.ts`

---

## Selection Heuristics Applied

### Heuristic 1: Completeness
- ✅ B has funding rates, A doesn't → Keep B
- ✅ B has rate limiting, A doesn't → Keep B
- ✅ B has retry logic, A doesn't → Keep B

### Heuristic 2: Error Handling
- ✅ B has comprehensive error mapping → Keep B
- ✅ B has structured errors → Keep B

### Heuristic 3: Architecture Fit
- ✅ B uses adapter pattern → Keep B
- ✅ B has repository layer → Keep B
- ✅ B has feature flags → Keep B

### Heuristic 4: Type Safety
- ✅ B has full TypeScript types → Keep B
- ✅ B uses interface contracts → Keep B

### Heuristic 5: Security
- ✅ B uses ENV variables → Keep B
- ✅ B has feature flags → Keep B

---

## Unification Plan Summary

### Phase 1: Verification (Immediate)
1. ✅ Verify leverage endpoint correctness
2. ✅ Verify order placement field names
3. ✅ Test all endpoints against KuCoin API
4. ✅ Verify symbol format expectations

### Phase 2: Enhancements (If Needed)
1. 🔄 Add `closePosition()` to service layer
2. ⚠️ Add symbol normalization if needed
3. ⚠️ Add quantity/price precision handling
4. ⚠️ Verify/fix any endpoint mismatches

### Phase 3: Testing
1. ✅ Test with `FEATURE_FUTURES=false` (zero impact)
2. ✅ Test with `FEATURE_FUTURES=true` (full functionality)
3. ✅ Test error scenarios
4. ✅ Test rate limiting

### Phase 4: Documentation
1. ✅ Update README.md
2. ✅ Update ENDPOINTS.md
3. ✅ Update DATA_MODEL.md
4. ✅ Update RUNBOOK.md

---

## Conclusion

**Overall Assessment:** B's implementation is **superior** to A's in all areas except:
- A has `closePosition()` helper (easy to add)
- A may have correct leverage endpoint (need to verify)

**Recommendation:** 
- ✅ Keep B's implementation as-is
- ✅ Add `closePosition()` helper method
- ⚠️ Verify/update leverage endpoint if needed
- ✅ No need to extract A's code (B is already better)

**Integration Effort:** **LOW** - Most work already done, just verification and minor enhancements needed.

---

**Document Maintained By:** Integration Team  
**Last Updated:** 2025-11-06  
**Next Steps:** Stage 3 (Verify contracts, flags, ENV)
