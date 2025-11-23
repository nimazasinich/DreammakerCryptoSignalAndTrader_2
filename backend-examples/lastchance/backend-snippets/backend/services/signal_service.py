import logging
from dataclasses import asdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from db.redis_client import redis_client
try:
    from ml.backtester import Signal, backtester
    from ml.model import crypto_model
except ImportError:
    Signal = None
    backtester = None
    crypto_model = None
from services.market_service import MarketService

logger = logging.getLogger(__name__)


class SignalService:
    """Advanced signal generation service with multi-timeframe analysis."""

    def __init__(self):
        self.market_service = MarketService()
        self.timeframes = ["1m", "5m", "15m", "1h", "4h", "1d"]
        self.signal_cache_ttl = 60  # Cache signals for 1 minute

    async def generate_signals(
        self, symbol: str, timeframe: str = "1h", strategy: str = "combined"
    ) -> List[Dict]:
        """
        Generate trading signals for a symbol.

        Args:
            symbol: Trading symbol
            timeframe: Analysis timeframe
            strategy: Signal strategy ('ai_signals', 'technical_only', 'combined')

        Returns:
            List of signal dictionaries
        """
        try:
            # Check cache first
            cache_key = f"signals:{symbol}:{timeframe}:{strategy}"
            cached_signals = await redis_client.get(cache_key)

            if cached_signals:
                return cached_signals

            # Generate new signals
            signals = await self._generate_multi_timeframe_signals(
                symbol, timeframe, strategy
            )

            # Cache results
            await redis_client.set(cache_key, signals, expire=self.signal_cache_ttl)

            return signals

        except Exception as e:
            logger.error(f"Error generating signals for {symbol}: {e}")
            return []

    async def _generate_multi_timeframe_signals(
        self, symbol: str, primary_timeframe: str, strategy: str
    ) -> List[Dict]:
        """Generate signals using multi-timeframe analysis."""
        signals = []

        # Get signals for primary timeframe
        primary_signals = await self._generate_single_timeframe_signals(
            symbol, primary_timeframe, strategy
        )

        # Get signals for higher timeframes (for trend confirmation)
        higher_timeframes = self._get_higher_timeframes(primary_timeframe)

        trend_signals = {}
        for tf in higher_timeframes:
            tf_signals = await self._generate_single_timeframe_signals(
                symbol, tf, strategy
            )
            if tf_signals:
                trend_signals[tf] = tf_signals[-1]  # Get latest signal

        # Combine signals
        for signal in primary_signals:
            # Add trend confirmation
            signal["trend_confirmation"] = self._analyze_trend_confirmation(
                signal, trend_signals
            )

            # Calculate final score
            signal["final_score"] = self._calculate_final_score(signal, trend_signals)

            # Convert to dict
            signal_dict = (
                asdict(signal) if hasattr(signal, "__dataclass_fields__") else signal
            )
            signals.append(signal_dict)

        return signals

    async def _generate_single_timeframe_signals(
        self, symbol: str, timeframe: str, strategy: str
    ) -> List[Signal]:
        """Generate signals for a single timeframe."""
        try:
            # Get market data
            candlestick_data = await self.market_service.get_candlestick_data(
                symbol, timeframe, 200
            )

            if len(candlestick_data) < 60:
                return []

            # Get technical indicators
            indicators = await self.market_service.get_technical_indicators(
                symbol, timeframe
            )

            signals = []

            # Generate signal for latest data point
            latest_data = candlestick_data[-60:]  # Last 60 periods
            latest_price = candlestick_data[-1]["close"]
            timestamp = datetime.fromtimestamp(candlestick_data[-1]["time"] / 1000)

            if strategy == "ai_signals":
                signal = await self._generate_ai_signal(
                    symbol, latest_data, indicators, timestamp, latest_price
                )
            elif strategy == "technical_only":
                signal = self._generate_technical_signal(
                    symbol, latest_data, indicators, timestamp, latest_price
                )
            elif strategy == "combined":
                ai_signal = await self._generate_ai_signal(
                    symbol, latest_data, indicators, timestamp, latest_price
                )
                tech_signal = self._generate_technical_signal(
                    symbol, latest_data, indicators, timestamp, latest_price
                )
                signal = self._combine_signals(ai_signal, tech_signal)

            if signal:
                signals.append(signal)

            return signals

        except Exception as e:
            logger.error(f"Error generating signals for {symbol} {timeframe}: {e}")
            return []

    async def _generate_ai_signal(
        self,
        symbol: str,
        data: List[Dict],
        indicators: Dict,
        timestamp: datetime,
        price: float,
    ) -> Optional[Signal]:
        """Generate AI-based signal."""
        try:
            if crypto_model is None:
                logger.warning("ML model not available, skipping AI signal generation")
                return None

            # Initialize model if needed
            if crypto_model.model is None:
                crypto_model.build_model()

            # Get AI prediction
            prediction = await crypto_model.predict(data, indicators)

            # Convert to signal
            signal_type = "HOLD"
            confidence = prediction["confidence"]
            score = 0.0

            if prediction["prediction"] == "BULL" and confidence > 0.6:
                signal_type = "BUY"
                score = confidence * 100
            elif prediction["prediction"] == "BEAR" and confidence > 0.6:
                signal_type = "SELL"
                score = confidence * 100

            return Signal(
                symbol=symbol,
                timestamp=timestamp,
                signal_type=signal_type,
                confidence=confidence,
                price=price,
                score=score,
                reasoning=f"AI: {prediction['prediction']} ({confidence:.2f})",
            )

        except Exception as e:
            logger.error(f"Error generating AI signal: {e}")
            return None

    def _generate_technical_signal(
        self,
        symbol: str,
        data: List[Dict],
        indicators: Dict,
        timestamp: datetime,
        price: float,
    ) -> Optional[Signal]:
        """Generate technical analysis signal."""
        try:
            # RSI analysis
            rsi = indicators.get("rsi", 50)
            rsi_score = 0
            if rsi < 30:
                rsi_score = 1  # Oversold - bullish
            elif rsi > 70:
                rsi_score = -1  # Overbought - bearish

            # MACD analysis
            macd_data = indicators.get("macd", {})
            macd_line = macd_data.get("macd", 0)
            signal_line = macd_data.get("signal", 0)
            macd_score = 0
            if macd_line > signal_line and macd_line > 0:
                macd_score = 1
            elif macd_line < signal_line and macd_line < 0:
                macd_score = -1

            # Bollinger Bands analysis
            bb = indicators.get("bb", {})
            bb_upper = bb.get("upper", price * 1.02)
            bb_lower = bb.get("lower", price * 0.98)
            bb_score = 0
            if price <= bb_lower:
                bb_score = 1  # Near lower band - bullish
            elif price >= bb_upper:
                bb_score = -1  # Near upper band - bearish

            # Moving average analysis
            sma_20 = indicators.get("sma_20", price)
            sma_50 = indicators.get("sma_50", price)
            ma_score = 0
            if price > sma_20 > sma_50:
                ma_score = 1  # Uptrend
            elif price < sma_20 < sma_50:
                ma_score = -1  # Downtrend

            # Volume analysis (if available)
            volume_score = 0
            if len(data) >= 2:
                current_volume = data[-1].get("volume", 0)
                avg_volume = sum(d.get("volume", 0) for d in data[-20:]) / 20
                if current_volume > avg_volume * 1.5:
                    volume_score = 1  # High volume - confirms signal

            # Combine scores
            total_score = rsi_score + macd_score + bb_score + ma_score + volume_score
            confidence = abs(total_score) / 5.0

            signal_type = "HOLD"
            score = 0.0

            if total_score >= 2:
                signal_type = "BUY"
                score = confidence * 100
            elif total_score <= -2:
                signal_type = "SELL"
                score = confidence * 100

            reasoning = f"Technical: RSI={rsi:.1f}, MACD={macd_score}, BB={bb_score}, MA={ma_score}, Vol={volume_score}"

            return Signal(
                symbol=symbol,
                timestamp=timestamp,
                signal_type=signal_type,
                confidence=confidence,
                price=price,
                score=score,
                reasoning=reasoning,
            )

        except Exception as e:
            logger.error(f"Error generating technical signal: {e}")
            return None

    def _combine_signals(self, ai_signal: Signal, tech_signal: Signal) -> Signal:
        """Combine AI and technical signals."""
        if not ai_signal or not tech_signal:
            return ai_signal or tech_signal

        # Weighted combination (60% AI, 40% technical)
        ai_weight = 0.6
        tech_weight = 0.4

        combined_score = ai_signal.score * ai_weight + tech_signal.score * tech_weight

        signal_type = "HOLD"
        if combined_score > 50:
            signal_type = "BUY"
        elif combined_score < -50:
            signal_type = "SELL"

        combined_confidence = (
            ai_signal.confidence * ai_weight + tech_signal.confidence * tech_weight
        )

        reasoning = f"Combined: AI({ai_signal.score:.1f}) + Tech({tech_signal.score:.1f}) = {combined_score:.1f}"

        return Signal(
            symbol=ai_signal.symbol,
            timestamp=ai_signal.timestamp,
            signal_type=signal_type,
            confidence=combined_confidence,
            price=ai_signal.price,
            score=combined_score,
            reasoning=reasoning,
        )

    def _get_higher_timeframes(self, timeframe: str) -> List[str]:
        """Get higher timeframes for trend confirmation."""
        timeframe_order = ["1m", "5m", "15m", "1h", "4h", "1d"]

        try:
            current_index = timeframe_order.index(timeframe)
            return timeframe_order[current_index + 1 :]
        except (ValueError, IndexError):
            return []

    def _analyze_trend_confirmation(self, signal: Signal, trend_signals: Dict) -> Dict:
        """Analyze trend confirmation from higher timeframes."""
        confirmation = {
            "bullish_count": 0,
            "bearish_count": 0,
            "neutral_count": 0,
            "confidence": 0.0,
        }

        for tf, tf_signal in trend_signals.items():
            if tf_signal.signal_type == "BUY":
                confirmation["bullish_count"] += 1
            elif tf_signal.signal_type == "SELL":
                confirmation["bearish_count"] += 1
            else:
                confirmation["neutral_count"] += 1

        total_signals = len(trend_signals)
        if total_signals > 0:
            if signal.signal_type == "BUY":
                confirmation["confidence"] = (
                    confirmation["bullish_count"] / total_signals
                )
            elif signal.signal_type == "SELL":
                confirmation["confidence"] = (
                    confirmation["bearish_count"] / total_signals
                )

        return confirmation

    def _calculate_final_score(self, signal: Signal, trend_signals: Dict) -> float:
        """Calculate final signal score with trend confirmation."""
        base_score = signal.score

        # Get trend confirmation
        trend_confirmation = self._analyze_trend_confirmation(signal, trend_signals)

        # Adjust score based on trend confirmation
        trend_multiplier = 1.0 + (trend_confirmation["confidence"] * 0.3)

        final_score = base_score * trend_multiplier

        # Cap at 100
        return min(final_score, 100.0)

    async def get_signal_summary(self, symbol: str) -> Dict:
        """Get signal summary for a symbol across all timeframes."""
        summary = {
            "symbol": symbol,
            "timeframes": {},
            "overall_signal": "HOLD",
            "overall_score": 0.0,
            "confidence": 0.0,
        }

        for timeframe in self.timeframes:
            signals = await self.generate_signals(symbol, timeframe, "combined")
            if signals:
                latest_signal = signals[-1]
                summary["timeframes"][timeframe] = {
                    "signal": latest_signal["signal_type"],
                    "score": latest_signal["final_score"],
                    "confidence": latest_signal["confidence"],
                }

        # Calculate overall signal
        scores = [tf["score"] for tf in summary["timeframes"].values()]
        confidences = [tf["confidence"] for tf in summary["timeframes"].values()]

        if scores:
            avg_score = sum(scores) / len(scores)
            avg_confidence = sum(confidences) / len(confidences)

            summary["overall_score"] = avg_score
            summary["overall_confidence"] = avg_confidence

            if avg_score > 30:
                summary["overall_signal"] = "BUY"
            elif avg_score < -30:
                summary["overall_signal"] = "SELL"

        return summary


# Global signal service instance
signal_service = SignalService()
