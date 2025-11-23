from datetime import datetime, timedelta
from typing import List, Optional

from db.database import get_db
from db.redis_client import redis_client
from fastapi import APIRouter, Depends, HTTPException, Query
from schemas.market import (CandlestickResponse, MarketDataResponse,
                            TechnicalIndicatorsResponse)
from services.market_service import MarketService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/market", tags=["Market Data"])

market_service = MarketService()


@router.get("/prices", response_model=List[MarketDataResponse])
async def get_market_prices(
    symbols: Optional[str] = Query(None, description="Comma-separated list of symbols"),
    db: AsyncSession = Depends(get_db),
):
    """Get current market prices for cryptocurrencies."""
    # Try to get from cache first (if Redis is available)
    try:
        cache_key = f"market:prices:{symbols or 'all'}"
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            return cached_data
    except Exception:
        pass  # Redis not available, continue without cache

    # Fetch from service
    symbol_list = symbols.split(",") if symbols else None
    market_data = await market_service.get_market_data(symbol_list)

    # Cache for 5 seconds (if Redis is available)
    try:
        await redis_client.set(cache_key, market_data, expire=5)
    except Exception:
        pass  # Redis not available, continue without cache

    return market_data


@router.get("/candlestick/{symbol}", response_model=List[CandlestickResponse])
async def get_candlestick_data(
    symbol: str,
    interval: str = Query("1h", description="Time interval (1m, 5m, 15m, 1h, 4h, 1d)"),
    limit: int = Query(100, ge=1, le=1000, description="Number of candles"),
    db: AsyncSession = Depends(get_db),
):
    """Get candlestick data for a symbol."""
    # Try cache first (if Redis is available)
    try:
        cache_key = f"market:candlestick:{symbol}:{interval}:{limit}"
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            return cached_data
    except Exception:
        pass  # Redis not available, continue without cache

    # Fetch from service
    candlestick_data = await market_service.get_candlestick_data(
        symbol, interval, limit
    )

    # Cache for 30 seconds (if Redis is available)
    try:
        await redis_client.set(cache_key, candlestick_data, expire=30)
    except Exception:
        pass  # Redis not available, continue without cache

    return candlestick_data


@router.get("/indicators/{symbol}", response_model=TechnicalIndicatorsResponse)
async def get_technical_indicators(
    symbol: str,
    interval: str = Query("1h", description="Time interval"),
    db: AsyncSession = Depends(get_db),
):
    """Get technical indicators for a symbol."""
    # Try cache first (if Redis is available)
    try:
        cache_key = f"market:indicators:{symbol}:{interval}"
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            return cached_data
    except Exception:
        pass  # Redis not available, continue without cache

    # Fetch from service
    indicators = await market_service.get_technical_indicators(symbol, interval)

    # Cache for 30 seconds (if Redis is available)
    try:
        await redis_client.set(cache_key, indicators, expire=30)
    except Exception:
        pass  # Redis not available, continue without cache

    return indicators


@router.get("/{symbol}/history", response_model=List[CandlestickResponse])
async def get_market_history(
    symbol: str,
    period: str = Query("1h", description="Time period (1m, 5m, 15m, 1h, 4h, 1d)"),
    limit: int = Query(100, ge=1, le=1000, description="Number of data points"),
    db: AsyncSession = Depends(get_db),
):
    """Get historical market data for a symbol."""
    # Try cache first (if Redis is available)
    try:
        cache_key = f"market:history:{symbol}:{period}:{limit}"
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            return cached_data
    except Exception:
        pass  # Redis not available, continue without cache

    # Fetch from service
    history_data = await market_service.get_candlestick_data(symbol, period, limit)

    # Cache for 30 seconds (if Redis is available)
    try:
        await redis_client.set(cache_key, history_data, expire=30)
    except Exception:
        pass  # Redis not available, continue without cache

    return history_data