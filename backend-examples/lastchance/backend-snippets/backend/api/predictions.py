from typing import List

from api.deps import get_current_admin_user, get_current_user
from db.database import get_db
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
try:
    from ml.model import crypto_model
except ImportError:
    crypto_model = None
try:
    from ml.trainer import model_trainer
except ImportError:
    model_trainer = None
from models.user import User
from schemas.predictions import (PredictionResponse, TrainingRequest,
                                 TrainingStatus)
from services.market_service import MarketService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/predictions", tags=["AI Predictions"])

market_service = MarketService()


@router.get("/{symbol}", response_model=PredictionResponse)
async def get_prediction(
    symbol: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get AI prediction for a symbol."""
    try:
        # Initialize model if needed
        if crypto_model.model is None:
            crypto_model.build_model()

        # Get market data
        candlestick_data = await market_service.get_candlestick_data(symbol, "1h", 100)
        indicators = await market_service.get_technical_indicators(symbol, "1h")

        if not candlestick_data:
            raise HTTPException(status_code=404, detail="No market data available")

        # Make prediction
        prediction = await crypto_model.predict(candlestick_data, indicators)
        prediction["symbol"] = symbol

        return prediction

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/train", response_model=dict)
async def start_training(
    request: TrainingRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Start model training (admin only)."""
    if model_trainer.is_training:
        raise HTTPException(status_code=400, detail="Training already in progress")

    # Start training in background
    background_tasks.add_task(
        model_trainer.train_model, db, request.epochs, request.symbols
    )

    return {"message": "Training started", "epochs": request.epochs}


@router.post("/train/stop", response_model=dict)
async def stop_training(current_user: User = Depends(get_current_admin_user)):
    """Stop model training (admin only)."""
    model_trainer.stop_training()
    return {"message": "Training stop requested"}


@router.get("/train/status", response_model=TrainingStatus)
async def get_training_status(current_user: User = Depends(get_current_user)):
    """Get training status."""
    status = model_trainer.get_training_status()
    return status
