"""공통 성공 응답 생성기.

기능:
- traceId를 포함한 성공 응답 형식을 일관되게 만든다.
"""

from typing import Any

from fastapi.responses import JSONResponse

from pupoo_ai.app.core.constants import HEADER_TRACE_ID, SUCCESS_CODE
from pupoo_ai.app.core.logger import get_trace_id

SUCCESS_MESSAGE = "정상 처리되었습니다."


def success_response(data: Any = None) -> JSONResponse:
    # 기능: 프로젝트 공통 성공 응답을 생성한다.
    # 설명: traceId를 헤더와 바디에 함께 넣어 추적 가능성을 유지한다.
    # 흐름: traceId 조회 -> JSONResponse 생성 -> 헤더 주입 -> 반환.
    trace_id = get_trace_id()
    response = JSONResponse(
        status_code=200,
        content={
            "success": True,
            "code": SUCCESS_CODE,
            "message": SUCCESS_MESSAGE,
            "traceId": trace_id,
            "data": data,
        },
    )
    response.headers[HEADER_TRACE_ID] = trace_id
    return response
