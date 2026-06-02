from unittest.mock import AsyncMock, patch
from types import SimpleNamespace

import pytest

from pupoo_ai.app.features.chatbot.dto.request import ChatContext, ChatRequest
from pupoo_ai.app.features.chatbot.service.chatbot_service import chat


@pytest.mark.asyncio
async def test_user_chat_prefers_grounded_event_answer():
    request = ChatRequest(
        message="\uc624\ub298 \uae30\uc900 \uc9c4\ud589 \uc911\uc778 \ud589\uc0ac \uc774\ub984 \ud558\ub098\uc640 "
        "\uc7a5\uc18c\ub97c \uc9e7\uac8c \uc54c\ub824\uc918"
    )

    with patch(
        "pupoo_ai.app.features.chatbot.service.chatbot_service.BackendApiClient.list_events",
        new=AsyncMock(
            return_value=[
                {
                    "eventId": 3,
                    "eventName": "\ucf54\ub9ac\uc544 \ud3ab \uc5d1\uc2a4\ud3ec",
                    "location": "\ud0a8\ud14d\uc2a4",
                    "startAt": "2026-03-10T09:00:00",
                    "endAt": "2026-03-30T18:00:00",
                    "status": "ONGOING",
                    "description": "\uad6d\ub0b4 \ub300\ud45c \ubc18\ub824\ub3d9\ubb3c \ud589\uc0ac\uc785\ub2c8\ub2e4.",
                }
            ]
        ),
    ), patch(
        "pupoo_ai.app.features.chatbot.service.chatbot_service.invoke_bedrock",
        new=AsyncMock(return_value="LLM fallback"),
    ) as mocked_invoke:
        response = await chat(request)

    assert "\ucf54\ub9ac\uc544 \ud3ab \uc5d1\uc2a4\ud3ec" in response.message
    assert "\ud0a8\ud14d\uc2a4" in response.message
    mocked_invoke.assert_not_awaited()


@pytest.mark.asyncio
async def test_admin_chat_prefers_grounded_summary_answer():
    request = ChatRequest(
        message="\ud604\uc7ac \uc6b4\uc601 \uc911\uc778 \ud589\uc0ac \ud558\ub098\uc640 "
        "\ucd94\ucc9c \ud3ec\uc778\ud2b8\ub97c 2\ubb38\uc7a5\uc73c\ub85c \uc54c\ub824\uc918",
        context=ChatContext(role="admin"),
    )

    with patch(
        "pupoo_ai.app.features.chatbot.service.chatbot_service.IntentAnalyzer.analyze",
        return_value=None,
    ), patch(
        "pupoo_ai.app.features.chatbot.service.chatbot_service.BackendApiClient.list_events",
        new=AsyncMock(
            return_value=[
                {
                    "eventId": 7,
                    "eventName": "\uc778\ucc9c \ubc18\ub824\ub3d9\ubb3c \ucd95\uc81c",
                    "location": "\uc1a1\ub3c4 \ucee8\ubca4\uc2dc\uc544",
                    "startAt": "2026-03-15T09:00:00",
                    "endAt": "2026-03-28T18:00:00",
                    "status": "ONGOING",
                    "description": "\uc9c0\uc5ed \ubc18\ub824\ub3d9\ubb3c \ubcf4\ud638\uc790\ub97c \uc704\ud55c "
                    "\ub2e4\ucc44\ub85c\uc6b4 \uccb4\ud5d8 \ud589\uc0ac\uc785\ub2c8\ub2e4.",
                }
            ]
        ),
    ), patch(
        "pupoo_ai.app.features.chatbot.service.chatbot_service.BackendApiClient.get_ai_summary",
        new=AsyncMock(return_value={"congestion": {"ongoingEventCount": 3, "todayCheckinCount": 21}}),
    ), patch(
        "pupoo_ai.app.features.chatbot.service.chatbot_service.invoke_bedrock",
        new=AsyncMock(return_value="LLM fallback"),
    ) as mocked_invoke:
        response = await chat(request)

    assert "\uc778\ucc9c \ubc18\ub824\ub3d9\ubb3c \ucd95\uc81c" in response.message
    assert "\ucd94\ucc9c \ud3ec\uc778\ud2b8" in response.message
    mocked_invoke.assert_not_awaited()


