"""챗봇 API 라우터."""

from fastapi import APIRouter, Depends, Header
from fastapi.responses import JSONResponse

from pupoo_ai.app.core.auth import verify_internal_token
from pupoo_ai.app.core.constants import INTERNAL_API_PREFIX
from pupoo_ai.app.core.logger import get_logger
from pupoo_ai.app.features.chatbot.dto.request import ChatRequest
from pupoo_ai.app.features.chatbot.service.chatbot_service import chat as chat_service
from pupoo_ai.app.features.orchestrator.backend_api_client import BackendApiError

logger = get_logger(__name__)

router = APIRouter(tags=["chatbot"])
internal_router = APIRouter(
    prefix=INTERNAL_API_PREFIX,
    tags=["chatbot"],
    dependencies=[Depends(verify_internal_token)],
)


def _force_role(request: ChatRequest, role: str) -> ChatRequest:
    return request.model_copy(
        update={
            "context": request.context.model_copy(update={"role": role}),
        }
    )


async def _handle_chat(request: ChatRequest, authorization: str | None):
    try:
        response = await chat_service(request, authorization=authorization)
        return {"success": True, "code": "OK", "data": response.model_dump(by_alias=True)}
    except BackendApiError as exc:
        status_code = exc.status_code or 500
        message_type = {
            400: "validation",
            401: "unauthorized",
            403: "forbidden",
            404: "not_found",
        }.get(status_code, "error")
        return JSONResponse(
            status_code=status_code,
            content={
                "success": False,
                "code": f"BACKEND_{status_code}",
                "data": {
                    "message": str(exc),
                    "messageType": message_type,
                    "actions": [],
                },
            },
        )
    except ValueError as exc:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "code": "VALIDATION_ERROR",
                "data": {
                    "message": str(exc),
                    "messageType": "validation",
                    "actions": [],
                },
            },
        )
    except Exception:
        logger.exception("챗봇 요청 처리 중 예기치 않은 오류가 발생했습니다.")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "code": "ERROR",
                "data": {
                    "message": "챗봇 응답 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
                    "messageType": "error",
                    "actions": [],
                },
            },
        )


@router.post("/api/chatbot/chat", summary="사용자 챗봇 메시지 전송")
async def handle_user_chat(
    request: ChatRequest,
    authorization: str | None = Header(default=None),
):
    return await _handle_chat(_force_role(request, "user"), authorization)


@internal_router.post("/chatbot/chat", summary="사용자 내부 챗봇 메시지 전송")
async def handle_internal_user_chat(
    request: ChatRequest,
    authorization: str | None = Header(default=None),
):
    return await _handle_chat(_force_role(request, "user"), authorization)


@internal_router.post("/admin/chatbot/chat", summary="관리자 내부 챗봇 메시지 전송")
async def handle_internal_admin_chat(
    request: ChatRequest,
    authorization: str | None = Header(default=None),
):
    return await _handle_chat(_force_role(request, "admin"), authorization)


router.include_router(internal_router)
