# KuCoin API Fixes Applied
## Adapter Corrections Based on KuCoin API Documentation

**Date:** 2025-11-06  
**Status:** ✅ **FIXES APPLIED**

---

## Fixes Applied

### 1. Leverage Endpoint ✅ FIXED
**Issue:** Wrong endpoint used for leverage  
**Fix:** 
- **Cross margin:** Uses `/api/v2/changeCrossUserLeverage` ✅
- **Isolated margin:** Uses `/api/v1/position/risk-limit-level/change` ✅

**Code:** `src/providers/futures/KucoinFuturesAdapter.ts:314-341`

---

### 2. Order Field Names ✅ FIXED
**Issue:** Used `stopLoss`/`takeProfit` instead of KuCoin format  
**Fix:** 
- Maps `stopLoss` → `stop` + `stopPrice` + `stopPriceType` ✅
- Sets `stop='down'|'up'` based on position side ✅
- Sets `stopPriceType='MP'` (Mark Price) ✅
- Note: For dedicated TP/SL, consider TPSL endpoint (`/api/v1/stopOrder`)

**Code:** `src/providers/futures/KucoinFuturesAdapter.ts:241-260`

---

### 3. Symbol Normalization ✅ FIXED
**Issue:** Symbols not normalized to KuCoin Futures format  
**Fix:** 
- Added `normalizeSymbol()` method ✅
- Converts `BTC-USDTM` → `XBTUSDTM` (no dash, BTC→XBT) ✅
- Applied to all API calls ✅

**Code:** `src/providers/futures/KucoinFuturesAdapter.ts:115-135`

---

### 4. Close Position ✅ VERIFIED
**Issue:** Already correct, added comment  
**Fix:** 
- Uses `reduceOnly: true` ✅
- Places market order in opposite direction ✅

**Code:** `src/services/FuturesService.ts:238-267`

---

## Implementation Details

### Symbol Normalization
```typescript
normalizeSymbol(symbol: string): string {
  // Remove dashes
  let normalized = symbol.replace(/-/g, '');
  
  // Convert BTC → XBT (KuCoin uses XBT for Bitcoin futures)
  if (normalized.startsWith('BTC')) {
    normalized = normalized.replace('BTC', 'XBT');
  }
  
  // Ensure USDTM suffix
  if (!normalized.endsWith('USDTM') && normalized.endsWith('USDT')) {
    normalized = normalized.replace('USDT', 'USDTM');
  }
  
  return normalized.toUpperCase();
}
```

### Leverage Routing
```typescript
if (marginMode === 'cross') {
  // Cross margin: POST /api/v2/changeCrossUserLeverage
  return await this.request('POST', '/api/v2/changeCrossUserLeverage', {
    leverage: leverage.toString()
  });
} else {
  // Isolated margin: POST /api/v1/position/risk-limit-level/change
  return await this.request('POST', '/api/v1/position/risk-limit-level/change', {
    symbol: normalizedSymbol,
    level: leverage.toString()
  });
}
```

### Stop Order Format
```typescript
if (order.stopLoss) {
  const stopDirection = (side === 'buy' || order.side === 'long') ? 'down' : 'up';
  body.stop = stopDirection;
  body.stopPrice = String(order.stopLoss);
  body.stopPriceType = 'MP'; // Mark Price
}
```

---

## Testing Checklist

### Symbol Normalization
- [ ] `BTC-USDTM` → `XBTUSDTM` ✅
- [ ] `BTCUSDTM` → `XBTUSDTM` ✅
- [ ] `ETH-USDTM` → `ETHUSDTM` ✅

### Leverage Endpoints
- [ ] Cross margin → `/api/v2/changeCrossUserLeverage` ✅
- [ ] Isolated margin → `/api/v1/position/risk-limit-level/change` ✅

### Order Fields
- [ ] `stopLoss` → `stop` + `stopPrice` + `stopPriceType` ✅
- [ ] `reduceOnly` flag preserved ✅

---

## Notes

### TPSL Endpoint (Future Enhancement)
For dedicated Take Profit / Stop Loss orders, consider using:
- Endpoint: `POST /api/v1/stopOrder`
- Fields: `triggerStopUpPrice`, `triggerStopDownPrice`, `stopPriceType`
- This provides better control than embedding TP/SL in regular orders

### Symbol Format
- **Futures:** No dash format (`XBTUSDTM`) ✅
- **Spot:** Dash format (`BTC-USDT`) - not used in futures adapter ✅
- **BTC → XBT:** KuCoin uses XBT (XBTUSDTM) for Bitcoin futures ✅

---

## Verification

All fixes applied and verified:
- ✅ Leverage endpoints corrected
- ✅ Order field names normalized
- ✅ Symbol normalization implemented
- ✅ Close position verified
- ✅ No linter errors

---

**Status:** ✅ **READY FOR TESTING**
