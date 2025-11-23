# Data Policy Documentation

## Overview

This document describes the strict data policy enforced across the DreammakerCryptoSignalAndTrader application. The policy ensures clear separation between production (real data), demo (mock fixtures), and test (optional synthetic) environments.

## Policy Rules

### 1. Online Mode (Production)
**Strictly real data only. No mock, no synthetic.**

- **Environment**: `VITE_APP_MODE=online`
- **Behavior**:
  - Only real market data from external APIs (Binance, CoinGecko, etc.)
  - Fail fast with visible errors if real data is unavailable
  - Never inject mock or synthetic data as fallback
  - WebSocket connections use real endpoints
- **Use Case**: Production deployments, live trading

```env
# Online Mode Configuration
VITE_APP_MODE=online
VITE_STRICT_REAL_DATA=true
VITE_USE_MOCK_DATA=false
VITE_ALLOW_FAKE_DATA=false
```

### 2. Demo Mode
**Mock fixtures only. No real data, no synthetic generation.**

- **Environment**: `VITE_APP_MODE=demo`
- **Behavior**:
  - Uses pre-recorded mock fixtures from `src/mocks/fixtures/`
  - Deterministic data (same input → same output)
  - No external API calls
  - No random synthetic generation (unless explicitly creating test fixtures)
- **Use Case**: Demonstrations, UI testing, offline presentations

```env
# Demo Mode Configuration
VITE_APP_MODE=demo
VITE_STRICT_REAL_DATA=false
VITE_USE_MOCK_DATA=true
VITE_ALLOW_FAKE_DATA=false
```

### 3. Test Mode (Optional)
**Flexible data sources for testing.**

- **Environment**: `VITE_APP_MODE=test`
- **Behavior**:
  - Can use mock fixtures
  - Can generate synthetic data if `ALLOW_FAKE_DATA=true`
  - Used for automated testing and development
- **Use Case**: Unit tests, integration tests, development

```env
# Test Mode Configuration
VITE_APP_MODE=test
VITE_STRICT_REAL_DATA=false
VITE_USE_MOCK_DATA=true
VITE_ALLOW_FAKE_DATA=true
```

## Architecture

### Central Policy Module

The data policy is centralized in `src/config/dataPolicy.ts`:

```typescript
export type AppMode = 'online' | 'demo' | 'test';

export const APP_MODE: AppMode =
  (import.meta.env.VITE_APP_MODE as AppMode) || 'online';

export const STRICT_REAL_DATA =
  (import.meta.env.VITE_STRICT_REAL_DATA === 'true') || APP_MODE === 'online';

export const USE_MOCK_DATA =
  (import.meta.env.VITE_USE_MOCK_DATA === 'true') || APP_MODE === 'demo';

export const ALLOW_FAKE_DATA =
  (import.meta.env.VITE_ALLOW_FAKE_DATA === 'true') && APP_MODE === 'test';

export function assertPolicy(): void {
  // Throws error if policy is violated
}
```

### Policy Enforcement Points

1. **App Bootstrap** (`src/main.tsx`)
   - Calls `assertPolicy()` at startup
   - Halts app if policy is violated

2. **Data Providers**
   - `FallbackDataProvider.ts`: Backend data cascade
   - `RealDataManager.ts`: Frontend data manager
   - `MarketDataService.ts`: Signal engine data service

3. **UI Components**
   - `DataSourceBadge`: Visual indicator of data source
   - `StatusRibbon`: Shows current mode and data source

## Mock Fixtures

Demo mode uses deterministic mock fixtures from `src/mocks/fixtures/`:

```
src/mocks/fixtures/
├── ohlcv/
│   ├── BTC_1h.json
│   ├── ETH_1h.json
│   └── ...
├── prices/
└── signals/
```

### Fixture Format (OHLCV)

```json
[
  {
    "t": 1704067200000,
    "o": 43250.50,
    "h": 43450.75,
    "l": 43100.25,
    "c": 43380.00,
    "v": 15432.50
  }
]
```

### Fixture Loader

`src/mocks/fixtureLoader.ts` handles loading fixtures:

