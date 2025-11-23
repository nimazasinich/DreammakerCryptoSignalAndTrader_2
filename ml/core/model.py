"""ML model building, training, and persistence."""

import os
from typing import Dict, Any, Optional, Literal
import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier, GradientBoostingRegressor
from sklearn.linear_model import SGDClassifier, SGDRegressor
from sklearn.preprocessing import StandardScaler


class MLModel:
    """Wrapper for sklearn models with support for online learning."""

    def __init__(
        self,
        model_type: Literal["gbc", "rfc", "sgdc", "gbr", "sgdr"],
        task: Literal["classification", "regression"],
        config: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize ML model.

        Args:
            model_type: Model type code
                - gbc: GradientBoostingClassifier
                - rfc: RandomForestClassifier
                - sgdc: SGDClassifier (supports partial_fit)
                - gbr: GradientBoostingRegressor
                - sgdr: SGDRegressor (supports partial_fit)
            task: "classification" or "regression"
            config: Model hyperparameters
        """
        self.model_type = model_type
        self.task = task
        self.config = config or {}
        self.scaler = StandardScaler()
        self.model = self._build_model()
        self.feature_names = None
        self.is_fitted = False

    def _build_model(self):
        """Build sklearn model based on type."""
        if self.model_type == "gbc":
            return GradientBoostingClassifier(
                n_estimators=self.config.get("n_estimators", 100),
                learning_rate=self.config.get("learning_rate", 0.1),
                max_depth=self.config.get("max_depth", 5),
                random_state=self.config.get("random_state", 42)
            )
        elif self.model_type == "rfc":
            return RandomForestClassifier(
                n_estimators=self.config.get("n_estimators", 100),
                max_depth=self.config.get("max_depth", 10),
                random_state=self.config.get("random_state", 42),
                n_jobs=self.config.get("n_jobs", -1)
            )
        elif self.model_type == "sgdc":
            return SGDClassifier(
                loss=self.config.get("loss", "log_loss"),
                max_iter=self.config.get("max_iter", 1000),
                random_state=self.config.get("random_state", 42)
            )
        elif self.model_type == "gbr":
            return GradientBoostingRegressor(
                n_estimators=self.config.get("n_estimators", 100),
                learning_rate=self.config.get("learning_rate", 0.1),
                max_depth=self.config.get("max_depth", 5),
                random_state=self.config.get("random_state", 42)
            )
        elif self.model_type == "sgdr":
            return SGDRegressor(
                max_iter=self.config.get("max_iter", 1000),
                random_state=self.config.get("random_state", 42)
            )
        else:
            raise ValueError(f"Unknown model type: {self.model_type}")

    def fit(self, X, y):
        """
        Train model on data.

        Args:
            X: Feature matrix (DataFrame or ndarray)
            y: Target vector
        """
        if hasattr(X, "columns"):
            self.feature_names = list(X.columns)
            X = X.values

        # Fit scaler and transform
        X_scaled = self.scaler.fit_transform(X)

        # Fit model
        self.model.fit(X_scaled, y)
        self.is_fitted = True

    def partial_fit(self, X, y, classes=None):
        """
        Incrementally train model (only for SGD models).

        Args:
            X: Feature matrix
            y: Target vector
            classes: Class labels (required for first call on classifier)
        """
        if self.model_type not in ["sgdc", "sgdr"]:
            raise ValueError(f"Model type {self.model_type} does not support partial_fit")

        if hasattr(X, "columns"):
            if self.feature_names is None:
                self.feature_names = list(X.columns)
            X = X.values

        # Transform with existing scaler or fit new one
        if not self.is_fitted:
            X_scaled = self.scaler.fit_transform(X)
        else:
            X_scaled = self.scaler.transform(X)

        # Partial fit
        if self.task == "classification" and not self.is_fitted:
            if classes is None:
                classes = np.unique(y)
            self.model.partial_fit(X_scaled, y, classes=classes)
        else:
            self.model.partial_fit(X_scaled, y)

        self.is_fitted = True

    def predict(self, X):
        """
        Predict labels or values.

        Args:
            X: Feature matrix

        Returns:
            Predictions
        """
        if not self.is_fitted:
            raise ValueError("Model not fitted yet")

        if hasattr(X, "values"):
            X = X.values

        X_scaled = self.scaler.transform(X)
        return self.model.predict(X_scaled)

    def predict_proba(self, X):
        """
        Predict class probabilities (classification only).

        Args:
            X: Feature matrix

        Returns:
            Probability matrix
        """
        if self.task != "classification":
            raise ValueError("predict_proba only available for classification")

        if not self.is_fitted:
            raise ValueError("Model not fitted yet")

        if hasattr(X, "values"):
            X = X.values

        X_scaled = self.scaler.transform(X)
        return self.model.predict_proba(X_scaled)

    def supports_partial_fit(self) -> bool:
        """Check if model supports online learning."""
        return self.model_type in ["sgdc", "sgdr"]

    def get_feature_importance(self) -> Optional[Dict[str, float]]:
        """Get feature importances if available."""
        if not self.is_fitted:
            return None

        if hasattr(self.model, "feature_importances_"):
            importances = self.model.feature_importances_
            if self.feature_names:
                return dict(zip(self.feature_names, importances.tolist()))
            else:
                return {f"feature_{i}": imp for i, imp in enumerate(importances)}

        return None

    def save(self, path: str):
        """
        Save model to disk.

        Args:
            path: Directory path to save model
        """
        os.makedirs(path, exist_ok=True)

        model_data = {
            "model": self.model,
            "scaler": self.scaler,
            "model_type": self.model_type,
            "task": self.task,
            "config": self.config,
            "feature_names": self.feature_names,
            "is_fitted": self.is_fitted
        }

        joblib.dump(model_data, os.path.join(path, "model.joblib"))

    @classmethod
    def load(cls, path: str) -> "MLModel":
        """
        Load model from disk.

        Args:
            path: Directory path containing model

        Returns:
            Loaded MLModel instance
        """
        model_data = joblib.load(os.path.join(path, "model.joblib"))

        instance = cls.__new__(cls)
        instance.model = model_data["model"]
        instance.scaler = model_data["scaler"]
        instance.model_type = model_data["model_type"]
        instance.task = model_data["task"]
        instance.config = model_data["config"]
        instance.feature_names = model_data["feature_names"]
        instance.is_fitted = model_data["is_fitted"]

        return instance
