"""FastAPI server for ML training and backtesting."""

import os
import json
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List, Literal
from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd

from core.data import (
    load_hf_dataset,
    feature_engineering,
    labeling,
    time_series_split
)
from core.model import MLModel
from core.train import (
    train_model,
    save_training_artifacts,
    load_model_with_metadata,
    list_models
)
from core.backtest import WalkForwardBacktest


app = FastAPI(title="ML Training & Backtesting Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Router for v1
api_v1_router = APIRouter(prefix="/api/v1")

# In-memory job registry
jobs: Dict[str, Dict[str, Any]] = {}


class TrainRequest(BaseModel):
    """Training request schema."""
    dataset: str
    symbols: List[str]
    timeframe: str
    task: Literal["classification", "regression"]
    target_horizon: int
    model: Literal["gbc", "rfc", "sgdc", "gbr", "sgdr"]
    train_window: str = "365d"
    valid_window: str = "60d"
    feature_config: Optional[Dict] = None
    model_config: Optional[Dict] = None


class BacktestRequest(BaseModel):
    """Backtest request schema."""
    model_id: Optional[str] = None
    dataset: Optional[str] = None
    symbols: List[str]
    timeframe: str
    train_window: str = "365d"
    test_window: str = "30d"
    fees_bps: float = 5.0
    slippage_bps: float = 5.0
    online: bool = False
    save_updates: bool = False
    buy_threshold: float = 0.6
    sell_threshold: float = 0.4


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "service": "ML Training & Backtesting",
        "status": "online",
        "version": "1.0.0",
        "api_version": "v1",
        "api_base_path": "/api/v1"
    }


@api_v1_router.post("/train/start")
async def start_training(request: TrainRequest):
    """
    Start model training job.

    Returns job_id for tracking progress.
    """
    job_id = str(uuid.uuid4())

    jobs[job_id] = {
        "job_id": job_id,
        "status": "running",
        "progress": 0,
        "created_at": datetime.utcnow().isoformat(),
        "type": "train",
        "request": request.dict()
    }

    try:
        # Load dataset
        hf_token = os.getenv("HF_TOKEN")
        df = load_hf_dataset(request.dataset, token=hf_token)

        jobs[job_id]["progress"] = 20

        # Filter by symbols if needed
        if "symbol" in df.columns:
            df = df[df["symbol"].isin(request.symbols)]

        # Feature engineering
        feature_config = request.feature_config or {}
        df = feature_engineering(df, feature_config)

        jobs[job_id]["progress"] = 40

        # Labeling
        df, target = labeling(df, request.target_horizon, request.task)
        df["target"] = target

        # Time series split
        train_ratio = 0.7
        valid_ratio = 0.15
        train_df, valid_df, _ = time_series_split(df, train_ratio, valid_ratio)

        jobs[job_id]["progress"] = 60

        # Create model
        model_config = request.model_config or {}
        model = MLModel(request.model, request.task, model_config)

        # Train
        trained_model, training_info = train_model(train_df, valid_df, model)

        jobs[job_id]["progress"] = 80

        # Save artifacts
        model_id = f"{request.model}_{request.task}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        dataset_info = {
            "dataset": request.dataset,
            "symbols": request.symbols,
            "timeframe": request.timeframe,
            "samples": len(df),
            "train_samples": len(train_df),
            "valid_samples": len(valid_df),
            "target_horizon": request.target_horizon
        }

        model_dir = save_training_artifacts(
            trained_model,
            training_info,
            model_id,
            dataset_info
        )

        jobs[job_id]["progress"] = 100
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["result"] = {
            "model_id": model_id,
            "model_dir": model_dir,
            "metrics": training_info["metrics"]
        }

    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "job_id": job_id,
        "status": jobs[job_id]["status"],
        "model_id": jobs[job_id].get("result", {}).get("model_id")
    }


