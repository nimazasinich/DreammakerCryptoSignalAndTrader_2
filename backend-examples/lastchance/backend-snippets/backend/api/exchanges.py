import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from services.exchanges import (BinanceExchange, CoinGeckoExchange, DataSource,
                                ExchangeManager, ExchangeStatus)

from config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/exchanges", tags=["exchanges"])

# Global exchange manager instance
exchange_manager = ExchangeManager()


class TickerResponse(BaseModel):
    symbol: str
    last_price: float
    bid: float
    ask: float
    volume_24h: float
    change_24h: float
    timestamp: datetime


class KlineResponse(BaseModel):
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float


class ExchangeStatusResponse(BaseModel):
    exchange: str
    status: str
    last_error: Optional[str]


class MarketDataResponse(BaseModel):
    symbol: str
    aggregated_price: float
    min_price: float
    max_price: float
    price_spread: float
    total_volume_24h: float
    sources: List[str]
    source_count: int
    timestamp: datetime


@router.on_event("startup")
async def startup_exchanges():
    """Initialize exchange connections on API startup."""
    try:
        # Add Binance if configured
        if settings.BINANCE_API_KEY and settings.BINANCE_API_SECRET:
            binance = BinanceExchange(
                api_key=settings.BINANCE_API_KEY,
                api_secret=settings.BINANCE_API_SECRET,
                testnet=settings.BINANCE_TESTNET,
            )
            await exchange_manager.add_exchange("binance", binance, DataSource.PRIMARY)
            logger.info("Binance exchange configured as primary")

        # Add CoinGecko (always available as fallback)
        coingecko = CoinGeckoExchange(
            api_key=(
                settings.COINGECKO_API_KEY
                if hasattr(settings, "COINGECKO_API_KEY")
                else None
            )
        )
        await exchange_manager.add_exchange("coingecko", coingecko, DataSource.FALLBACK)
        logger.info("CoinGecko exchange configured as fallback")

        # Connect to all exchanges
        results = await exchange_manager.connect_all()
        logger.info(f"Exchange connection results: {results}")

    except Exception as e:
        logger.error(f"Failed to initialize exchanges: {str(e)}")


@router.on_event("shutdown")
async def shutdown_exchanges():
    """Disconnect from all exchanges on API shutdown."""
    try:
        await exchange_manager.disconnect_all()
        logger.info("All exchanges disconnected")
    except Exception as e:
        logger.error(f"Error during exchange shutdown: {str(e)}")


@router.get("/status", response_model=List[ExchangeStatusResponse])
async def get_exchange_status():
    """Get status of all configured exchanges."""
    try:
        statuses = exchange_manager.get_exchange_status()

        response = []
        for exchange_name, status in statuses.items():
            exchange = exchange_manager.exchanges.get(exchange_name)
            response.append(
                ExchangeStatusResponse(
                    exchange=exchange_name,
                    status=status,
                    last_error=exchange.get_last_error() if exchange else None,
                )
            )

        return response

    except Exception as e:
        logger.error(f"Failed to get exchange status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ticker/{symbol}", response_model=TickerResponse)
async def get_ticker(symbol: str):
    """
    Get current ticker data for a symbol with automatic failover.

    Args:
        symbol: Trading pair symbol (e.g., 'BTCUSDT')
    """
    try:
        ticker = await exchange_manager.get_ticker(symbol)
        return TickerResponse(**ticker)

    except Exception as e:
        logger.error(f"Failed to get ticker for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tickers", response_model=Dict[str, TickerResponse])
async def get_multiple_tickers(symbols: str):
    """
    Get tickers for multiple symbols.

    Args:
        symbols: Comma-separated list of symbols (e.g., 'BTCUSDT,ETHUSDT,BNBUSDT')
    """
    try:
        symbol_list = [s.strip() for s in symbols.split(",")]
        tickers = await exchange_manager.get_multiple_tickers(symbol_list)

        return {symbol: TickerResponse(**data) for symbol, data in tickers.items()}

    except Exception as e:
        logger.error(f"Failed to get multiple tickers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/klines/{symbol}", response_model=List[KlineResponse])
async def get_klines(
    symbol: str,
    interval: str = "1h",
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    limit: int = 500,
):
    """
    Get historical candlestick data with automatic failover.

    Args:
        symbol: Trading pair symbol
        interval: Timeframe (1m, 5m, 15m, 1h, 4h, 1d)
        start_time: Start time for historical data
        end_time: End time for historical data
        limit: Maximum number of candles
    """
    try:
        klines = await exchange_manager.get_klines(
            symbol, interval, start_time, end_time, limit
        )

        return [KlineResponse(**kline) for kline in klines]

    except Exception as e:
        logger.error(f"Failed to get klines for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/market-data/{symbol}", response_model=MarketDataResponse)
async def get_aggregated_market_data(symbol: str):
    """
    Get aggregated market data from multiple exchanges.

    Args:
        symbol: Trading pair symbol
    """
    try:
        data = await exchange_manager.aggregate_market_data(symbol)

        # Remove raw_data from response for cleaner output
        response_data = {k: v for k, v in data.items() if k != "raw_data"}

        return MarketDataResponse(**response_data)

    except Exception as e:
        logger.error(f"Failed to get aggregated market data for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reconnect/{exchange_name}")
async def reconnect_exchange(exchange_name: str):
    """
    Manually reconnect to a specific exchange.

    Args:
        exchange_name: Name of the exchange to reconnect
    """
    try:
        if exchange_name not in exchange_manager.exchanges:
            raise HTTPException(
                status_code=404, detail=f"Exchange {exchange_name} not found"
            )

        exchange = exchange_manager.exchanges[exchange_name]

        # Disconnect and reconnect
        await exchange.disconnect()
        success = await exchange.connect()

        return {
            "exchange": exchange_name,
            "success": success,
            "status": exchange.get_status().value,
        }

    except Exception as e:
        logger.error(f"Failed to reconnect to {exchange_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """
    Perform health check on all exchanges.

    Returns:
        Health status for each exchange
    """
    try:
        health_status = {}

        for name, exchange in exchange_manager.exchanges.items():
            try:
                is_healthy = await exchange.health_check()
                health_status[name] = {
                    "healthy": is_healthy,
                    "status": exchange.get_status().value,
                    "last_error": exchange.get_last_error(),
                }
            except Exception as e:
                health_status[name] = {
                    "healthy": False,
                    "status": "error",
                    "last_error": str(e),
                }

        return health_status

    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/failover/enable")
async def enable_failover(enabled: bool = True):
    """
    Enable or disable automatic failover.

    Args:
        enabled: Whether to enable failover
    """
    exchange_manager.set_failover_enabled(enabled)
    return {
        "failover_enabled": enabled,
        "message": f"Failover {'enabled' if enabled else 'disabled'}",
    }


@router.post("/retry-config")
async def set_retry_config(attempts: int = 3, delay: float = 2.0):
    """
    Configure retry behavior for failed requests.

    Args:
        attempts: Number of retry attempts
        delay: Delay between retries in seconds
    """
    exchange_manager.set_retry_config(attempts, delay)
    return {
        "retry_attempts": attempts,
        "retry_delay": delay,
        "message": "Retry configuration updated",
    }
