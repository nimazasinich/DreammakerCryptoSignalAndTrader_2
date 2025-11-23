"""
Monitoring API endpoints for BOLT AI Neural Agent System
"""

from typing import Any, Dict

import structlog
from db.database import get_db
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from monitoring.alerting import get_alert_manager
from services.slo_service import get_slo_service
from sqlalchemy.ext.asyncio import AsyncSession

from monitoring import (get_crash_dump_generator, get_logger,
                        get_metrics_collector, get_slo_monitor,
                        get_telemetry_collector)

logger = get_logger(__name__)
router = APIRouter(prefix="/api/v1/monitoring", tags=["monitoring"])


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": "2024-01-01T00:00:00Z",
        "version": "1.0.0",
    }


@router.get("/metrics")
async def get_metrics():
    """Get Prometheus metrics"""
    try:
        metrics_collector = get_metrics_collector()
        metrics_data = metrics_collector.get_metrics()
        return PlainTextResponse(metrics_data, media_type="text/plain")
    except Exception as e:
        logger.error("Error getting metrics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get metrics")


@router.get("/telemetry/summary")
async def get_telemetry_summary():
    """Get telemetry summary"""
    try:
        telemetry_collector = get_telemetry_collector()

        summary = {
            "performance": telemetry_collector.get_performance_summary(),
            "training": telemetry_collector.get_training_summary(),
            "prediction": telemetry_collector.get_prediction_summary(),
        }

        return summary
    except Exception as e:
        logger.error("Error getting telemetry summary", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get telemetry summary")


@router.get("/slo/status")
async def get_slo_status():
    """Get SLO status"""
    try:
        slo_service = get_slo_service()
        status = slo_service.get_slo_status()
        return status
    except Exception as e:
        logger.error("Error getting SLO status", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get SLO status")


@router.get("/slo/compliance")
async def get_slo_compliance():
    """Get SLO compliance summary"""
    try:
        slo_service = get_slo_service()
        compliance = slo_service.get_slo_compliance()
        return compliance
    except Exception as e:
        logger.error("Error getting SLO compliance", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get SLO compliance")


@router.get("/slo/release-gate")
async def check_release_gate():
    """Check release gate status"""
    try:
        slo_service = get_slo_service()
        gate_status = slo_service.check_release_gate()
        return gate_status
    except Exception as e:
        logger.error("Error checking release gate", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to check release gate")


@router.get("/slo/metrics")
async def get_slo_metrics():
    """Get SLO metrics summary"""
    try:
        slo_service = get_slo_service()
        metrics = slo_service.get_slo_metrics()
        return metrics
    except Exception as e:
        logger.error("Error getting SLO metrics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get SLO metrics")


@router.get("/slo/list")
async def list_slos():
    """List all configured SLOs"""
    try:
        slo_service = get_slo_service()
        slos = slo_service.list_slos()
        return {"slos": slos}
    except Exception as e:
        logger.error("Error listing SLOs", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to list SLOs")


@router.get("/slo/config/{slo_name}")
async def get_slo_config(slo_name: str):
    """Get SLO configuration"""
    try:
        slo_service = get_slo_service()
        config = slo_service.get_slo_config(slo_name)
        if config is None:
            raise HTTPException(status_code=404, detail=f"SLO {slo_name} not found")
        return config
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error getting SLO config", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get SLO config")


@router.post("/slo/config/{slo_name}")
async def configure_slo(slo_name: str, config: Dict[str, Any]):
    """Configure SLO parameters"""
    try:
        slo_service = get_slo_service()
        slo_service.configure_slo(slo_name, config)
        return {"status": "configured", "slo_name": slo_name}
    except Exception as e:
        logger.error("Error configuring SLO", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to configure SLO")


@router.post("/slo/record")
async def record_slo_metric(sli_name: str, value: float, tags: Dict[str, str] = None):
    """Record SLO metric"""
    try:
        slo_service = get_slo_service()
        slo_service.record_metric(sli_name, value, tags)
        return {"status": "recorded"}
    except Exception as e:
        logger.error("Error recording SLO metric", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to record SLO metric")


@router.get("/alerts/stats")
async def get_alert_stats():
    """Get alert statistics"""
    try:
        alert_manager = get_alert_manager()
        stats = alert_manager.get_alert_stats()
        return stats
    except Exception as e:
        logger.error("Error getting alert stats", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get alert stats")


@router.get("/alerts/history")
async def get_alert_history(limit: int = 100):
    """Get alert history"""
    try:
        alert_manager = get_alert_manager()
        history = alert_manager.get_alert_history(limit)
        return {"alerts": history}
    except Exception as e:
        logger.error("Error getting alert history", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get alert history")


@router.post("/alerts/send")
async def send_alert(
    alert_type: str,
    severity: str,
    title: str,
    message: str,
    source: str,
    metadata: Dict[str, Any] = None,
):
    """Send manual alert"""
    try:
        alert_manager = get_alert_manager()
        alert = alert_manager.create_alert(
            alert_type=alert_type,
            severity=severity,
            title=title,
            message=message,
            source=source,
            metadata=metadata,
        )
        success = await alert_manager.send_alert(alert)
        return {"status": "sent" if success else "failed"}
    except Exception as e:
        logger.error("Error sending alert", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to send alert")


@router.get("/crash-dumps")
async def get_crash_dumps():
    """Get crash dump information"""
    try:
        crash_dump_generator = get_crash_dump_generator()

        # List crash dump files
        crash_dumps = []
        for dump_file in crash_dump_generator.output_dir.glob("*.json"):
            crash_dumps.append(
                {
                    "filename": dump_file.name,
                    "size": dump_file.stat().st_size,
                    "created": dump_file.stat().st_ctime,
                    "modified": dump_file.stat().st_mtime,
                }
            )

        return {
            "crash_dumps": crash_dumps,
            "output_directory": str(crash_dump_generator.output_dir),
        }
    except Exception as e:
        logger.error("Error getting crash dumps", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get crash dumps")


@router.post("/crash-dumps/generate")
async def generate_crash_dump(crash_type: str = "manual"):
    """Generate crash dump"""
    try:
        crash_dump_generator = get_crash_dump_generator()
        crash_file = crash_dump_generator.generate_crash_dump(crash_type=crash_type)

        if crash_file:
            return {"status": "generated", "crash_file": str(crash_file)}
        else:
            raise HTTPException(status_code=500, detail="Failed to generate crash dump")
    except Exception as e:
        logger.error("Error generating crash dump", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to generate crash dump")


@router.post("/crash-dumps/memory")
async def generate_memory_dump():
    """Generate memory dump"""
    try:
        crash_dump_generator = get_crash_dump_generator()
        memory_file = crash_dump_generator.generate_memory_dump()

        if memory_file:
            return {"status": "generated", "memory_file": str(memory_file)}
        else:
            raise HTTPException(
                status_code=500, detail="Failed to generate memory dump"
            )
    except Exception as e:
        logger.error("Error generating memory dump", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to generate memory dump")


@router.post("/crash-dumps/performance")
async def generate_performance_dump():
    """Generate performance dump"""
    try:
        crash_dump_generator = get_crash_dump_generator()
        performance_file = crash_dump_generator.generate_performance_dump()

        if performance_file:
            return {"status": "generated", "performance_file": str(performance_file)}
        else:
            raise HTTPException(
                status_code=500, detail="Failed to generate performance dump"
            )
    except Exception as e:
        logger.error("Error generating performance dump", error=str(e))
        raise HTTPException(
            status_code=500, detail="Failed to generate performance dump"
        )


@router.post("/telemetry/export")
async def export_telemetry():
    """Export telemetry data"""
    try:
        telemetry_collector = get_telemetry_collector()
        exported_files = telemetry_collector.export_telemetry()
        return {"status": "exported", "files": exported_files}
    except Exception as e:
        logger.error("Error exporting telemetry", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to export telemetry")


@router.post("/slo/export")
async def export_slo_data():
    """Export SLO data"""
    try:
        slo_monitor = get_slo_monitor()
        exported_files = slo_monitor.export_slo_data()
        return {"status": "exported", "files": exported_files}
    except Exception as e:
        logger.error("Error exporting SLO data", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to export SLO data")


@router.get("/logs")
async def get_logs(limit: int = 100):
    """Get recent log entries"""
    try:
        # This would typically read from log files
        # For now, return a placeholder response
        return {"logs": [], "limit": limit, "message": "Log retrieval not implemented"}
    except Exception as e:
        logger.error("Error getting logs", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get logs")


@router.get("/system/info")
async def get_system_info():
    """Get system information"""
    try:
        import platform

        import psutil

        return {
            "platform": platform.platform(),
            "python_version": platform.python_version(),
            "cpu_count": psutil.cpu_count(),
            "memory": {
                "total": psutil.virtual_memory().total,
                "available": psutil.virtual_memory().available,
                "percent": psutil.virtual_memory().percent,
            },
            "disk": {
                "total": psutil.disk_usage("/").total,
                "used": psutil.disk_usage("/").used,
                "free": psutil.disk_usage("/").free,
                "percent": psutil.disk_usage("/").percent,
            },
        }
    except Exception as e:
        logger.error("Error getting system info", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get system info")
