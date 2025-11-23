"""Walk-forward backtesting engine with online learning support."""

import os
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import pandas as pd
import numpy as np

from .model import MLModel
from .data import prepare_features_target
from .train import calculate_metrics


class WalkForwardBacktest:
    """Walk-forward optimization with optional online learning."""

    def __init__(
        self,
        model: MLModel,
        train_window_days: int,
        test_window_days: int,
        online_learning: bool = False,
        fees_bps: float = 5.0,
        slippage_bps: float = 5.0
    ):
        """
        Initialize backtest engine.

        Args:
            model: MLModel instance to use
            train_window_days: Training window size in days
            test_window_days: Testing window size in days
            online_learning: Whether to update model during backtest
            fees_bps: Trading fees in basis points
            slippage_bps: Slippage in basis points
        """
        self.model = model
        self.train_window = timedelta(days=train_window_days)
        self.test_window = timedelta(days=test_window_days)
        self.online_learning = online_learning
        self.fees_bps = fees_bps
        self.slippage_bps = slippage_bps
        self.total_cost_bps = fees_bps + slippage_bps

        self.folds: List[Dict] = []
        self.trades: List[Dict] = []
        self.equity_curve: pd.DataFrame = None

    def run(
        self,
        df: pd.DataFrame,
        buy_threshold: float = 0.6,
        sell_threshold: float = 0.4,
        initial_capital: float = 10000.0
    ) -> Dict[str, Any]:
        """
        Execute walk-forward backtest.

        Args:
            df: Full dataset with features and target
            buy_threshold: Probability threshold for BUY signal (classification)
            sell_threshold: Probability threshold for SELL signal (classification)
            initial_capital: Starting capital

        Returns:
            Backtest results dictionary
        """
        df = df.sort_values("timestamp").reset_index(drop=True)

        # Determine fold boundaries
        start_date = df["timestamp"].min()
        end_date = df["timestamp"].max()

        current_date = start_date + self.train_window
        fold_num = 0

        capital = initial_capital
        position = 0  # 0 = no position, 1 = long
        entry_price = 0.0
        equity_records = []

        while current_date + self.test_window <= end_date:
            fold_num += 1

            # Define train and test periods
            train_start = current_date - self.train_window
            train_end = current_date
            test_start = current_date
            test_end = current_date + self.test_window

            # Split data
            train_data = df[(df["timestamp"] >= train_start) & (df["timestamp"] < train_end)].copy()
            test_data = df[(df["timestamp"] >= test_start) & (df["timestamp"] < test_end)].copy()

            if len(train_data) < 100 or len(test_data) < 10:
                current_date = test_end
                continue

            # Train or update model
            X_train, y_train = prepare_features_target(train_data, "target")

            if fold_num == 1 or not self.online_learning:
                # Initial training or no online learning
                self.model.fit(X_train, y_train)
            elif self.model.supports_partial_fit():
                # Online update
                classes = np.unique(y_train) if self.model.task == "classification" else None
                self.model.partial_fit(X_train, y_train, classes=classes)

            # Predict on test set
            X_test, y_test = prepare_features_target(test_data, "target")
            y_pred = self.model.predict(X_test)

            # Generate signals
            if self.model.task == "classification":
                y_proba = self.model.predict_proba(X_test)
                # Assuming class 2 = BUY, class 0 = SELL, class 1 = HOLD
                signals = self._generate_signals_classification(y_proba, buy_threshold, sell_threshold)
            else:
                signals = self._generate_signals_regression(y_pred)

            # Simulate trading
            fold_trades, fold_equity = self._simulate_trading(
                test_data.reset_index(drop=True),
                signals,
                capital,
                position,
                entry_price
            )

            # Update capital and position from last trade
            if len(fold_equity) > 0:
                capital = fold_equity[-1]["capital"]
                position = fold_equity[-1]["position"]
                entry_price = fold_equity[-1]["entry_price"]
                equity_records.extend(fold_equity)

            self.trades.extend(fold_trades)

            # Calculate fold metrics
            fold_metrics = calculate_metrics(y_test, y_pred, self.model.task)
            fold_pnl = capital - initial_capital if fold_num == 1 else (
                fold_equity[-1]["capital"] - fold_equity[0]["capital"] if fold_equity else 0
            )

            fold_info = {
                "fold": fold_num,
                "train_start": train_start.isoformat(),
                "train_end": train_end.isoformat(),
                "test_start": test_start.isoformat(),
                "test_end": test_end.isoformat(),
                "train_samples": len(train_data),
                "test_samples": len(test_data),
                "metrics": fold_metrics,
                "trades": len(fold_trades),
                "pnl": float(fold_pnl)
            }

            self.folds.append(fold_info)

            # Move to next fold
            current_date = test_end

        # Build equity curve
        if equity_records:
            self.equity_curve = pd.DataFrame(equity_records)

        # Calculate overall metrics
        results = self._calculate_overall_metrics(initial_capital, capital)

        return results

    def _generate_signals_classification(
        self,
        y_proba: np.ndarray,
        buy_threshold: float,
        sell_threshold: float
    ) -> pd.Series:
        """Generate trading signals from classification probabilities."""
        signals = pd.Series(0, index=range(len(y_proba)))  # 0 = no action

        if y_proba.shape[1] == 3:  # BUY, HOLD, SELL
            # Class 2 = BUY, Class 0 = SELL
            signals[y_proba[:, 2] >= buy_threshold] = 1  # BUY
            signals[y_proba[:, 0] >= (1 - sell_threshold)] = -1  # SELL
        else:  # Binary
            signals[y_proba[:, 1] >= buy_threshold] = 1
            signals[y_proba[:, 1] <= sell_threshold] = -1

        return signals

    def _generate_signals_regression(self, y_pred: np.ndarray) -> pd.Series:
        """Generate trading signals from regression predictions."""
        signals = pd.Series(0, index=range(len(y_pred)))

        # Buy if predicted return > 1%, sell if < -0.5%
        signals[y_pred >= 0.01] = 1
        signals[y_pred <= -0.005] = -1

        return signals

    def _simulate_trading(
        self,
        test_data: pd.DataFrame,
        signals: pd.Series,
        initial_capital: float,
        initial_position: int,
        initial_entry_price: float
    ) -> Tuple[List[Dict], List[Dict]]:
        """Simulate trading based on signals."""
        trades = []
        equity = []

        capital = initial_capital
        position = initial_position
        entry_price = initial_entry_price

        for i, row in test_data.iterrows():
            signal = signals.iloc[i]
            price = row["close"]
            timestamp = row["timestamp"]

            # Execute trades
            if signal == 1 and position == 0:  # BUY
                cost_factor = 1 + (self.total_cost_bps / 10000)
                entry_price = price * cost_factor
                position = 1

                trades.append({
                    "timestamp": timestamp.isoformat() if hasattr(timestamp, "isoformat") else str(timestamp),
                    "action": "BUY",
                    "price": float(price),
                    "cost": float(entry_price),
                    "capital": float(capital)
                })

            elif signal == -1 and position == 1:  # SELL
                exit_factor = 1 - (self.total_cost_bps / 10000)
                exit_price = price * exit_factor
                pnl = capital * ((exit_price - entry_price) / entry_price)
                capital += pnl
                position = 0

                trades.append({
                    "timestamp": timestamp.isoformat() if hasattr(timestamp, "isoformat") else str(timestamp),
                    "action": "SELL",
                    "price": float(price),
                    "exit_price": float(exit_price),
                    "pnl": float(pnl),
                    "capital": float(capital)
                })

            # Record equity
            current_value = capital
            if position == 1:
                unrealized_pnl = capital * ((price - entry_price) / entry_price)
                current_value = capital + unrealized_pnl

            equity.append({
                "timestamp": timestamp.isoformat() if hasattr(timestamp, "isoformat") else str(timestamp),
                "capital": float(capital),
                "position": int(position),
                "entry_price": float(entry_price) if position == 1 else 0.0,
                "current_price": float(price),
                "equity": float(current_value)
            })

        return trades, equity

    def _calculate_overall_metrics(self, initial_capital: float, final_capital: float) -> Dict[str, Any]:
        """Calculate overall backtest metrics."""
        total_return = (final_capital - initial_capital) / initial_capital
        total_trades = len([t for t in self.trades if t["action"] == "SELL"])

        winning_trades = [t for t in self.trades if t["action"] == "SELL" and t["pnl"] > 0]
        losing_trades = [t for t in self.trades if t["action"] == "SELL" and t["pnl"] < 0]

        win_rate = len(winning_trades) / total_trades if total_trades > 0 else 0

        # Calculate Sharpe ratio
        if self.equity_curve is not None and len(self.equity_curve) > 1:
            returns = self.equity_curve["equity"].pct_change().dropna()
            sharpe = (returns.mean() / returns.std()) * np.sqrt(252) if returns.std() > 0 else 0

            # Max drawdown
            equity_values = self.equity_curve["equity"].values
            running_max = np.maximum.accumulate(equity_values)
            drawdown = (equity_values - running_max) / running_max
            max_drawdown = float(drawdown.min())
        else:
            sharpe = 0
            max_drawdown = 0

        return {
            "initial_capital": float(initial_capital),
            "final_capital": float(final_capital),
            "total_return": float(total_return),
            "total_return_pct": float(total_return * 100),
            "total_trades": int(total_trades),
            "winning_trades": len(winning_trades),
            "losing_trades": len(losing_trades),
            "win_rate": float(win_rate),
            "sharpe_ratio": float(sharpe),
            "max_drawdown": float(max_drawdown),
            "max_drawdown_pct": float(max_drawdown * 100),
            "folds": self.folds
        }

    def save_artifacts(self, run_id: str, base_dir: str = None) -> str:
        """
        Save backtest artifacts.

        Args:
            run_id: Unique run identifier
            base_dir: Base directory for artifacts

        Returns:
            Path to artifacts directory
        """
        if base_dir is None:
            base_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "artifacts")

        artifact_dir = os.path.join(base_dir, run_id)
        os.makedirs(artifact_dir, exist_ok=True)

        # Save equity curve
        if self.equity_curve is not None:
            self.equity_curve.to_csv(os.path.join(artifact_dir, "equity_curve.csv"), index=False)

        # Save trades
        if self.trades:
            pd.DataFrame(self.trades).to_csv(os.path.join(artifact_dir, "trades.csv"), index=False)

        # Save feature importance
        feature_importance = self.model.get_feature_importance()
        if feature_importance:
            with open(os.path.join(artifact_dir, "feature_importance.json"), "w") as f:
                json.dump(feature_importance, f, indent=2)

        return artifact_dir
