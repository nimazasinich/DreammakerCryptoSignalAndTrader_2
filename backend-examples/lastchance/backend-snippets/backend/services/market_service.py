import logging
from typing import Dict, List, Optional

import aiohttp
import ccxt.async_support as ccxt

from config import settings

logger = logging.getLogger(__name__)


class MarketService:
    def __init__(self):
        self.coingecko_url = settings.COINGECKO_API_URL
        self.binance_url = settings.BINANCE_API_URL
        self.exchange = ccxt.binance()

        self.coins = [
            {"id": "bitcoin", "symbol": "BTC", "name": "Bitcoin"},
            {"id": "ethereum", "symbol": "ETH", "name": "Ethereum"},
            {"id": "binancecoin", "symbol": "BNB", "name": "BNB"},
            {"id": "cardano", "symbol": "ADA", "name": "Cardano"},
            {"id": "solana", "symbol": "SOL", "name": "Solana"},
            {"id": "ripple", "symbol": "XRP", "name": "XRP"},
            {"id": "polkadot", "symbol": "DOT", "name": "Polkadot"},
            {"id": "dogecoin", "symbol": "DOGE", "name": "Dogecoin"},
            {"id": "avalanche-2", "symbol": "AVAX", "name": "Avalanche"},
            {"id": "chainlink", "symbol": "LINK", "name": "Chainlink"},
        ]

    async def get_market_data(self, symbols: Optional[List[str]] = None) -> List[Dict]:
        """Get market data from CoinGecko."""
        try:
            coin_ids = [coin["id"] for coin in self.coins]
            if symbols:
                coin_ids = [
                    coin["id"] for coin in self.coins if coin["symbol"] in symbols
                ]

            async with aiohttp.ClientSession() as session:
                url = f"{self.coingecko_url}/coins/markets"
                params = {
                    "vs_currency": "usd",
                    "ids": ",".join(coin_ids),
                    "order": "market_cap_desc",
                    "per_page": 100,
                    "page": 1,
                    "sparkline": False,
                    "price_change_percentage": "24h",
                }

                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        return [
                            {
                                "id": coin["id"],
                                "symbol": coin["symbol"].upper(),
                                "name": coin["name"],
                                "price": coin["current_price"],
                                "change_24h": coin.get("price_change_24h", 0),
                                "change_percent_24h": coin.get(
                                    "price_change_percentage_24h", 0
                                ),
                                "volume_24h": coin.get("total_volume", 0),
                                "market_cap": coin.get("market_cap", 0),
                                "high_24h": coin.get("high_24h", 0),
                                "low_24h": coin.get("low_24h", 0),
                                "timestamp": (
                                    int(coin.get("last_updated", 0) * 1000)
                                    if coin.get("last_updated")
                                    else 0
                                ),
                            }
                            for coin in data
                        ]
                    else:
                        logger.error(f"CoinGecko API error: {response.status}")
                        return []
        except Exception as e:
            logger.error(f"Error fetching market data: {e}")
            return []

    async def get_candlestick_data(
        self, symbol: str, interval: str = "1h", limit: int = 100
    ) -> List[Dict]:
        """Get candlestick data from Binance."""
        try:
            # Map symbol to Binance format
            binance_symbol = f"{symbol}USDT"

            # Fetch OHLCV data
            ohlcv = await self.exchange.fetch_ohlcv(
                binance_symbol, timeframe=interval, limit=limit
            )

            return [
                {
                    "time": candle[0],
                    "open": candle[1],
                    "high": candle[2],
                    "low": candle[3],
                    "close": candle[4],
                    "volume": candle[5],
                }
                for candle in ohlcv
            ]
        except Exception as e:
            logger.error(f"Error fetching candlestick data for {symbol}: {e}")
            return []

    async def get_technical_indicators(self, symbol: str, interval: str = "1h") -> Dict:
        """Calculate technical indicators from candlestick data."""
        try:
            # Get candlestick data
            candles = await self.get_candlestick_data(symbol, interval, 200)

            if not candles or len(candles) < 50:
                return self._get_default_indicators()

            # Extract close prices
            closes = [c["close"] for c in candles]
            highs = [c["high"] for c in candles]
            lows = [c["low"] for c in candles]

            # Calculate indicators
            rsi = self._calculate_rsi(closes)
            macd_data = self._calculate_macd(closes)
            sma_20 = self._calculate_sma(closes, 20)
            sma_50 = self._calculate_sma(closes, 50)
            ema_12 = self._calculate_ema(closes, 12)
            ema_26 = self._calculate_ema(closes, 26)
            bb = self._calculate_bollinger_bands(closes, 20)

            return {
                "rsi": rsi,
                "macd": macd_data,
                "sma_20": sma_20,
                "sma_50": sma_50,
                "ema_12": ema_12,
                "ema_26": ema_26,
                "bb": bb,
            }
        except Exception as e:
            logger.error(f"Error calculating indicators for {symbol}: {e}")
            return self._get_default_indicators()

    def _calculate_rsi(self, prices: List[float], period: int = 14) -> float:
        """Calculate RSI."""
        if len(prices) < period + 1:
            return 50.0

        deltas = [prices[i] - prices[i - 1] for i in range(1, len(prices))]
        gains = [d if d > 0 else 0 for d in deltas]
        losses = [-d if d < 0 else 0 for d in deltas]

        avg_gain = sum(gains[-period:]) / period
        avg_loss = sum(losses[-period:]) / period

        if avg_loss == 0:
            return 100.0

        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        return rsi

    def _calculate_sma(self, prices: List[float], period: int) -> float:
        """Calculate Simple Moving Average."""
        if len(prices) < period:
            return prices[-1] if prices else 0.0
        return sum(prices[-period:]) / period

    def _calculate_ema(self, prices: List[float], period: int) -> float:
        """Calculate Exponential Moving Average."""
        if len(prices) < period:
            return prices[-1] if prices else 0.0

        multiplier = 2 / (period + 1)
        ema = self._calculate_sma(prices[:period], period)

        for price in prices[period:]:
            ema = (price - ema) * multiplier + ema

        return ema

    def _calculate_macd(self, prices: List[float]) -> Dict:
        """Calculate MACD."""
        ema_12 = self._calculate_ema(prices, 12)
        ema_26 = self._calculate_ema(prices, 26)
        macd = ema_12 - ema_26

        # Simple signal line (would need more data for proper calculation)
        signal = macd * 0.9
        histogram = macd - signal

        return {"macd": macd, "signal": signal, "histogram": histogram}

    def _calculate_bollinger_bands(self, prices: List[float], period: int = 20) -> Dict:
        """Calculate Bollinger Bands."""
        if len(prices) < period:
            current_price = prices[-1] if prices else 0.0
            return {
                "upper": current_price * 1.02,
                "middle": current_price,
                "lower": current_price * 0.98,
            }

        sma = self._calculate_sma(prices, period)
        recent_prices = prices[-period:]
        variance = sum((p - sma) ** 2 for p in recent_prices) / period
        std_dev = variance**0.5

        return {
            "upper": sma + (2 * std_dev),
            "middle": sma,
            "lower": sma - (2 * std_dev),
        }

    def _get_default_indicators(self) -> Dict:
        """Return default indicators when calculation fails."""
        return {
            "rsi": 50.0,
            "macd": {"macd": 0.0, "signal": 0.0, "histogram": 0.0},
            "sma_20": 0.0,
            "sma_50": 0.0,
            "ema_12": 0.0,
            "ema_26": 0.0,
            "bb": {"upper": 0.0, "middle": 0.0, "lower": 0.0},
        }

    async def close(self):
        """Close exchange connection."""
        await self.exchange.close()
