"""포스터 생성 API 라우터."""

import traceback

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from pupoo_ai.app.core.auth import verify_internal_token
from pupoo_ai.app.core.constants import (
    ERROR_INTERNAL,
    ERROR_VALIDATION,
    INTERNAL_API_PREFIX,
    SUCCESS_CODE,
)
from pupoo_ai.app.core.logger import get_logger
from pupoo_ai.app.features.poster.dto.request import PosterGenerateRequest
from pupoo_ai.app.features.poster.dto.response import PosterGenerateResponse
from pupoo_ai.app.features.poster.provider.provider_exceptions import (
    PosterProviderError,
)
from pupoo_ai.app.features.poster.service.poster_service import (
    PosterService,
    PosterStorageError,
    get_poster_service,
)

logger = get_logger(__name__)

router = APIRouter(tags=["poster"])


def _success_response(data: PosterGenerateResponse) -> dict:
    return {
        "success": True,
        "code": SUCCESS_CODE,
        "data": data.model_dump(by_alias=True),
    }


def _error_response(
    *,
    status_code: int,
    code: str,
    message: str,
    message_type: str,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "code": code,
            "data": {
                "message": message,
                "messageType": message_type,
                "actions": [],
            },
        },
    )


def _handle_generate(
    request: PosterGenerateRequest,
    poster_service: PosterService,
):
    try:
        response = poster_service.generate_poster(request)
        return _success_response(response)
    except ValueError as exc:
        return _error_response(
            status_code=400,
            code=ERROR_VALIDATION,
            message=str(exc),
            message_type="validation",
        )
    except PosterProviderError as exc:
        logger.warning("poster provider error: %s", exc)
        return _error_response(
            status_code=502,
            code="POSTER_PROVIDER_ERROR",
            message="포스터 이미지를 생성하지 못했습니다.",
            message_type="provider_error",
        )
    except PosterStorageError as exc:
        logger.warning("poster storage error: %s", exc)
        return _error_response(
            status_code=500,
            code="POSTER_STORAGE_ERROR",
            message="생성된 포스터를 저장하지 못했습니다.",
            message_type="storage_error",
        )
    except Exception as exc:
        logger.error("poster router error: %s\n%s", exc, traceback.format_exc())
        return _error_response(
            status_code=500,
            code=ERROR_INTERNAL,
            message="포스터 생성 중 오류가 발생했습니다.",
            message_type="error",
        )


@router.post("/api/poster/generate", response_model=None, summary="포스터 생성")
async def generate_poster_api(
    request: PosterGenerateRequest,
    poster_service: PosterService = Depends(get_poster_service),
):
    return _handle_generate(request, poster_service)


@router.post(
    f"{INTERNAL_API_PREFIX}/poster/generate",
    response_model=None,
    summary="내부 포스터 생성",
    dependencies=[Depends(verify_internal_token)],
)
async def generate_poster_internal(
    request: PosterGenerateRequest,
    poster_service: PosterService = Depends(get_poster_service),
):
    return _handle_generate(request, poster_service)
