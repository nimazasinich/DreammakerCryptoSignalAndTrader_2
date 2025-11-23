import logging
import os
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

from config import settings

logger = logging.getLogger(__name__)


class CryptoLSTMModel:
    """LSTM model for cryptocurrency price prediction."""

    def __init__(self, model_version: str = "1.0.0"):
        self.model_version = model_version
        self.model: Optional[keras.Model] = None
        self.feature_scaler = None
        self.target_scaler = None
        self.sequence_length = 60  # Use 60 time steps for prediction
        self.n_features = 10  # Number of input features

        # Create model directory if it doesn't exist
        os.makedirs(settings.MODEL_PATH, exist_ok=True)

    def build_model(self) -> keras.Model:
        """Build LSTM model architecture."""
        model = keras.Sequential(
            [
                # First LSTM layer with return sequences
                layers.LSTM(
                    128,
                    return_sequences=True,
                    input_shape=(self.sequence_length, self.n_features),
                    dropout=0.2,
                    recurrent_dropout=0.2,
                ),
                layers.BatchNormalization(),
                # Second LSTM layer
                layers.LSTM(
                    64, return_sequences=True, dropout=0.2, recurrent_dropout=0.2
                ),
                layers.BatchNormalization(),
                # Third LSTM layer
                layers.LSTM(32, return_sequences=False, dropout=0.2),
                layers.BatchNormalization(),
                # Dense layers
                layers.Dense(
                    64,
                    activation="relu",
                    kernel_regularizer=keras.regularizers.l2(0.01),
                ),
                layers.Dropout(0.3),
                layers.Dense(
                    32,
                    activation="relu",
                    kernel_regularizer=keras.regularizers.l2(0.01),
                ),
                layers.Dropout(0.2),
                # Output layer - 3 classes (bullish, bearish, neutral)
                layers.Dense(3, activation="softmax"),
            ]
        )

        # Compile model
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss="categorical_crossentropy",
            metrics=["accuracy", "AUC"],
        )

        self.model = model
        logger.info(
            f"Model built successfully. Total parameters: {model.count_params()}"
        )
        return model

    def prepare_features(
        self, candlestick_data: List[Dict], technical_indicators: Dict
    ) -> np.ndarray:
        """
        Prepare features from candlestick data and technical indicators.

        Returns:
            numpy array of shape (sequence_length, n_features)
        """
        if len(candlestick_data) < self.sequence_length:
            # Pad with zeros if not enough data
            features = np.zeros((self.sequence_length, self.n_features))
            return features

        # Take last sequence_length candles
        recent_candles = candlestick_data[-self.sequence_length :]

        features = []
        for candle in recent_candles:
            # Normalize price features
            close = candle["close"]
            open_price = candle["open"]
            high = candle["high"]
            low = candle["low"]
            volume = candle["volume"]

            # Calculate price change
            price_change = (close - open_price) / open_price if open_price > 0 else 0

            # Calculate high-low range
            hl_range = (high - low) / close if close > 0 else 0

            # Calculate close position in range
            close_position = (close - low) / (high - low) if (high - low) > 0 else 0.5

            # Normalize volume (log scale)
            log_volume = np.log1p(volume)

            # Technical indicators (normalized)
            rsi = technical_indicators.get("rsi", 50) / 100
            macd = np.tanh(technical_indicators.get("macd", {}).get("macd", 0) / 1000)

            # Bollinger Band position
            bb_upper = technical_indicators.get("bb", {}).get("upper", close * 1.02)
            bb_lower = technical_indicators.get("bb", {}).get("lower", close * 0.98)
            bb_position = (
                (close - bb_lower) / (bb_upper - bb_lower)
                if (bb_upper - bb_lower) > 0
                else 0.5
            )

            # SMA ratios
            sma_20 = technical_indicators.get("sma_20", close)
            sma_50 = technical_indicators.get("sma_50", close)
            sma_20_ratio = (close / sma_20 - 1) if sma_20 > 0 else 0
            sma_50_ratio = (close / sma_50 - 1) if sma_50 > 0 else 0

            # Combine features
            feature_vector = [
                price_change,
                hl_range,
                close_position,
                log_volume / 20,  # Normalize volume
                rsi,
                macd,
                bb_position,
                sma_20_ratio,
                sma_50_ratio,
                close / 100000,  # Normalized price
            ]

            features.append(feature_vector)

        return np.array(features)

    async def predict(
        self, candlestick_data: List[Dict], technical_indicators: Dict
    ) -> Dict:
        """
        Make prediction for given data.

        Returns:
            Dictionary with prediction results
        """
        if self.model is None:
            raise ValueError("Model not initialized. Call build_model() first.")

        # Prepare features
        features = self.prepare_features(candlestick_data, technical_indicators)
        features = np.expand_dims(features, axis=0)  # Add batch dimension

        # Make prediction
        prediction = self.model.predict(features, verbose=0)[0]

        bullish_prob = float(prediction[0])
        bearish_prob = float(prediction[1])
        neutral_prob = float(prediction[2])

        # Determine prediction class
        max_prob = max(bullish_prob, bearish_prob, neutral_prob)
        if max_prob == bullish_prob:
            prediction_class = "BULL"
        elif max_prob == bearish_prob:
            prediction_class = "BEAR"
        else:
            prediction_class = "NEUTRAL"

        # Calculate risk score
        risk_score = 1 - max_prob  # Higher risk when confidence is low

        return {
            "bullish_probability": bullish_prob,
            "bearish_probability": bearish_prob,
            "neutral_probability": neutral_prob,
            "confidence": max_prob,
            "prediction": prediction_class,
            "risk_score": risk_score,
            "model_version": self.model_version,
        }

    def train_step(self, X_batch: np.ndarray, y_batch: np.ndarray) -> Dict:
        """
        Perform single training step.

        Returns:
            Dictionary with training metrics
        """
        if self.model is None:
            raise ValueError("Model not initialized. Call build_model() first.")

        history = self.model.fit(
            X_batch, y_batch, epochs=1, batch_size=32, verbose=0, validation_split=0.2
        )

        return {
            "loss": float(history.history["loss"][0]),
            "accuracy": float(history.history["accuracy"][0]),
            "val_loss": float(history.history.get("val_loss", [0])[0]),
            "val_accuracy": float(history.history.get("val_accuracy", [0])[0]),
        }

    def save_model(self, path: Optional[str] = None) -> str:
        """Save model to disk."""
        if self.model is None:
            raise ValueError("No model to save")

        if path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            path = os.path.join(
                settings.MODEL_PATH, f"crypto_lstm_{self.model_version}_{timestamp}.h5"
            )

        self.model.save(path)
        logger.info(f"Model saved to {path}")
        return path

    def load_model(self, path: str):
        """Load model from disk."""
        self.model = keras.models.load_model(path)
        logger.info(f"Model loaded from {path}")

    def get_model_summary(self) -> str:
        """Get model architecture summary."""
        if self.model is None:
            return "Model not initialized"

        summary_list = []
        self.model.summary(print_fn=lambda x: summary_list.append(x))
        return "\n".join(summary_list)


# Global model instance
crypto_model = CryptoLSTMModel(model_version=settings.MODEL_VERSION)
