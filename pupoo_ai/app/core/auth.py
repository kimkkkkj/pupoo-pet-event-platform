"""내부 API 인증 유틸리티."""

from fastapi import Header

from pupoo_ai.app.core.config import configured_internal_tokens
from pupoo_ai.app.core.constants import ERROR_UNAUTHORIZED, HEADER_INTERNAL_TOKEN
from pupoo_ai.app.core.exceptions import ApiException


async def verify_internal_token(
    internal_token: str | None = Header(default=None, alias=HEADER_INTERNAL_TOKEN),
) -> None:
    """내부 호출 전용 토큰을 검증한다."""
    expected_tokens = configured_internal_tokens()
    if not expected_tokens or internal_token not in expected_tokens:
        raise ApiException(
            code=ERROR_UNAUTHORIZED,
            message="내부 API 인증에 실패했습니다.",
            status_code=403,
            errors=[],
        )
