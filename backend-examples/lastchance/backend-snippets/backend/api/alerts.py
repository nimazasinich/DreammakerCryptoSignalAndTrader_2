from datetime import datetime, timedelta
from typing import List, Optional

from api.deps import get_current_user
from db.database import get_db
from fastapi import APIRouter, Depends, HTTPException, Query
from models.alert import (Alert, AlertChannel, AlertHistory, AlertStatus,
                          AlertType)
from models.user import User
from schemas.alerts import (AlertCreate, AlertHistoryResponse, AlertResponse,
                            AlertSummaryResponse, AlertUpdate)
from services.alert_service import alert_service
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/alerts", tags=["Alerts"])


@router.post("/", response_model=AlertResponse)
async def create_alert(
    alert_data: AlertCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new alert."""
    try:
        alert = await alert_service.create_alert(
            db=db,
            user_id=current_user.id,
            symbol=alert_data.symbol,
            alert_type=alert_data.alert_type,
            threshold_value=alert_data.threshold_value,
            channels=alert_data.channels,
            message=alert_data.message,
            expires_at=alert_data.expires_at,
        )

        return AlertResponse.from_orm(alert)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[AlertResponse])
async def get_user_alerts(
    status: Optional[AlertStatus] = Query(None, description="Filter by status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get alerts for the current user."""
    try:
        alerts = await alert_service.get_user_alerts(db, current_user.id, status)
        return [AlertResponse.from_orm(alert) for alert in alerts]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific alert."""
    try:
        from sqlalchemy import and_, select

        result = await db.execute(
            select(Alert).where(
                and_(Alert.id == alert_id, Alert.user_id == current_user.id)
            )
        )
        alert = result.scalar_one_or_none()

        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")

        return AlertResponse.from_orm(alert)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{alert_id}", response_model=AlertResponse)
async def update_alert(
    alert_id: int,
    alert_data: AlertUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an alert."""
    try:
        alert = await alert_service.update_alert(
            db=db,
            alert_id=alert_id,
            user_id=current_user.id,
            **alert_data.dict(exclude_unset=True)
        )

        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")

        return AlertResponse.from_orm(alert)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an alert."""
    try:
        success = await alert_service.delete_alert(db, alert_id, current_user.id)

        if not success:
            raise HTTPException(status_code=404, detail="Alert not found")

        return {"message": "Alert deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{alert_id}/history", response_model=List[AlertHistoryResponse])
async def get_alert_history(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get alert trigger history."""
    try:
        from sqlalchemy import and_, select

        # First verify the alert belongs to the user
        result = await db.execute(
            select(Alert).where(
                and_(Alert.id == alert_id, Alert.user_id == current_user.id)
            )
        )
        alert = result.scalar_one_or_none()

        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")

        # Get alert history
        result = await db.execute(
            select(AlertHistory)
            .where(AlertHistory.alert_id == alert_id)
            .order_by(AlertHistory.triggered_at.desc())
        )
        history = result.scalars().all()

        return [AlertHistoryResponse.from_orm(h) for h in history]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary", response_model=AlertSummaryResponse)
async def get_alert_summary(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """Get alert summary for the current user."""
    try:
        from sqlalchemy import func, select

        # Get alert counts by status
        result = await db.execute(
            select(Alert.status, func.count(Alert.id))
            .where(Alert.user_id == current_user.id)
            .group_by(Alert.status)
        )
        status_counts = dict(result.fetchall())

        # Get total triggers
        result = await db.execute(
            select(func.sum(Alert.trigger_count)).where(
                Alert.user_id == current_user.id
            )
        )
        total_triggers = result.scalar() or 0

        # Get recent triggers (last 7 days)
        week_ago = datetime.utcnow() - timedelta(days=7)
        result = await db.execute(
            select(func.count(AlertHistory.id))
            .join(Alert)
            .where(
                and_(
                    Alert.user_id == current_user.id,
                    AlertHistory.triggered_at >= week_ago,
                )
            )
        )
        recent_triggers = result.scalar() or 0

        return AlertSummaryResponse(
            total_alerts=sum(status_counts.values()),
            active_alerts=status_counts.get(AlertStatus.ACTIVE, 0),
            triggered_alerts=status_counts.get(AlertStatus.TRIGGERED, 0),
            expired_alerts=status_counts.get(AlertStatus.EXPIRED, 0),
            disabled_alerts=status_counts.get(AlertStatus.DISABLED, 0),
            total_triggers=total_triggers,
            recent_triggers=recent_triggers,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/types")
async def get_alert_types():
    """Get available alert types."""
    return {
        "alert_types": [
            {
                "id": "price_above",
                "name": "Price Above",
                "description": "Alert when price goes above threshold",
            },
            {
                "id": "price_below",
                "name": "Price Below",
                "description": "Alert when price goes below threshold",
            },
            {
                "id": "price_change",
                "name": "Price Change",
                "description": "Alert on significant price change (%)",
            },
            {
                "id": "ai_signal",
                "name": "AI Signal",
                "description": "Alert on AI prediction signal",
            },
            {
                "id": "technical_pattern",
                "name": "Technical Pattern",
                "description": "Alert on technical analysis pattern",
            },
            {
                "id": "volume_spike",
                "name": "Volume Spike",
                "description": "Alert on unusual volume activity",
            },
        ],
        "channels": [
            {
                "id": "websocket",
                "name": "In-App Notification",
                "description": "Real-time notification in the dashboard",
            },
            {
                "id": "telegram",
                "name": "Telegram",
                "description": "Send notification to Telegram",
            },
            {
                "id": "email",
                "name": "Email",
                "description": "Send notification via email",
            },
        ],
    }
