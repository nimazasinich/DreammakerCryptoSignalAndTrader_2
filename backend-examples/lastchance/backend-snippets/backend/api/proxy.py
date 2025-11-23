"""
API Proxy Router - Handles all external API calls to avoid CORS issues
This eliminates CORS by making API calls from the backend instead of the browser
"""
import logging
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from config import settings

router = APIRouter(prefix="/api/v1/proxy", tags=["API Proxy"])
logger = logging.getLogger(__name__)

# Timeout for external API calls
TIMEOUT = httpx.Timeout(30.0, connect=10.0)


class ProxyResponse(BaseModel):
    """Generic proxy response model"""
    data: dict
    source: str
    cached: bool = False


# ============================================================================
# FEAR & GREED INDEX
# ============================================================================

@router.get("/fear-greed")
async def get_fear_greed_index():
    """
    Proxy for Alternative.me Fear & Greed Index
    
    Returns:
        Current crypto market sentiment (0-100)
        - 0-24: Extreme Fear
        - 25-49: Fear
        - 50: Neutral
        - 51-74: Greed
        - 75-100: Extreme Greed
    """
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.get("https://api.alternative.me/fng/?limit=1&format=json")
            response.raise_for_status()
            data = response.json()
            
            logger.info("Fear & Greed Index fetched successfully")
            return {
                "data": data,
                "source": "alternative.me",
                "cached": False
            }
    except httpx.HTTPError as e:
        logger.error(f"Fear & Greed API error: {e}")
        # Return fallback neutral value
        return {
            "data": {
                "name": "Fear and Greed Index",
                "data": [{
                    "value": "50",
                    "value_classification": "Neutral",
                    "timestamp": "0",
                    "time_until_update": "0"
                }],
                "metadata": {
                    "error": "API unavailable, showing neutral value"
                }
            },
            "source": "fallback",
            "cached": False
        }


# ============================================================================
# COINMARKETCAP
# ============================================================================

@router.get("/coinmarketcap/listings")
async def get_cmc_listings(
    start: int = Query(1, ge=1, description="Start position"),
    limit: int = Query(20, ge=1, le=100, description="Number of results"),
    convert: str = Query("USD", description="Currency to convert to"),
):
    """
    Proxy for CoinMarketCap cryptocurrency listings
    
    Returns top cryptocurrencies by market cap with price data
    """
    try:
        headers = {
            "X-CMC_PRO_API_KEY": "b54bcf4d-1bca-4e8e-9a24-22ff2c3d462c",
            "Accept": "application/json"
        }
        
        params = {
            "start": start,
            "limit": limit,
            "convert": convert,
            "sort": "market_cap",
            "sort_dir": "desc"
        }
        
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.get(
                "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest",
                params=params,
                headers=headers
            )
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"CoinMarketCap listings fetched: {limit} items")
            return {
                "data": data,
                "source": "coinmarketcap",
                "cached": False
            }
    except httpx.HTTPError as e:
        logger.error(f"CoinMarketCap API error: {e}")
        raise HTTPException(status_code=502, detail="CoinMarketCap API unavailable")


@router.get("/coinmarketcap/quotes")
async def get_cmc_quotes(
    symbols: str = Query(..., description="Comma-separated cryptocurrency symbols (e.g., BTC,ETH)"),
    convert: str = Query("USD", description="Currency to convert to"),
):
    """
    Proxy for CoinMarketCap cryptocurrency quotes
    
    Get latest market quotes for specific cryptocurrencies
    """
    try:
        headers = {
            "X-CMC_PRO_API_KEY": "b54bcf4d-1bca-4e8e-9a24-22ff2c3d462c",
            "Accept": "application/json"
        }
        
        params = {
            "symbol": symbols,
            "convert": convert
        }
        
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.get(
                "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest",
                params=params,
                headers=headers
            )
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"CoinMarketCap quotes fetched for: {symbols}")
            return {
                "data": data,
                "source": "coinmarketcap",
                "cached": False
            }
    except httpx.HTTPError as e:
        logger.error(f"CoinMarketCap quotes API error: {e}")
        raise HTTPException(status_code=502, detail="CoinMarketCap API unavailable")


# ============================================================================
# WHALE ALERT
# ============================================================================

@router.get("/whale-alert")
async def get_whale_transactions(
    min_value: int = Query(1000000, description="Minimum transaction value in USD"),
    limit: int = Query(10, ge=1, le=100, description="Number of transactions"),
):
    """
    Proxy for Whale Alert API - Large cryptocurrency transactions
    
    Note: Requires a paid Whale Alert API key
    """
    # TODO: Add your Whale Alert API key to environment variables
    whale_alert_key = "YOUR_WHALEALERT_KEY"  # Replace with actual key
    
    if whale_alert_key == "YOUR_WHALEALERT_KEY":
        return {
            "data": {
                "status": "info",
                "message": "Whale Alert requires a paid API key. Add WHALEALERT_KEY to your .env file",
                "transactions": []
            },
            "source": "whale-alert",
            "cached": False
        }
    
    try:
        params = {
            "min_value": min_value,
            "limit": limit,
            "api_key": whale_alert_key
        }
        
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.get(
                "https://api.whale-alert.io/v1/transactions",
                params=params
            )
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"Whale Alert transactions fetched: {len(data.get('transactions', []))}")
            return {
                "data": data,
                "source": "whale-alert",
                "cached": False
            }
    except httpx.HTTPError as e:
        logger.error(f"Whale Alert API error: {e}")
        raise HTTPException(status_code=502, detail="Whale Alert API unavailable")


