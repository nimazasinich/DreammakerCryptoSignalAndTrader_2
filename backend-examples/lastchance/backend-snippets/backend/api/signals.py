from datetime import datetime, timedelta
from typing import List, Optional

from api.deps import get_current_user
from db.database import get_db
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from ml.backtester import backtester
from models.user import User
from schemas.signals import (BacktestRequest, BacktestResponse, SignalResponse,
                             SignalSummaryResponse)
from services.signal_service import signal_service
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/signals", tags=["Trading Signals"])


@router.get("/{symbol}", response_model=List[SignalResponse])
async def get_signals(
    symbol: str,
    timeframe: str = Query("1h", description="Timeframe (1m, 5m, 15m, 1h, 4h, 1d)"),
    strategy: str = Query(
        "combined", description="Strategy (ai_signals, technical_only, combined)"
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get trading signals for a symbol."""
    try:
        signals = await signal_service.generate_signals(symbol, timeframe, strategy)
        return signals
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary/{symbol}", response_model=SignalSummaryResponse)
async def get_signal_summary(
    symbol: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get signal summary across all timeframes."""
    try:
        summary = await signal_service.get_signal_summary(symbol)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/backtest", response_model=BacktestResponse)
async def run_backtest(
    request: BacktestRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Run backtest for a trading strategy."""
    try:
        # Validate date range
        if request.end_date <= request.start_date:
            raise HTTPException(
                status_code=400, detail="End date must be after start date"
            )

        # Limit backtest duration to 1 year
        max_duration = timedelta(days=365)
        if request.end_date - request.start_date > max_duration:
            raise HTTPException(
                status_code=400, detail="Backtest duration cannot exceed 1 year"
            )

        # Run backtest
        result = await backtester.backtest_strategy(
            symbol=request.symbol,
            strategy_name=request.strategy,
            start_date=request.start_date,
            end_date=request.end_date,
            initial_capital=request.initial_capital,
            timeframe=request.timeframe,
        )

        return BacktestResponse(
            symbol=request.symbol,
            strategy=request.strategy,
            start_date=request.start_date,
            end_date=request.end_date,
            initial_capital=request.initial_capital,
            final_capital=result.final_capital,
            total_return=result.total_return,
            sharpe_ratio=result.sharpe_ratio,
            max_drawdown=result.max_drawdown,
            win_rate=result.win_rate,
            total_trades=result.total_trades,
            avg_trade_return=result.avg_trade_return,
            volatility=result.volatility,
            trades=result.trades,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/strategies")
async def get_available_strategies(current_user: User = Depends(get_current_user)):
    """Get available trading strategies."""
    return {
        "strategies": [
            {
                "id": "ai_signals",
                "name": "AI Signals Only",
                "description": "Trading signals based purely on AI predictions",
            },
            {
                "id": "technical_only",
                "name": "Technical Analysis Only",
                "description": "Trading signals based on technical indicators",
            },
            {
                "id": "combined",
                "name": "Combined AI + Technical",
                "description": "Hybrid approach combining AI predictions with technical analysis",
            },
        ],
        "timeframes": [
            {"id": "1m", "name": "1 Minute"},
            {"id": "5m", "name": "5 Minutes"},
            {"id": "15m", "name": "15 Minutes"},
            {"id": "1h", "name": "1 Hour"},
            {"id": "4h", "name": "4 Hours"},
            {"id": "1d", "name": "1 Day"},
        ],
    }
