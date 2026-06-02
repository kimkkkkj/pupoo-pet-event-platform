"""헬스체크 라우터.

기능:
- 프로세스 생존 여부와 외부 의존성 준비 상태를 확인한다.

설명:
- `/health`는 빠른 생존 확인용이다.
- `/ready`는 현재 설정과 RDS 연결 가능 여부까지 확인한다.
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from pupoo_ai.app.core.config import settings
from pupoo_ai.app.features.congestion.service.prediction_service import MODEL_REGISTRY
from pupoo_ai.app.infrastructure.rds import check_connection, is_rds_configured

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> dict[str, str]:
    # 기능: 프로세스 기본 응답 가능 여부를 확인한다.
    # 설명: 외부 의존성 확인 없이 서비스 자체가 살아 있는지만 빠르게 반환한다.
    # 흐름: 상태 payload 구성 -> 즉시 반환.
    return {"status": "ok", "service": settings.service_name}


@router.get("/ready")
async def readiness_check():
    # 기능: 서비스가 실제 요청을 받을 준비가 되었는지 확인한다.
    # 설명: RDS 설정과 연결 가능 여부를 포함해 ready/degraded 상태를 구분한다.
    # 흐름: 기본 payload 구성 -> 설정 확인 -> 연결 점검 -> 상태 반환.
    payload = {
        "status": "ready",
        "service": settings.service_name,
        "dependencies": {
            "database": {
                "configured": False,
                "reachable": False,
            },
            "congestionPrediction": {
                "configured": bool(settings.congestion_model_enabled),
                "eventLoaded": False,
                "programLoaded": False,
            },
        },
    }

    model_status = MODEL_REGISTRY.load_status()
    if model_status.get("enabled"):
        targets = model_status.get("targets") or {}
        event_loaded = bool((targets.get("EVENT") or {}).get("loaded"))
        program_loaded = bool((targets.get("PROGRAM") or {}).get("loaded"))
        payload["dependencies"]["congestionPrediction"] = {
            "configured": True,
            "eventLoaded": event_loaded,
            "programLoaded": program_loaded,
        }
        if not event_loaded:
            payload["status"] = "degraded"
            payload["reason"] = "congestion_event_model_unavailable"

    if not is_rds_configured():
        if payload["status"] == "degraded":
            return JSONResponse(status_code=503, content=payload)
        return payload

    try:
        database_status = check_connection()
        payload["dependencies"]["database"] = {
            "configured": bool(database_status.get("configured")),
            "reachable": bool(database_status.get("reachable")),
        }
        if payload["status"] == "degraded":
            return JSONResponse(status_code=503, content=payload)
        return payload
    except Exception as exc:
        payload["status"] = "degraded"
        payload["dependencies"]["database"] = {
            "configured": True,
            "reachable": False,
        }
        payload["reason"] = str(exc)
        return JSONResponse(status_code=503, content=payload)
