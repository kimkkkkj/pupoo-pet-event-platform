from unittest.mock import patch

import pytest

from pupoo_ai.app.api.routers.moderation import moderate, moderate_check
from pupoo_ai.app.features.moderation.schemas import ModerateRequest


@pytest.mark.asyncio
async def test_moderate_and_moderation_check_contracts_match():
    payload = ModerateRequest(
        content="오늘은 반려견과 산책했어요.",
        board_type="FREE",
        metadata={"source": "pytest"},
    )
    result_tuple = ("ALLOW", 0.13, "정상 문장입니다.", "rag_watsonx", None, None)

    with patch(
        "pupoo_ai.app.api.routers.moderation.moderate_with_rag",
        return_value=result_tuple,
    ):
        legacy_response = await moderate(payload)
        new_response = await moderate_check(payload)

    assert legacy_response.model_dump() == new_response.model_dump()
    assert legacy_response.decision == "ALLOW"
    assert legacy_response.result == "PASS"
    assert legacy_response.action == "PASS"
