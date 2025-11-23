# Enhanced Dashboard Pack — Chart + News + Sentiment + Signals (Minimal Diffs)

This pack adds **real-data** News/Sentiment integration bound to the selected symbol, plus a simple **enhanced symbol dashboard** component. It uses your API_BASE endpoints:

- `GET /market/candlestick/{symbol}?interval={tf}&limit=500`
- `GET /signals/{symbol}`
- `GET /proxy/news?query=...`
- `GET /proxy/fear-greed`

## Files

- `src/services/enhanced/ohlcClient.ts` — fetch OHLC with MIN_OHLC_BARS guard
- `src/services/enhanced/signalsClient.ts` — fetch per-symbol signals
- `src/services/enhanced/newsProvider.ts` — fetch news + fear/greed
- `src/services/enhanced/sentimentProvider.ts` — compact sentiment adapter
- `src/components/news/NewsCard.tsx`, `NewsPanel.tsx` — UI
- `src/components/enhanced/EnhancedSymbolDashboard.tsx` — glue (chart + sentiment + news + optional signals)
- `src/config/risk.ts` — shared constants (MIN_OHLC_BARS, refresh)

## How to wire (minimal)

1. Copy the `src/` folders to your repo (keep paths).
2. In your main page (home), **replace the duplicate bottom signals block** with:
   ```tsx
   <EnhancedSymbolDashboard symbol={currentSymbol} timeframe={currentTimeframe} hideBottomDuplicateSignals />
   ```
   - If you want to keep bottom signals, set `hideBottomDuplicateSignals={false}`.

3. Ensure env:
   ```env
   VITE_APP_MODE=online
   VITE_API_BASE=http://localhost:8001/api
   VITE_WS_BASE=ws://localhost:8001
   VITE_STRICT_REAL_DATA=true
   VITE_USE_MOCK_DATA=false
   VITE_ALLOW_FAKE_DATA=false
   ```

4. No mock in Online: If any endpoint fails or bars < MIN_OHLC_BARS, the section hides or shows a small error badge — **no fake numbers**.

## Notes

- The chart is a lightweight SVG line (safe fallback). If you have a richer existing candlestick component, swap it inside `EnhancedSymbolDashboard`.
- News query uses the symbol (e.g., 'BTCUSDT' → 'BTC') to focus headlines per selected asset.
- Sentiment uses fear/greed as a compact proxy. You can extend to Reddit/CG if endpoints exist.
- Keep RTL and design tokens; the components use neutral Tailwind/utility classes.
