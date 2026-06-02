from unittest.mock import AsyncMock, patch

import pytest

from pupoo_ai.app.api.routers.chatbot import handle_internal_admin_chat, handle_user_chat
from pupoo_ai.app.features.chatbot.dto.request import ChatContext, ChatRequest
from pupoo_ai.app.features.chatbot.dto.response import ChatResponse
from pupoo_ai.app.features.chatbot.prompts.system import SYSTEM_PROMPT, USER_SYSTEM_PROMPT
from pupoo_ai.app.features.chatbot.service.chatbot_service import chat


@pytest.mark.asyncio
async def test_user_route_does_not_fall_into_admin_path():
    request = ChatRequest(
        message="\ud589\uc0ac \uc548\ub0b4 \uc54c\ub824\uc918",
        context=ChatContext(role="admin"),
    )

    async def fake_chat_service(forced_request, authorization=None):
        assert forced_request.context.role == "user"
        return ChatResponse(message="\uc0ac\uc6a9\uc790 \uc548\ub0b4", actions=[])

    with patch(
        "pupoo_ai.app.api.routers.chatbot.chat_service",
        new=AsyncMock(side_effect=fake_chat_service),
    ):
        response = await handle_user_chat(request, authorization=None)

    assert response["success"] is True
    assert response["data"]["message"] == "\uc0ac\uc6a9\uc790 \uc548\ub0b4"


@pytest.mark.asyncio
async def test_admin_route_does_not_fall_into_user_path():
    request = ChatRequest(
        message="\uacf5\uc9c0 \ucd08\uc548 \uc791\uc131 \ub3c4\uc640\uc918",
        context=ChatContext(role="user"),
    )

    async def fake_chat_service(forced_request, authorization=None):
        assert forced_request.context.role == "admin"
        return ChatResponse(message="\uad00\ub9ac\uc790 \uc548\ub0b4", actions=[])

    with patch(
        "pupoo_ai.app.api.routers.chatbot.chat_service",
        new=AsyncMock(side_effect=fake_chat_service),
    ):
        response = await handle_internal_admin_chat(request, authorization="Bearer token")

    assert response["success"] is True
    assert response["data"]["message"] == "\uad00\ub9ac\uc790 \uc548\ub0b4"


@pytest.mark.asyncio
async def test_user_service_uses_user_prompt():
    request = ChatRequest(message="\uc548\ub155")

    with patch(
        "pupoo_ai.app.features.chatbot.service.chatbot_service.invoke_bedrock",
        new=AsyncMock(return_value=""),
    ) as mocked_invoke:
        response = await chat(request)

    assert "\ubb34\uc5c7\uc744 \ub3c4\uc640\ub4dc\ub9b4\uae4c\uc694?" in response.message
    assert mocked_invoke.await_args.kwargs["system_prompt"] == USER_SYSTEM_PROMPT


@pytest.mark.asyncio
async def test_user_name_question_returns_puri_identity():
    request = ChatRequest(message="\ub108 \uc774\ub984\uc774 \ubb50\uc57c?")

    response = await chat(request)

    assert "\ud478\ub9ac" in response.message
    assert response.actions == []


@pytest.mark.asyncio
async def test_admin_service_uses_admin_prompt():
    request = ChatRequest(
        message="\ubd84\uc704\uae30\ub97c \uc9e7\uac8c \uc124\uba85\ud574\uc918",
        context=ChatContext(role="admin"),
    )

    with patch(
        "pupoo_ai.app.features.chatbot.service.chatbot_service.IntentAnalyzer.analyze",
        return_value=None,
    ), patch(
        "pupoo_ai.app.features.chatbot.service.chatbot_service.invoke_bedrock",
        new=AsyncMock(return_value=""),
    ) as mocked_invoke:
        response = await chat(request)

    assert "\ubb34\uc5c7\uc744 \ub3c4\uc640\ub4dc\ub9b4\uae4c\uc694?" in response.message
    assert mocked_invoke.await_args.kwargs["system_prompt"] == SYSTEM_PROMPT
