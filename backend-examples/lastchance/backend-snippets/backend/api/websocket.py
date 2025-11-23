import json
import logging

from api.deps import get_current_user_from_token
from fastapi import (APIRouter, Depends, HTTPException, WebSocket,
                     WebSocketDisconnect)
from fastapi.security import HTTPBearer
from jose import JWTError, jwt
from websocket.manager import connection_manager

from config import settings

router = APIRouter(prefix="/api/v1", tags=["WebSocket"])

logger = logging.getLogger(__name__)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = None):
    """WebSocket endpoint for real-time updates."""
    user_id = None

    try:
        # Authenticate user
        if not token:
            await websocket.close(code=1008, reason="Authentication required")
            return

        try:
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
            )
            user_id = int(payload.get("sub"))
        except JWTError:
            await websocket.close(code=1008, reason="Invalid token")
            return

        # Connect user
        await connection_manager.connect(websocket, user_id)

        # Send welcome message
        await websocket.send_text(
            {
                "type": "welcome",
                "message": "Connected to Bolt AI Crypto WebSocket",
                "user_id": user_id,
                "available_channels": list(connection_manager.channels.keys()),
            }
        )

        # Handle messages
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                await connection_manager.handle_message(user_id, message)

            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                await websocket.send_text(
                    {"type": "error", "message": "Invalid JSON format"}
                )
            except Exception as e:
                logger.error(f"WebSocket error for user {user_id}: {e}")
                await websocket.send_text(
                    {"type": "error", "message": "Internal server error"}
                )

    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
    finally:
        if user_id:
            connection_manager.disconnect(user_id)


@router.get("/ws/info")
async def websocket_info():
    """Get WebSocket connection information."""
    return {
        "endpoint": "/api/v1/ws",
        "authentication": "Bearer token required",
        "available_channels": [
            "market_data",
            "predictions",
            "signals",
            "alerts",
            "portfolio",
        ],
        "message_types": ["subscribe", "unsubscribe", "request_data", "ping"],
        "example_messages": {
            "subscribe": {"type": "subscribe", "channel": "market_data"},
            "unsubscribe": {"type": "unsubscribe", "channel": "market_data"},
            "request_data": {
                "type": "request_data",
                "channel": "predictions",
                "symbol": "BTC",
            },
            "ping": {"type": "ping"},
        },
    }