# ============================================================================
# NEWS API
# ============================================================================

@router.get("/news")
async def get_crypto_news(
    query: str = Query("cryptocurrency OR bitcoin OR ethereum", description="Search query"),
    page_size: int = Query(20, ge=1, le=100, description="Number of articles"),
):
    """
    Proxy for NewsAPI - Cryptocurrency news articles
    
    Returns latest news articles about cryptocurrencies
    """
    try:
        params = {
            "q": query,
            "language": "en",
            "sortBy": "publishedAt",
            "pageSize": page_size,
            "apiKey": "968a5e25552b4cb5ba3280361d8444ab"
        }
        
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.get(
                "https://newsapi.org/v2/everything",
                params=params
            )
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"News articles fetched: {len(data.get('articles', []))}")
            return {
                "data": data,
                "source": "newsapi",
                "cached": False
            }
    except httpx.HTTPError as e:
        logger.error(f"NewsAPI error: {e}")
        # Return empty result on error
        return {
            "data": {
                "status": "error",
                "totalResults": 0,
                "articles": []
            },
            "source": "newsapi",
            "cached": False
        }


# ============================================================================
# COINGECKO (No API key required, good CORS support but proxy for consistency)
# ============================================================================

@router.get("/coingecko/markets")
async def get_coingecko_markets(
    vs_currency: str = Query("usd", description="Target currency"),
    per_page: int = Query(20, ge=1, le=250, description="Results per page"),
    page: int = Query(1, ge=1, description="Page number"),
):
    """
    Proxy for CoinGecko markets data
    
    Alternative to CoinMarketCap - free and no API key required
    """
    try:
        params = {
            "vs_currency": vs_currency,
            "order": "market_cap_desc",
            "per_page": per_page,
            "page": page,
            "sparkline": "false",
            "price_change_percentage": "24h,7d"
        }
        
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.get(
                "https://api.coingecko.com/api/v3/coins/markets",
                params=params
            )
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"CoinGecko markets fetched: {len(data)} items")
            return {
                "data": data,
                "source": "coingecko",
                "cached": False
            }
    except httpx.HTTPError as e:
        logger.error(f"CoinGecko API error: {e}")
        raise HTTPException(status_code=502, detail="CoinGecko API unavailable")


@router.get("/coingecko/price")
async def get_coingecko_price(
    ids: str = Query(..., description="Comma-separated coin IDs (e.g., bitcoin,ethereum)"),
    vs_currencies: str = Query("usd", description="Target currencies"),
):
    """
    Proxy for CoinGecko simple price endpoint
    
    Get current price for specific cryptocurrencies
    """
    try:
        params = {
            "ids": ids,
            "vs_currencies": vs_currencies,
            "include_24hr_change": "true",
            "include_market_cap": "true",
            "include_24hr_vol": "true"
        }
        
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.get(
                "https://api.coingecko.com/api/v3/simple/price",
                params=params
            )
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"CoinGecko prices fetched for: {ids}")
            return {
                "data": data,
                "source": "coingecko",
                "cached": False
            }
    except httpx.HTTPError as e:
        logger.error(f"CoinGecko price API error: {e}")
        raise HTTPException(status_code=502, detail="CoinGecko API unavailable")


# ============================================================================
# HEALTH CHECK
# ============================================================================

@router.get("/health")
async def proxy_health():
    """
    Check proxy service health and test external API connectivity
    """
    results = {}
    
    # Test Alternative.me
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
            response = await client.get("https://api.alternative.me/fng/?limit=1")
            results["fear_greed"] = "✅ Available" if response.status_code == 200 else "❌ Error"
    except:
        results["fear_greed"] = "❌ Unavailable"
    
    # Test CoinGecko
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
            response = await client.get("https://api.coingecko.com/api/v3/ping")
            results["coingecko"] = "✅ Available" if response.status_code == 200 else "❌ Error"
    except:
        results["coingecko"] = "❌ Unavailable"
    
    # Test CoinMarketCap
    try:
        headers = {"X-CMC_PRO_API_KEY": "b54bcf4d-1bca-4e8e-9a24-22ff2c3d462c"}
        async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
            response = await client.get(
                "https://pro-api.coinmarketcap.com/v1/key/info",
                headers=headers
            )
            results["coinmarketcap"] = "✅ Available" if response.status_code == 200 else "❌ Error"
    except:
        results["coinmarketcap"] = "❌ Unavailable"
    
    return {
        "status": "healthy",
        "proxy_service": "running",
        "external_apis": results,
        "message": "Proxy service is handling all API calls to avoid CORS issues"
    }