```typescript
import { loadOHLCVFixture } from '../mocks/fixtureLoader';

// In demo mode
const bars = loadOHLCVFixture('BTC', '1h', 500);
```

## Error Handling

### Online Mode Errors

When real data is unavailable in online mode:

```
[DATA POLICY VIOLATION] All data sources failed for BTCUSDT 1h.
Mode: online. Real data is unavailable and synthetic fallback is forbidden.
```

The UI shows:
- Error message to user
- Data source badge shows "Unknown" (red)
- No signals are computed

### Demo Mode Errors

If mock fixtures are missing in demo mode:

```
[DATA POLICY] Demo mode requires mock fixtures.
Fixture not available for BTC 1h
```

## UI Indicators

### Data Source Badge

Shows the current data source:

- **Real** (Green): Live data from APIs
- **Mock** (Yellow): Demo mode with fixtures
- **Synthetic** (Red): Test mode with generated data
- **Unknown** (Gray): Data source unavailable

### Status Ribbon

Located at the top of the app, shows:
- Health status
- Data source indicator
- Mode toggles (if applicable)

## Migration Guide

### From Legacy Mode

If your codebase previously used `USE_MOCK_DATA` without strict policy:

1. Add `VITE_APP_MODE` to `.env`:
   ```env
   VITE_APP_MODE=online  # or demo, or test
   ```

2. Update imports:
   ```typescript
   // Old
   import { USE_MOCK_DATA } from '../config/env';

   // New
   import { shouldUseMockFixtures, requiresRealData } from '../config/dataPolicy';
   ```

3. Update conditional logic:
   ```typescript
   // Old
   if (USE_MOCK_DATA) { ... }

   // New
   if (shouldUseMockFixtures()) { ... }
   ```

## Testing

### Testing Policy Enforcement

```typescript
// Test that policy is enforced in online mode
describe('Data Policy', () => {
  it('should reject mock data in online mode', () => {
    process.env.VITE_APP_MODE = 'online';
    process.env.VITE_USE_MOCK_DATA = 'true';

    expect(() => assertPolicy()).toThrow('Mock data is forbidden in online mode');
  });
});
```

### Testing Data Sources

```typescript
// Test that correct data source is used
it('should use mock fixtures in demo mode', async () => {
  process.env.VITE_APP_MODE = 'demo';

  const bars = await fetchOHLC('BTC', '1h', 100);

  // Should return deterministic mock data
  expect(bars).toHaveLength(100);
  expect(bars[0].o).toBe(expectedMockPrice);
});
```

## Best Practices

1. **Always set APP_MODE explicitly** in your `.env` file
2. **Never bypass the policy** with direct data generation
3. **Use fixtures for demos** instead of live data
4. **Create comprehensive fixtures** for common symbols and timeframes
5. **Test both online and demo modes** in CI/CD
6. **Monitor data source badges** in production to ensure real data is being used

## Troubleshooting

### App shows "Configuration Error"

**Cause**: Policy violation detected at startup

**Solution**: Check your `.env` file for conflicting settings:
- `VITE_APP_MODE=online` should not have `VITE_USE_MOCK_DATA=true`
- `VITE_APP_MODE=online` should not have `VITE_ALLOW_FAKE_DATA=true`

### Data source shows "Unknown"

**Cause**: Real data fetch failed in online mode

**Solution**:
1. Check API connectivity
2. Verify API keys in `.env`
3. Check browser console for detailed error messages

### Signals not computing in demo mode

**Cause**: Missing mock fixtures

**Solution**:
1. Create fixtures in `src/mocks/fixtures/ohlcv/`
2. Or rely on deterministic generator (fallback)

## Future Enhancements

- [ ] Automatic fixture generation tool
- [ ] Fixture versioning and updates
- [ ] Policy compliance dashboard
- [ ] Automated policy testing in CI/CD
- [ ] Data source performance metrics

## References

- [Environment Configuration](./.env.example)
- [Mock Fixtures](../src/mocks/fixtures/README.md)
- [Data Policy Module](../src/config/dataPolicy.ts)
- [Fixture Loader](../src/mocks/fixtureLoader.ts)
