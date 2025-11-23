import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from ml.model import crypto_model
from services.market_service import MarketService

logger = logging.getLogger(__name__)


@dataclass
class BacktestResult:
    """Results from a backtest run."""

    total_return: float
    sharpe_ratio: float
    max_drawdown: float
    win_rate: float
    total_trades: int
    avg_trade_return: float
    volatility: float
    start_date: datetime
    end_date: datetime
    initial_capital: float
    final_capital: float
    trades: List[Dict]


@dataclass
class Signal:
    """Trading signal."""

    symbol: str
    timestamp: datetime
    signal_type: str  # 'BUY', 'SELL', 'HOLD'
    confidence: float
    price: float
    score: float
    reasoning: str


class Backtester:
    """Advanced backtesting engine for trading strategies."""

    def __init__(self):
        self.market_service = MarketService()
        self.commission_rate = 0.001  # 0.1% commission
        self.slippage_rate = 0.0005  # 0.05% slippage

    async def backtest_strategy(
        self,
        symbol: str,
        strategy_name: str,
        start_date: datetime,
        end_date: datetime,
        initial_capital: float = 10000.0,
        timeframe: str = "1h",
    ) -> BacktestResult:
        """
        Backtest a trading strategy.

        Args:
            symbol: Trading symbol (e.g., 'BTC')
            strategy_name: Name of strategy ('ai_signals', 'technical_only', 'combined')
            start_date: Start date for backtest
            end_date: End date for backtest
            initial_capital: Starting capital
            timeframe: Data timeframe

        Returns:
            BacktestResult with performance metrics
        """
        logger.info(f"Starting backtest for {symbol} using {strategy_name}")

        # Get historical data
        historical_data = await self._get_historical_data(
            symbol, start_date, end_date, timeframe
        )

        if len(historical_data) < 100:
            raise ValueError(f"Insufficient data for {symbol}")

        # Generate signals
        signals = await self._generate_signals(symbol, historical_data, strategy_name)

        # Execute trades
        trades = self._execute_trades(signals, historical_data, initial_capital)

        # Calculate performance metrics
        result = self._calculate_performance_metrics(
            trades, initial_capital, start_date, end_date
        )

        logger.info(f"Backtest completed. Total return: {result.total_return:.2%}")
        return result

    async def _get_historical_data(
        self, symbol: str, start_date: datetime, end_date: datetime, timeframe: str
    ) -> List[Dict]:
        """Get historical candlestick data."""
        # Calculate number of periods needed
        days_diff = (end_date - start_date).days

        # Map timeframe to data points
        timeframe_map = {
            "1m": days_diff * 24 * 60,
            "5m": days_diff * 24 * 12,
            "15m": days_diff * 24 * 4,
            "1h": days_diff * 24,
            "4h": days_diff * 6,
            "1d": days_diff,
        }

        limit = min(timeframe_map.get(timeframe, days_diff * 24), 1000)

        # Get candlestick data
        candlestick_data = await self.market_service.get_candlestick_data(
            symbol, timeframe, limit
        )

        # Filter by date range
        filtered_data = [
            candle
            for candle in candlestick_data
            if start_date.timestamp() * 1000
            <= candle["time"]
            <= end_date.timestamp() * 1000
        ]

        return filtered_data

    async def _generate_signals(
        self, symbol: str, data: List[Dict], strategy_name: str
    ) -> List[Signal]:
        """Generate trading signals based on strategy."""
        signals = []

        for i in range(60, len(data)):  # Need 60 periods for indicators
            current_data = data[: i + 1]
            current_price = data[i]["close"]
            timestamp = datetime.fromtimestamp(data[i]["time"] / 1000)

            # Get technical indicators
            indicators = await self.market_service.get_technical_indicators(
                symbol, "1h"
            )

            signal = None

            if strategy_name == "ai_signals":
                signal = await self._generate_ai_signal(
                    symbol, current_data, indicators, timestamp, current_price
                )
            elif strategy_name == "technical_only":
                signal = self._generate_technical_signal(
                    symbol, current_data, indicators, timestamp, current_price
                )
            elif strategy_name == "combined":
                ai_signal = await self._generate_ai_signal(
                    symbol, current_data, indicators, timestamp, current_price
                )
                tech_signal = self._generate_technical_signal(
                    symbol, current_data, indicators, timestamp, current_price
                )
                signal = self._combine_signals(ai_signal, tech_signal)

            if signal:
                signals.append(signal)

        return signals

    async def _generate_ai_signal(
        self,
        symbol: str,
        data: List[Dict],
        indicators: Dict,
        timestamp: datetime,
        price: float,
    ) -> Optional[Signal]:
        """Generate AI-based trading signal."""
        try:
            # Initialize model if needed
            if crypto_model.model is None:
                crypto_model.build_model()

            # Get AI prediction
            prediction = await crypto_model.predict(data, indicators)

            # Convert prediction to signal
            signal_type = "HOLD"
            confidence = prediction["confidence"]
            score = 0.0
            reasoning = f"AI prediction: {prediction['prediction']} (confidence: {confidence:.2f})"

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
                reasoning=reasoning,
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
        """Generate technical analysis-based signal."""
        try:
            # RSI signals
            rsi = indicators.get("rsi", 50)
            rsi_signal = 0

            if rsi < 30:  # Oversold
                rsi_signal = 1
            elif rsi > 70:  # Overbought
                rsi_signal = -1

            # MACD signals
            macd_data = indicators.get("macd", {})
            macd_line = macd_data.get("macd", 0)
            signal_line = macd_data.get("signal", 0)
            macd_signal = 0

            if macd_line > signal_line and macd_line > 0:
                macd_signal = 1
            elif macd_line < signal_line and macd_line < 0:
                macd_signal = -1

            # Bollinger Bands signals
            bb = indicators.get("bb", {})
            bb_upper = bb.get("upper", price * 1.02)
            bb_lower = bb.get("lower", price * 0.98)
            bb_signal = 0

            if price <= bb_lower:  # Near lower band
                bb_signal = 1
            elif price >= bb_upper:  # Near upper band
                bb_signal = -1

            # Moving average signals
            sma_20 = indicators.get("sma_20", price)
            sma_50 = indicators.get("sma_50", price)
            ma_signal = 0

            if price > sma_20 > sma_50:  # Uptrend
                ma_signal = 1
            elif price < sma_20 < sma_50:  # Downtrend
                ma_signal = -1

            # Combine signals
            total_signal = rsi_signal + macd_signal + bb_signal + ma_signal
            confidence = abs(total_signal) / 4.0

            signal_type = "HOLD"
            score = 0.0

            if total_signal >= 2:
                signal_type = "BUY"
                score = confidence * 100
            elif total_signal <= -2:
                signal_type = "SELL"
                score = confidence * 100

            reasoning = f"Technical: RSI={rsi:.1f}, MACD={macd_signal}, BB={bb_signal}, MA={ma_signal}"

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
        # Weighted combination (70% AI, 30% technical)
        ai_weight = 0.7
        tech_weight = 0.3

        # Calculate combined score
        combined_score = ai_signal.score * ai_weight + tech_signal.score * tech_weight

        # Determine signal type
        signal_type = "HOLD"
        if combined_score > 50:
            signal_type = "BUY"
        elif combined_score < -50:
            signal_type = "SELL"

        # Calculate combined confidence
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

    def _execute_trades(
        self, signals: List[Signal], data: List[Dict], initial_capital: float
    ) -> List[Dict]:
        """Execute trades based on signals."""
        trades = []
        position = 0  # 0 = no position, 1 = long, -1 = short
        capital = initial_capital
        entry_price = 0

        for signal in signals:
            if signal.signal_type == "BUY" and position <= 0:
                # Close short position if exists
                if position == -1:
                    trade = self._close_position(
                        "SELL", signal.price, entry_price, capital, signal.timestamp
                    )
                    trades.append(trade)
                    capital = trade["capital_after"]

                # Open long position
                if signal.score > 60:  # Only trade high-confidence signals
                    position = 1
                    entry_price = signal.price

            elif signal.signal_type == "SELL" and position >= 0:
                # Close long position if exists
                if position == 1:
                    trade = self._close_position(
                        "SELL", signal.price, entry_price, capital, signal.timestamp
                    )
                    trades.append(trade)
                    capital = trade["capital_after"]

                # Open short position
                if signal.score > 60:  # Only trade high-confidence signals
                    position = -1
                    entry_price = signal.price

        # Close final position
        if position != 0:
            final_price = data[-1]["close"]
            trade = self._close_position(
                "SELL" if position == 1 else "BUY",
                final_price,
                entry_price,
                capital,
                datetime.fromtimestamp(data[-1]["time"] / 1000),
            )
            trades.append(trade)

        return trades

    def _close_position(
        self,
        action: str,
        exit_price: float,
        entry_price: float,
        capital: float,
        timestamp: datetime,
    ) -> Dict:
        """Close a trading position."""
        # Calculate position size
        position_size = capital / entry_price

        # Calculate gross return
        if action == "SELL":  # Closing long position
            gross_return = (exit_price - entry_price) / entry_price
        else:  # Closing short position
            gross_return = (entry_price - exit_price) / entry_price

        # Apply commission and slippage
        commission = position_size * self.commission_rate
        slippage = position_size * self.slippage_rate
        net_return = gross_return - (commission + slippage) / position_size

        # Calculate new capital
        new_capital = capital * (1 + net_return)

        return {
            "timestamp": timestamp,
            "action": action,
            "entry_price": entry_price,
            "exit_price": exit_price,
            "position_size": position_size,
            "gross_return": gross_return,
            "net_return": net_return,
            "commission": commission,
            "slippage": slippage,
            "capital_before": capital,
            "capital_after": new_capital,
            "pnl": new_capital - capital,
        }

    def _calculate_performance_metrics(
        self,
        trades: List[Dict],
        initial_capital: float,
        start_date: datetime,
        end_date: datetime,
    ) -> BacktestResult:
        """Calculate performance metrics from trades."""
        if not trades:
            return BacktestResult(
                total_return=0.0,
                sharpe_ratio=0.0,
                max_drawdown=0.0,
                win_rate=0.0,
                total_trades=0,
                avg_trade_return=0.0,
                volatility=0.0,
                start_date=start_date,
                end_date=end_date,
                initial_capital=initial_capital,
                final_capital=initial_capital,
                trades=trades,
            )

        # Calculate returns
        returns = [trade["net_return"] for trade in trades]
        final_capital = trades[-1]["capital_after"]
        total_return = (final_capital - initial_capital) / initial_capital

        # Calculate Sharpe ratio (assuming risk-free rate = 0)
        avg_return = np.mean(returns)
        volatility = np.std(returns)
        sharpe_ratio = avg_return / volatility if volatility > 0 else 0

        # Calculate max drawdown
        capital_curve = [initial_capital]
        for trade in trades:
            capital_curve.append(trade["capital_after"])

        peak = initial_capital
        max_drawdown = 0
        for capital in capital_curve:
            if capital > peak:
                peak = capital
            drawdown = (peak - capital) / peak
            max_drawdown = max(max_drawdown, drawdown)

        # Calculate win rate
        winning_trades = [r for r in returns if r > 0]
        win_rate = len(winning_trades) / len(returns) if returns else 0

        # Calculate average trade return
        avg_trade_return = np.mean(returns)

        return BacktestResult(
            total_return=total_return,
            sharpe_ratio=sharpe_ratio,
            max_drawdown=max_drawdown,
            win_rate=win_rate,
            total_trades=len(trades),
            avg_trade_return=avg_trade_return,
            volatility=volatility,
            start_date=start_date,
            end_date=end_date,
            initial_capital=initial_capital,
            final_capital=final_capital,
            trades=trades,
        )


# Global backtester instance
backtester = Backtester()