@pytest.mark.asyncio
async def test_admin_chat_uses_grounding_before_low_confidence_message():
    request = ChatRequest(
        message="\ud604\uc7ac \uc6b4\uc601 \uc911\uc778 \ud589\uc0ac \ud558\ub098\uc640 "
        "\ucd94\ucc9c \ud3ec\uc778\ud2b8\ub97c 2\ubb38\uc7a5\uc73c\ub85c \uc54c\ub824\uc918",
        context=ChatContext(role="admin"),
    )

    with patch(
        "pupoo_ai.app.features.chatbot.service.chatbot_service.IntentAnalyzer.analyze",
        return_value=SimpleNamespace(intent_type="low_confidence"),
    ), patch(
        "pupoo_ai.app.features.chatbot.service.chatbot_service.BackendApiClient.list_events",
        new=AsyncMock(
            return_value=[
                {
                    "eventId": 7,
                    "eventName": "\uc778\ucc9c \ubc18\ub824\ub3d9\ubb3c \ucd95\uc81c",
                    "location": "\uc1a1\ub3c4 \ucee8\ubca4\uc2dc\uc544",
                    "startAt": "2026-03-15T09:00:00",
                    "endAt": "2026-03-28T18:00:00",
                    "status": "ONGOING",
                    "description": "\uc9c0\uc5ed \ubc18\ub824\ub3d9\ubb3c \ubcf4\ud638\uc790\ub97c \uc704\ud55c "
                    "\ub2e4\ucc44\ub85c\uc6b4 \uccb4\ud5d8 \ud589\uc0ac\uc785\ub2c8\ub2e4.",
                }
            ]
        ),
    ), patch(
        "pupoo_ai.app.features.chatbot.service.chatbot_service.BackendApiClient.get_ai_summary",
        new=AsyncMock(return_value={"congestion": {"ongoingEventCount": 3, "todayCheckinCount": 21}}),
    ), patch(
        "pupoo_ai.app.features.chatbot.service.chatbot_service.invoke_bedrock",
        new=AsyncMock(return_value="LLM fallback"),
    ) as mocked_invoke:
        response = await chat(request)

    assert "\uc778\ucc9c \ubc18\ub824\ub3d9\ubb3c \ucd95\uc81c" in response.message
    assert "\ucd94\ucc9c \ud3ec\uc778\ud2b8" in response.message
    mocked_invoke.assert_not_awaited()


@pytest.mark.asyncio
async def test_user_notice_query_prefers_direct_keyword_match():
    request = ChatRequest(message="\uc8fc\ucc28 \uad00\ub828 \uacf5\uc9c0 \uc54c\ub824\uc918")

    with patch(
        "pupoo_ai.app.features.chatbot.service.chatbot_service.BackendApiClient.list_events",
        new=AsyncMock(return_value=[]),
    ), patch(
        "pupoo_ai.app.features.chatbot.service.chatbot_service.BackendApiClient.list_notices",
        new=AsyncMock(
            return_value=[
                {
                    "noticeId": 6,
                    "title": "\uae34\uae09 \uacf5\uc9c0 \uc0ac\ud56d",
                    "content": "\ud604\uc7a5 \uacb0\uc81c \uc81c\ud55c \uc548\ub0b4",
                    "pinned": True,
                    "updatedAt": "2026-03-27T06:23:54",
                    "eventName": "\ucf54\ub9ac\uc544 \ud3ab \uc5d1\uc2a4\ud3ec",
                },
                {
                    "noticeId": 7,
                    "title": "\uc8fc\ucc28 \uad00\ub828 \uc548\ub0b4",
                    "content": "\uc8fc\ucc28\uc7a5\uc774 \ud63c\uc7a1\ud558\ub2c8 \ub300\uc911\uad50\ud1b5 \uc774\uc6a9\uc744 \uad8c\uc7a5\ud569\ub2c8\ub2e4.",
                    "pinned": True,
                    "updatedAt": "2026-03-13T05:49:49",
                    "eventName": None,
                },
            ]
        ),
    ), patch(
        "pupoo_ai.app.features.chatbot.service.chatbot_service.invoke_bedrock",
        new=AsyncMock(return_value="LLM fallback"),
    ) as mocked_invoke:
        response = await chat(request)

    assert "\uc8fc\ucc28 \uad00\ub828 \uc548\ub0b4" in response.message
    mocked_invoke.assert_not_awaited()
