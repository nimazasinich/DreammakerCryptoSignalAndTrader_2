import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Set

from api.deps import get_current_user_from_token
from db.database import AsyncSessionLocal
from db.redis_client import redis_client
from fastapi import WebSocket, WebSocketDisconnect
from models.user import User
from services.alert_service import alert_service
from services.market_service import MarketService
from services.signal_service import signal_service
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections with channel multiplexing."""

    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}
        self.user_channels: Dict[int, Set[str]] = {}
        self.channel_subscribers: Dict[str, Set[int]] = {}
        self.market_service = MarketService()
        self.is_running = False

        # Channel types
        self.channels = {
            "market_data": self._handle_market_data,
            "predictions": self._handle_predictions,
            "signals": self._handle_signals,
            "alerts": self._handle_alerts,
            "portfolio": self._handle_portfolio,
        }

    async def connect(self, websocket: WebSocket, user_id: int):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        self.active_connections[user_id] = websocket
        self.user_channels[user_id] = set()

        logger.info(f"WebSocket connected for user {user_id}")

        # Start monitoring if not already running
        if not self.is_running:
            await self.start_monitoring()

    def disconnect(self, user_id: int):
        """Handle WebSocket disconnection."""
        if user_id in self.active_connections:
            del self.active_connections[user_id]

        # Remove user from all channels
        if user_id in self.user_channels:
            for channel in self.user_channels[user_id]:
                if channel in self.channel_subscribers:
                    self.channel_subscribers[channel].discard(user_id)
            del self.user_channels[user_id]

        logger.info(f"WebSocket disconnected for user {user_id}")

    async def send_personal_message(self, message: dict, user_id: int):
        """Send message to a specific user."""
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending message to user {user_id}: {e}")
                self.disconnect(user_id)

    async def broadcast_to_channel(self, message: dict, channel: str):
        """Broadcast message to all subscribers of a channel."""
        if channel in self.channel_subscribers:
            for user_id in self.channel_subscribers[channel].copy():
                await self.send_personal_message(message, user_id)

    async def subscribe_to_channel(self, user_id: int, channel: str):
        """Subscribe user to a channel."""
        if channel not in self.channels:
            await self.send_personal_message(
                {"type": "error", "message": f"Unknown channel: {channel}"}, user_id
            )
            return

        # Add user to channel
        if user_id not in self.user_channels:
            self.user_channels[user_id] = set()

        self.user_channels[user_id].add(channel)

        if channel not in self.channel_subscribers:
            self.channel_subscribers[channel] = set()

        self.channel_subscribers[channel].add(user_id)

        # Send confirmation
        await self.send_personal_message(
            {"type": "subscription", "channel": channel, "status": "subscribed"},
            user_id,
        )

        logger.info(f"User {user_id} subscribed to channel {channel}")

    async def unsubscribe_from_channel(self, user_id: int, channel: str):
        """Unsubscribe user from a channel."""
        if user_id in self.user_channels:
            self.user_channels[user_id].discard(channel)

        if channel in self.channel_subscribers:
            self.channel_subscribers[channel].discard(user_id)

        # Send confirmation
        await self.send_personal_message(
            {"type": "subscription", "channel": channel, "status": "unsubscribed"},
            user_id,
        )

        logger.info(f"User {user_id} unsubscribed from channel {channel}")

    async def handle_message(self, user_id: int, message: dict):
        """Handle incoming WebSocket message."""
        try:
            message_type = message.get("type")

            if message_type == "subscribe":
                channel = message.get("channel")
                if channel:
                    await self.subscribe_to_channel(user_id, channel)

            elif message_type == "unsubscribe":
                channel = message.get("channel")
                if channel:
                    await self.unsubscribe_from_channel(user_id, channel)

            elif message_type == "ping":
                await self.send_personal_message({"type": "pong"}, user_id)

            elif message_type == "request_data":
                channel = message.get("channel")
                symbol = message.get("symbol")
                if channel and symbol:
                    await self._handle_data_request(user_id, channel, symbol)

            else:
                await self.send_personal_message(
                    {
                        "type": "error",
                        "message": f"Unknown message type: {message_type}",
                    },
                    user_id,
                )

        except Exception as e:
            logger.error(f"Error handling message from user {user_id}: {e}")
            await self.send_personal_message(
                {"type": "error", "message": "Internal server error"}, user_id
            )

    async def _handle_data_request(self, user_id: int, channel: str, symbol: str):
        """Handle data request from user."""
        try:
            if channel == "market_data":
                # Get current market data
                market_data = await self.market_service.get_market_data([symbol])
                if market_data:
                    await self.send_personal_message(
                        {
                            "type": "market_data",
                            "symbol": symbol,
                            "data": market_data[0],
                        },
                        user_id,
                    )

            elif channel == "predictions":
                # Get AI prediction
                from ml.model import crypto_model

                if crypto_model.model is None:
                    crypto_model.build_model()

                candlestick_data = await self.market_service.get_candlestick_data(
                    symbol, "1h", 100
                )
                indicators = await self.market_service.get_technical_indicators(
                    symbol, "1h"
                )

                if candlestick_data:
                    prediction = await crypto_model.predict(
                        candlestick_data, indicators
                    )
                    prediction["symbol"] = symbol

                    await self.send_personal_message(
                        {"type": "prediction", "symbol": symbol, "data": prediction},
                        user_id,
                    )

            elif channel == "signals":
                # Get trading signals
                signals = await signal_service.generate_signals(
                    symbol, "1h", "combined"
                )
                if signals:
                    await self.send_personal_message(
                        {
                            "type": "signals",
                            "symbol": symbol,
                            "data": signals[-1],  # Latest signal
                        },
                        user_id,
                    )

            elif channel == "alerts":
                # Get user's alerts for symbol
                async with AsyncSessionLocal() as db:
                    alerts = await alert_service.get_user_alerts(db, user_id)
                    symbol_alerts = [
                        alert for alert in alerts if alert.symbol == symbol
                    ]

                    await self.send_personal_message(
                        {
                            "type": "alerts",
                            "symbol": symbol,
                            "data": [alert.__dict__ for alert in symbol_alerts],
                        },
                        user_id,
                    )

        except Exception as e:
            logger.error(f"Error handling data request: {e}")
            await self.send_personal_message(
                {
                    "type": "error",
                    "message": f"Failed to get {channel} data for {symbol}",
                },
                user_id,
            )

    async def start_monitoring(self):
        """Start background monitoring for all channels."""
        if self.is_running:
            return

        self.is_running = True
        logger.info("Starting WebSocket monitoring")

        # Start monitoring tasks
        asyncio.create_task(self._monitor_market_data())
        asyncio.create_task(self._monitor_predictions())
        asyncio.create_task(self._monitor_signals())
        asyncio.create_task(self._monitor_alerts())

    async def stop_monitoring(self):
        """Stop background monitoring."""
        self.is_running = False
        logger.info("WebSocket monitoring stopped")

    async def _monitor_market_data(self):
        """Monitor market data and send updates."""
        while self.is_running:
            try:
                if (
                    "market_data" in self.channel_subscribers
                    and self.channel_subscribers["market_data"]
                ):
                    # Get market data for subscribed symbols
                    symbols = ["BTC", "ETH", "BNB", "ADA", "SOL"]  # Default symbols
                    market_data = await self.market_service.get_market_data(symbols)

                    if market_data:
                        await self.broadcast_to_channel(
                            {
                                "type": "market_data_update",
                                "data": market_data,
                                "timestamp": datetime.utcnow().isoformat(),
                            },
                            "market_data",
                        )

                await asyncio.sleep(30)  # Update every 30 seconds

            except Exception as e:
                logger.error(f"Error in market data monitoring: {e}")
                await asyncio.sleep(30)

    async def _monitor_predictions(self):
        """Monitor AI predictions and send updates."""
        while self.is_running:
            try:
                if (
                    "predictions" in self.channel_subscribers
                    and self.channel_subscribers["predictions"]
                ):
                    symbols = ["BTC", "ETH", "BNB", "ADA", "SOL"]

                    for symbol in symbols:
                        try:
                            from ml.model import crypto_model

                            if crypto_model.model is None:
                                crypto_model.build_model()

                            candlestick_data = (
                                await self.market_service.get_candlestick_data(
                                    symbol, "1h", 100
                                )
                            )
                            indicators = (
                                await self.market_service.get_technical_indicators(
                                    symbol, "1h"
                                )
                            )

                            if candlestick_data:
                                prediction = await crypto_model.predict(
                                    candlestick_data, indicators
                                )
                                prediction["symbol"] = symbol

                                await self.broadcast_to_channel(
                                    {
                                        "type": "prediction_update",
                                        "symbol": symbol,
                                        "data": prediction,
                                        "timestamp": datetime.utcnow().isoformat(),
                                    },
                                    "predictions",
                                )

                        except Exception as e:
                            logger.error(f"Error getting prediction for {symbol}: {e}")

                await asyncio.sleep(60)  # Update every minute

            except Exception as e:
                logger.error(f"Error in predictions monitoring: {e}")
                await asyncio.sleep(60)

    async def _monitor_signals(self):
        """Monitor trading signals and send updates."""
        while self.is_running:
            try:
                if (
                    "signals" in self.channel_subscribers
                    and self.channel_subscribers["signals"]
                ):
                    symbols = ["BTC", "ETH", "BNB", "ADA", "SOL"]

                    for symbol in symbols:
                        try:
                            signals = await signal_service.generate_signals(
                                symbol, "1h", "combined"
                            )
                            if signals:
                                latest_signal = signals[-1]

                                await self.broadcast_to_channel(
                                    {
                                        "type": "signal_update",
                                        "symbol": symbol,
                                        "data": latest_signal,
                                        "timestamp": datetime.utcnow().isoformat(),
                                    },
                                    "signals",
                                )

                        except Exception as e:
                            logger.error(f"Error getting signals for {symbol}: {e}")

                await asyncio.sleep(120)  # Update every 2 minutes

            except Exception as e:
                logger.error(f"Error in signals monitoring: {e}")
                await asyncio.sleep(120)

    async def _monitor_alerts(self):
        """Monitor alerts and send notifications."""
        while self.is_running:
            try:
                # Check for new alert notifications in Redis
                for user_id in self.active_connections:
                    try:
                        # Check for WebSocket notifications
                        notification_key = f"ws_notification:{user_id}:*"
                        # This would need Redis SCAN implementation
                        # For now, we'll check specific alert IDs

                        # Get user's active alerts
                        async with AsyncSessionLocal() as db:
                            alerts = await alert_service.get_user_alerts(db, user_id)

                            for alert in alerts:
                                if alert.status == AlertStatus.ACTIVE:
                                    # Check if there's a notification for this alert
                                    notification = await redis_client.get(
                                        f"ws_notification:{user_id}:{alert.id}"
                                    )
                                    if notification:
                                        await self.send_personal_message(
                                            {
                                                "type": "alert_notification",
                                                "data": notification,
                                                "timestamp": datetime.utcnow().isoformat(),
                                            },
                                            user_id,
                                        )

                                        # Remove notification after sending
                                        await redis_client.delete(
                                            f"ws_notification:{user_id}:{alert.id}"
                                        )

                    except Exception as e:
                        logger.error(f"Error checking alerts for user {user_id}: {e}")

                await asyncio.sleep(10)  # Check every 10 seconds

            except Exception as e:
                logger.error(f"Error in alerts monitoring: {e}")
                await asyncio.sleep(10)

    async def _handle_market_data(self, user_id: int, data: dict):
        """Handle market data channel."""
        pass

    async def _handle_predictions(self, user_id: int, data: dict):
        """Handle predictions channel."""
        pass

    async def _handle_signals(self, user_id: int, data: dict):
        """Handle signals channel."""
        pass

    async def _handle_alerts(self, user_id: int, data: dict):
        """Handle alerts channel."""
        pass

    async def _handle_portfolio(self, user_id: int, data: dict):
        """Handle portfolio channel."""
        pass


# Global connection manager
connection_manager = ConnectionManager()
