# Mock Fixtures

This directory contains deterministic mock data fixtures for demo mode.

## Directory Structure

```
fixtures/
  ├── ohlcv/           # OHLCV (candlestick) data fixtures
  │   ├── BTC_1h.json  # Bitcoin 1-hour timeframe
  │   ├── ETH_1h.json  # Ethereum 1-hour timeframe
  │   └── ...
  ├── prices/          # Spot price fixtures
  └── signals/         # Trading signal fixtures
```

## Creating Fixtures

Fixtures should be JSON files with deterministic, reproducible data. They are used in demo mode to provide consistent behavior without relying on external APIs.

### OHLCV Fixture Format

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

Where:
- `t`: timestamp (milliseconds since epoch)
- `o`: open price
- `h`: high price
- `l`: low price
- `c`: close price
- `v`: volume

## Usage

Fixtures are automatically loaded by `fixtureLoader.ts` when the app is in demo mode (`VITE_APP_MODE=demo`).

If a fixture file doesn't exist, the loader will generate deterministic data based on the symbol name (same input always produces same output).

## Best Practices

1. **Deterministic**: Fixtures should always contain the same data for reproducibility
2. **Realistic**: Use realistic price ranges and patterns
3. **Adequate Data**: Provide at least 200-500 bars for proper technical analysis
4. **Version Control**: Commit fixture files to git for consistency across environments
