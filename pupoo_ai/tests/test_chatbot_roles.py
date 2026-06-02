import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

sys.path.append(str(Path(__file__).resolve().parents[2]))

from pupoo_ai.app.api.routers.chatbot import handle_internal_admin_chat, handle_user_chat  # noqa: E402
from pupoo_ai.app.features.chatbot.dto.request import ChatContext, ChatRequest  # noqa: E402
from pupoo_ai.app.features.chatbot.dto.response import ChatResponse  # noqa: E402
from pupoo_ai.app.features.chatbot.service.chatbot_service import chat  # noqa: E402


class ChatbotRouterRoleTest(unittest.IsolatedAsyncioTestCase):
    async def test_public_user_route_forces_user_role(self):
        request = ChatRequest(
            message="\ud589\uc0ac \uc548\ub0b4 \uc54c\ub824\uc918",
            context=ChatContext(role="admin"),
        )

        async def fake_chat_service(forced_request, authorization=None):
            self.assertEqual(forced_request.context.role, "user")
            return ChatResponse(message="\uc0ac\uc6a9\uc790 \uc548\ub0b4", actions=[])

        with patch(
            "pupoo_ai.app.api.routers.chatbot.chat_service",
            new=AsyncMock(side_effect=fake_chat_service),
        ):
            response = await handle_user_chat(request, authorization=None)

        self.assertTrue(response["success"])
        self.assertEqual(response["data"]["message"], "\uc0ac\uc6a9\uc790 \uc548\ub0b4")

    async def test_internal_admin_route_forces_admin_role(self):
        request = ChatRequest(
            message="\uacf5\uc9c0 \uc791\uc131 \ub3c4\uc640\uc918",
            context=ChatContext(role="user"),
        )

        async def fake_chat_service(forced_request, authorization=None):
            self.assertEqual(forced_request.context.role, "admin")
            return ChatResponse(message="\uad00\ub9ac\uc790 \uc548\ub0b4", actions=[])

        with patch(
            "pupoo_ai.app.api.routers.chatbot.chat_service",
            new=AsyncMock(side_effect=fake_chat_service),
        ):
            response = await handle_internal_admin_chat(request, authorization="Bearer token")

        self.assertTrue(response["success"])
        self.assertEqual(response["data"]["message"], "\uad00\ub9ac\uc790 \uc548\ub0b4")


class ChatbotServiceRoleTest(unittest.IsolatedAsyncioTestCase):
    async def test_default_context_uses_user_prompt(self):
        request = ChatRequest(message="\uc548\ub155")

        with patch(
            "pupoo_ai.app.features.chatbot.service.chatbot_service.invoke_bedrock",
            new=AsyncMock(return_value=""),
        ) as mocked_invoke:
            response = await chat(request)

        self.assertIn("\ud478\ub9ac", response.message)
        self.assertGreater(len(response.actions), 0)
        mocked_invoke.assert_not_awaited()

    async def test_user_name_question_returns_puri_identity(self):
        request = ChatRequest(message="\ub108 \uc774\ub984\uc774 \ubb50\uc57c?")

        response = await chat(request)

        self.assertIn("\ud478\ub9ac", response.message)
        self.assertGreater(len(response.actions), 0)


if __name__ == "__main__":
    unittest.main()
