"""Model training pipeline with metrics and persistence."""

import os
import json
from datetime import datetime
from typing import Dict, Any, Tuple
import pandas as pd
import numpy as np
from sklearn.metrics import (
    accuracy_score, f1_score, precision_score, recall_score,
    roc_auc_score, mean_absolute_error, mean_squared_error, r2_score
)

from .model import MLModel
from .data import prepare_features_target


def calculate_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    task: str,
    y_proba: np.ndarray = None
) -> Dict[str, float]:
    """
    Calculate evaluation metrics.

    Args:
        y_true: True labels/values
        y_pred: Predicted labels/values
        task: "classification" or "regression"
        y_proba: Predicted probabilities (for classification)

    Returns:
        Dictionary of metrics
    """
    metrics = {}

    if task == "classification":
        metrics["accuracy"] = float(accuracy_score(y_true, y_pred))
        metrics["precision"] = float(precision_score(y_true, y_pred, average="weighted", zero_division=0))
        metrics["recall"] = float(recall_score(y_true, y_pred, average="weighted", zero_division=0))
        metrics["f1"] = float(f1_score(y_true, y_pred, average="weighted", zero_division=0))

        # AUC for binary or multi-class
        if y_proba is not None:
            try:
                if y_proba.shape[1] == 2:  # binary
                    metrics["auc"] = float(roc_auc_score(y_true, y_proba[:, 1]))
                else:  # multi-class
                    metrics["auc"] = float(roc_auc_score(y_true, y_proba, multi_class="ovr", average="weighted"))
            except Exception:
                pass

    else:  # regression
        metrics["mae"] = float(mean_absolute_error(y_true, y_pred))
        metrics["mse"] = float(mean_squared_error(y_true, y_pred))
        metrics["rmse"] = float(np.sqrt(metrics["mse"]))
        metrics["r2"] = float(r2_score(y_true, y_pred))

    return metrics


def train_model(
    train_df: pd.DataFrame,
    valid_df: pd.DataFrame,
    model: MLModel,
    target_col: str = "target"
) -> Tuple[MLModel, Dict[str, Any]]:
    """
    Train model and evaluate on validation set.

    Args:
        train_df: Training data with features and target
        valid_df: Validation data
        model: MLModel instance
        target_col: Name of target column

    Returns:
        Tuple of (trained_model, metrics_dict)
    """
    # Prepare train data
    X_train, y_train = prepare_features_target(train_df, target_col)

    # Prepare validation data
    X_valid, y_valid = prepare_features_target(valid_df, target_col)

    # Train
    model.fit(X_train, y_train)

    # Predict on validation
    y_pred = model.predict(X_valid)
    y_proba = model.predict_proba(X_valid) if model.task == "classification" else None

    # Calculate metrics
    metrics = calculate_metrics(y_valid, y_pred, model.task, y_proba)

    # Add training info
    training_info = {
        "train_samples": len(train_df),
        "valid_samples": len(valid_df),
        "n_features": len(X_train.columns),
        "feature_names": list(X_train.columns),
        "metrics": metrics
    }

    return model, training_info


def save_training_artifacts(
    model: MLModel,
    training_info: Dict[str, Any],
    model_id: str,
    dataset_info: Dict[str, Any],
    base_dir: str = None
) -> str:
    """
    Save trained model and metadata.

    Args:
        model: Trained MLModel instance
        training_info: Training metrics and info
        model_id: Unique model identifier
        dataset_info: Dataset metadata
        base_dir: Base directory for models (default: ../models)

    Returns:
        Path to saved model directory
    """
    if base_dir is None:
        base_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "models")

    model_dir = os.path.join(base_dir, model_id)
    os.makedirs(model_dir, exist_ok=True)

    # Save model
    model.save(model_dir)

    # Prepare metadata
    metadata = {
        "model_id": model_id,
        "model_type": model.model_type,
        "task": model.task,
        "created_at": datetime.utcnow().isoformat(),
        "dataset": dataset_info,
        "training": training_info,
        "feature_importance": model.get_feature_importance()
    }

    # Save metadata
    with open(os.path.join(model_dir, "metrics.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    return model_dir


def load_model_with_metadata(model_id: str, base_dir: str = None) -> Tuple[MLModel, Dict[str, Any]]:
    """
    Load model and its metadata.

    Args:
        model_id: Model identifier
        base_dir: Base directory for models

    Returns:
        Tuple of (model, metadata)
    """
    if base_dir is None:
        base_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "models")

    model_dir = os.path.join(base_dir, model_id)

    # Load model
    model = MLModel.load(model_dir)

    # Load metadata
    with open(os.path.join(model_dir, "metrics.json"), "r") as f:
        metadata = json.load(f)

    return model, metadata


def list_models(base_dir: str = None) -> list:
    """
    List all saved models with their metadata.

    Args:
        base_dir: Base directory for models

    Returns:
        List of model metadata dictionaries
    """
    if base_dir is None:
        base_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "models")

    if not os.path.exists(base_dir):
        return []

    models = []
    for model_id in os.listdir(base_dir):
        metrics_path = os.path.join(base_dir, model_id, "metrics.json")
        if os.path.exists(metrics_path):
            with open(metrics_path, "r") as f:
                metadata = json.load(f)
                models.append(metadata)

    # Sort by creation date (newest first)
    models.sort(key=lambda x: x.get("created_at", ""), reverse=True)

    return models