@api_v1_router.get("/train/status")
async def get_training_status(job_id: str):
    """Get training job status and progress."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    return jobs[job_id]


@api_v1_router.post("/backtest/run")
async def run_backtest(request: BacktestRequest):
    """
    Run walk-forward backtest.

    Returns backtest results and artifact paths.
    """
    job_id = str(uuid.uuid4())

    jobs[job_id] = {
        "job_id": job_id,
        "status": "running",
        "progress": 0,
        "created_at": datetime.utcnow().isoformat(),
        "type": "backtest",
        "request": request.dict()
    }

    try:
        # Load or train model
        if request.model_id:
            # Use existing model
            if request.model_id == "latest":
                models_list = list_models()
                if not models_list:
                    raise ValueError("No trained models found")
                model_id = models_list[0]["model_id"]
            else:
                model_id = request.model_id

            model, metadata = load_model_with_metadata(model_id)
            dataset_id = metadata["dataset"]["dataset"]
        else:
            # Auto-train mode
            if not request.dataset:
                raise ValueError("Either model_id or dataset must be provided")

            dataset_id = request.dataset

            # Quick training
            hf_token = os.getenv("HF_TOKEN")
            df = load_hf_dataset(dataset_id, token=hf_token)

            if "symbol" in df.columns:
                df = df[df["symbol"].isin(request.symbols)]

            df = feature_engineering(df, {})
            df, target = labeling(df, 12, "classification")
            df["target"] = target

            train_df, valid_df, _ = time_series_split(df, 0.7, 0.15)

            model = MLModel("gbc", "classification", {})
            model, _ = train_model(train_df, valid_df, model)

        jobs[job_id]["progress"] = 30

        # Load backtest dataset
        hf_token = os.getenv("HF_TOKEN")
        df = load_hf_dataset(dataset_id, token=hf_token)

        if "symbol" in df.columns:
            df = df[df["symbol"].isin(request.symbols)]

        # Feature engineering
        df = feature_engineering(df, {})

        # Labeling
        df, target = labeling(df, 12, model.task)
        df["target"] = target

        jobs[job_id]["progress"] = 50

        # Parse window sizes
        train_window_days = int(request.train_window.replace("d", ""))
        test_window_days = int(request.test_window.replace("d", ""))

        # Run backtest
        backtest = WalkForwardBacktest(
            model=model,
            train_window_days=train_window_days,
            test_window_days=test_window_days,
            online_learning=request.online,
            fees_bps=request.fees_bps,
            slippage_bps=request.slippage_bps
        )

        results = backtest.run(
            df,
            buy_threshold=request.buy_threshold,
            sell_threshold=request.sell_threshold
        )

        jobs[job_id]["progress"] = 80

        # Save artifacts
        run_id = f"backtest_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        artifact_dir = backtest.save_artifacts(run_id)

        # Save report
        report = {
            "run_id": run_id,
            "created_at": datetime.utcnow().isoformat(),
            "config": request.dict(),
            "results": results
        }

        with open(os.path.join(artifact_dir, "report.json"), "w") as f:
            json.dump(report, f, indent=2)

        # Save updated model if online learning
        if request.online and request.save_updates and model.supports_partial_fit():
            updated_model_id = f"{request.model_id or 'auto'}_updated_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            model.save(os.path.join(os.path.dirname(__file__), "..", "models", updated_model_id))

        jobs[job_id]["progress"] = 100
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["result"] = {
            "run_id": run_id,
            "artifact_dir": artifact_dir,
            "results": results
        }

    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "job_id": job_id,
        "status": jobs[job_id]["status"],
        "run_id": jobs[job_id].get("result", {}).get("run_id"),
        "results": jobs[job_id].get("result", {}).get("results")
    }


@api_v1_router.get("/backtest/status")
async def get_backtest_status(job_id: str):
    """Get backtest job status and progress."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    return jobs[job_id]


@api_v1_router.get("/models")
async def get_models():
    """List all saved models with metadata."""
    try:
        models = list_models()
        return {"models": models, "count": len(models)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_v1_router.get("/models/{model_id}/metrics")
async def get_model_metrics(model_id: str):
    """Get detailed metrics for a specific model."""
    try:
        _, metadata = load_model_with_metadata(model_id)
        return metadata
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Model not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_v1_router.get("/artifacts")
async def list_artifacts():
    """List all saved backtest artifacts."""
    base_dir = os.path.join(os.path.dirname(__file__), "..", "artifacts")

    if not os.path.exists(base_dir):
        return {"artifacts": [], "count": 0}

    artifacts = []
    for run_id in os.listdir(base_dir):
        report_path = os.path.join(base_dir, run_id, "report.json")
        if os.path.exists(report_path):
            with open(report_path, "r") as f:
                report = json.load(f)
                artifacts.append({
                    "run_id": run_id,
                    "created_at": report.get("created_at"),
                    "summary": {
                        "total_return_pct": report.get("results", {}).get("total_return_pct"),
                        "sharpe_ratio": report.get("results", {}).get("sharpe_ratio"),
                        "win_rate": report.get("results", {}).get("win_rate")
                    }
                })

    artifacts.sort(key=lambda x: x.get("created_at", ""), reverse=True)

    return {"artifacts": artifacts, "count": len(artifacts)}


# Include API v1 router
app.include_router(api_v1_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8765)
