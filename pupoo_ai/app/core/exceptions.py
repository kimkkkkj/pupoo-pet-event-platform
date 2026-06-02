"""공통 예외 처리기.

기능:
- API 예외와 검증 예외를 프로젝트 공통 응답 형식으로 변환한다.

설명:
- 라우터는 예외를 발생시키기만 하고, 실제 응답 조립은 이 모듈이 담당한다.
"""

from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from pupoo_ai.app.core.constants import ERROR_INTERNAL, ERROR_VALIDATION, HEADER_TRACE_ID
from pupoo_ai.app.core.logger import get_logger, get_trace_id

logger = get_logger(__name__)


class ApiException(Exception):
    # 기능: 의도적으로 제어 가능한 API 예외를 표현한다.
    # 설명: 코드, 메시지, HTTP 상태를 함께 보관해 핸들러가 그대로 응답으로 변환할 수 있게 한다.
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int,
        errors: list[Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.errors = errors or []


def _resolve_trace_id(request: Request) -> str:
    # 기능: 현재 요청의 trace ID를 결정한다.
    # 설명: 미들웨어가 넣은 trace ID가 없으면 로거 컨텍스트 값을 사용한다.
    return getattr(request.state, "trace_id", None) or get_trace_id()


def _error_response(
    request: Request,
    *,
    code: str,
    message: str,
    status_code: int,
    errors: list[Any] | None = None,
) -> JSONResponse:
    # 기능: 공통 오류 응답 본문을 생성한다.
    # 설명: 모든 예외 응답에서 동일한 필드 구조와 traceId 헤더를 유지한다.
    trace_id = _resolve_trace_id(request)
    response = JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "code": code,
            "message": message,
            "traceId": trace_id,
            "errors": errors or [],
        },
    )
    response.headers[HEADER_TRACE_ID] = trace_id
    return response


async def api_exception_handler(request: Request, exc: ApiException) -> JSONResponse:
    # 기능: 비즈니스 성격의 API 예외를 응답으로 변환한다.
    return _error_response(
        request,
        code=exc.code,
        message=exc.message,
        status_code=exc.status_code,
        errors=exc.errors,
    )


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    # 기능: 요청 검증 실패를 422 응답으로 변환한다.
    return _error_response(
        request,
        code=ERROR_VALIDATION,
        message="요청 값이 올바르지 않습니다.",
        status_code=422,
        errors=exc.errors(),
    )


async def internal_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # 기능: 처리되지 않은 예외를 500 응답으로 변환한다.
    # 설명: 내부 스택은 로그에만 남기고 클라이언트에는 일반화된 메시지만 노출한다.
    logger.exception("Unhandled exception: %s", exc)
    return _error_response(
        request,
        code=ERROR_INTERNAL,
        message="내부 서버 오류가 발생했습니다.",
        status_code=500,
        errors=[],
    )


def register_exception_handlers(app: FastAPI) -> None:
    # 기능: FastAPI 앱에 공통 예외 처리기를 등록한다.
    app.add_exception_handler(ApiException, api_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, internal_exception_handler)
