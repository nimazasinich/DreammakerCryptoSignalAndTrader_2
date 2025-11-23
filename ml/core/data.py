"""Data loading, feature engineering, and labeling for ML pipeline."""

import os
from typing import Dict, List, Optional, Tuple, Literal
import pandas as pd
import numpy as np
from datasets import load_dataset
import ta


def load_hf_dataset(
    hf_id: str,
    split: str = "train",
    cache_dir: Optional[str] = None,
    token: Optional[str] = None
) -> pd.DataFrame:
    """
    Load model-ready OHLCV dataset from Hugging Face.

    Args:
        hf_id: Hugging Face dataset ID (e.g., "org/dataset-name")
        split: Dataset split to load (default: "train")
        cache_dir: Local cache directory for datasets
        token: HF token for private datasets

    Returns:
        DataFrame with columns: timestamp, open, high, low, close, volume
    """
    if cache_dir is None:
        cache_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "data", "cache")

    os.makedirs(cache_dir, exist_ok=True)

    dataset = load_dataset(
        hf_id,
        split=split,
        cache_dir=cache_dir,
        token=token
    )

    df = dataset.to_pandas()

    # Ensure timestamp is datetime
    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"])
    elif "date" in df.columns:
        df["timestamp"] = pd.to_datetime(df["date"])
        df = df.drop(columns=["date"])

    # Sort by timestamp
    df = df.sort_values("timestamp").reset_index(drop=True)

    # Ensure required columns exist
    required_cols = ["timestamp", "open", "high", "low", "close", "volume"]
    missing = [col for col in required_cols if col not in df.columns]
    if missing:
        raise ValueError(f"Dataset missing required columns: {missing}")

    return df


def feature_engineering(
    df: pd.DataFrame,
    config: Dict
) -> pd.DataFrame:
    """
    Apply technical indicators and feature engineering.

    Args:
        df: Input DataFrame with OHLCV data
        config: Feature configuration dict with keys:
            - ema_periods: list of EMA periods (default: [12, 26, 50, 200])
            - rsi_period: RSI period (default: 14)
            - macd_params: dict with fast, slow, signal (default: {12, 26, 9})
            - atr_period: ATR period (default: 14)
            - add_returns: whether to add return features (default: True)

    Returns:
        DataFrame with additional feature columns
    """
    df = df.copy()

    # EMA features
    ema_periods = config.get("ema_periods", [12, 26, 50, 200])
    for period in ema_periods:
        df[f"ema_{period}"] = ta.trend.ema_indicator(df["close"], window=period)

    # RSI
    rsi_period = config.get("rsi_period", 14)
    df["rsi"] = ta.momentum.rsi(df["close"], window=rsi_period)

    # MACD
    macd_params = config.get("macd_params", {"fast": 12, "slow": 26, "signal": 9})
    macd = ta.trend.MACD(
        df["close"],
        window_slow=macd_params["slow"],
        window_fast=macd_params["fast"],
        window_sign=macd_params["signal"]
    )
    df["macd"] = macd.macd()
    df["macd_signal"] = macd.macd_signal()
    df["macd_diff"] = macd.macd_diff()

    # ATR
    atr_period = config.get("atr_period", 14)
    df["atr"] = ta.volatility.average_true_range(df["high"], df["low"], df["close"], window=atr_period)

    # Bollinger Bands
    bb = ta.volatility.BollingerBands(df["close"], window=20, window_dev=2)
    df["bb_upper"] = bb.bollinger_hband()
    df["bb_middle"] = bb.bollinger_mavg()
    df["bb_lower"] = bb.bollinger_lband()
    df["bb_width"] = bb.bollinger_wband()

    # Volume features
    df["volume_ema"] = ta.trend.ema_indicator(df["volume"], window=20)
    df["volume_ratio"] = df["volume"] / (df["volume_ema"] + 1e-8)

    # Price returns
    if config.get("add_returns", True):
        df["return_1"] = df["close"].pct_change(1)
        df["return_3"] = df["close"].pct_change(3)
        df["return_6"] = df["close"].pct_change(6)
        df["return_12"] = df["close"].pct_change(12)
        df["return_24"] = df["close"].pct_change(24)

    # Price position relative to EMA
    for period in [12, 26, 50]:
        if f"ema_{period}" in df.columns:
            df[f"price_to_ema_{period}"] = (df["close"] - df[f"ema_{period}"]) / (df[f"ema_{period}"] + 1e-8)

    # Momentum
    df["momentum_12"] = df["close"] - df["close"].shift(12)

    # Drop rows with NaN values from indicators
    df = df.dropna().reset_index(drop=True)

    return df


def labeling(
    df: pd.DataFrame,
    target_horizon: int,
    task: Literal["classification", "regression"],
    thresholds: Optional[Dict[str, float]] = None
) -> Tuple[pd.DataFrame, pd.Series]:
    """
    Create target labels for supervised learning.

    Args:
        df: Feature DataFrame
        target_horizon: Number of periods ahead to predict
        task: "classification" or "regression"
        thresholds: For classification: {"buy": 0.01, "sell": -0.01}
                   (default: {"buy": 0.015, "sell": -0.01})

    Returns:
        Tuple of (features_df, target_series)
    """
    df = df.copy()

    # Calculate future return
    future_return = df["close"].pct_change(target_horizon).shift(-target_horizon)

    if task == "classification":
        if thresholds is None:
            thresholds = {"buy": 0.015, "sell": -0.01}

        # Create labels: BUY (2), HOLD (1), SELL (0)
        labels = pd.Series(1, index=df.index, name="target")  # default HOLD
        labels[future_return >= thresholds["buy"]] = 2  # BUY
        labels[future_return <= thresholds["sell"]] = 0  # SELL

        target = labels
    else:  # regression
        target = future_return.rename("target")

    # Remove rows without valid target
    valid_idx = target.notna()
    df = df[valid_idx].reset_index(drop=True)
    target = target[valid_idx].reset_index(drop=True)

    return df, target


def time_series_split(
    df: pd.DataFrame,
    train_ratio: float = 0.7,
    valid_ratio: float = 0.15
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Split time series data chronologically into train/valid/test.

    Args:
        df: Input DataFrame sorted by timestamp
        train_ratio: Fraction for training (default: 0.7)
        valid_ratio: Fraction for validation (default: 0.15)

    Returns:
        Tuple of (train_df, valid_df, test_df)
    """
    n = len(df)
    train_end = int(n * train_ratio)
    valid_end = int(n * (train_ratio + valid_ratio))

    train_df = df.iloc[:train_end].copy()
    valid_df = df.iloc[train_end:valid_end].copy()
    test_df = df.iloc[valid_end:].copy()

    return train_df, valid_df, test_df


def prepare_features_target(
    df: pd.DataFrame,
    target_col: str = "target"
) -> Tuple[pd.DataFrame, pd.Series]:
    """
    Separate features and target from prepared DataFrame.

    Args:
        df: DataFrame with features and target
        target_col: Name of target column

    Returns:
        Tuple of (X_features, y_target)
    """
    # Exclude non-feature columns
    exclude_cols = [target_col, "timestamp", "open", "high", "low", "close", "volume"]
    feature_cols = [col for col in df.columns if col not in exclude_cols]

    X = df[feature_cols].copy()
    y = df[target_col].copy()

    return X, y
