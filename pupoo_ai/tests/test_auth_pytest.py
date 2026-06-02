import pytest

from pupoo_ai.app.core.auth import verify_internal_token
from pupoo_ai.app.core.config import settings
from pupoo_ai.app.core.exceptions import ApiException


@pytest.mark.asyncio
async def test_internal_token_success():
    await verify_internal_token(settings.internal_token)


@pytest.mark.asyncio
async def test_internal_token_failure():
    with pytest.raises(ApiException) as exc_info:
        await verify_internal_token("invalid-internal-token")

    assert exc_info.value.status_code == 403
    assert exc_info.value.code == "UNAUTHORIZED"
