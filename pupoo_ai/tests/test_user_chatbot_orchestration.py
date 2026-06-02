import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

sys.path.append(str(Path(__file__).resolve().parents[2]))

from pupoo_ai.app.features.chatbot.dto.request import ChatContext, ChatRequest, MessageItem  # noqa: E402
from pupoo_ai.app.features.chatbot.service.chatbot_service import chat  # noqa: E402


class UserChatbotOrchestrationTest(unittest.IsolatedAsyncioTestCase):
    async def test_user_event_query_returns_summary_and_actions(self):
        request = ChatRequest(message="진행 중인 행사 알려줘")

        with patch(
            "pupoo_ai.app.features.chatbot.service.chatbot_service.BackendApiClient.list_events",
            new=AsyncMock(
                return_value=[
                    {
                        "eventId": 3,
                        "eventName": "코리아 펫 엑스포",
                        "location": "킨텍스",
                        "startAt": "2026-03-10T09:00:00",
                        "endAt": "2026-03-30T18:00:00",
                        "status": "ONGOING",
                        "description": "전국의 반려동물 기업과 보호자가 함께하는 엑스포입니다.",
                    }
                ]
            ),
        ), patch(
            "pupoo_ai.app.features.chatbot.service.chatbot_service.BackendApiClient.list_programs",
            new=AsyncMock(
                return_value=[
                    {
                        "programId": 1611,
                        "eventId": 3,
                        "programTitle": "반려견 행동 교정 클래스",
                        "category": "SESSION",
                        "startAt": "2026-03-29T11:00:00",
                        "endAt": "2026-03-29T12:00:00",
                        "ongoing": True,
                        "upcoming": False,
                        "ended": False,
                        "participantCount": 28,
                    }
                ]
            ),
        ), patch(
            "pupoo_ai.app.features.chatbot.service.chatbot_service.invoke_bedrock",
            new=AsyncMock(return_value="LLM fallback"),
        ) as mocked_invoke:
            response = await chat(request)

        self.assertIn("코리아 펫 엑스포", response.message)
        action_types = [action.type for action in response.actions]
        self.assertIn("SHOW_SUMMARY", action_types)
        self.assertIn("NAVIGATE", action_types)
        self.assertIn("SEND_MESSAGE", action_types)
        mocked_invoke.assert_not_awaited()

    async def test_user_follow_up_location_uses_recent_event_history(self):
        request = ChatRequest(
            message="장소는 어디야?",
            history=[
                MessageItem(
                    role="assistant",
                    content="코리아 펫 엑스포 행사로 안내해드릴게요. 일정과 프로그램도 함께 볼 수 있어요.",
                )
            ],
        )

        with patch(
            "pupoo_ai.app.features.chatbot.service.chatbot_service.BackendApiClient.list_events",
            new=AsyncMock(
                return_value=[
                    {
                        "eventId": 3,
                        "eventName": "코리아 펫 엑스포",
                        "location": "킨텍스",
                        "startAt": "2026-03-10T09:00:00",
                        "endAt": "2026-03-30T18:00:00",
                        "status": "ONGOING",
                    }
                ]
            ),
        ), patch(
            "pupoo_ai.app.features.chatbot.service.chatbot_service.BackendApiClient.list_programs",
            new=AsyncMock(return_value=[]),
        ), patch(
            "pupoo_ai.app.features.chatbot.service.chatbot_service.invoke_bedrock",
            new=AsyncMock(return_value="LLM fallback"),
        ) as mocked_invoke:
            response = await chat(request)

        self.assertIn("코리아 펫 엑스포", response.message)
        self.assertIn("킨텍스", response.message)
        mocked_invoke.assert_not_awaited()

    async def test_user_follow_up_location_uses_context_memory_without_history(self):
        request = ChatRequest(
            message="장소는 어디야?",
            context=ChatContext(
                lastEventId=3,
                lastEventName="코리아 펫 엑스포",
                lastTopic="event",
                lastSummaryType="event",
            ),
        )

        with patch(
            "pupoo_ai.app.features.chatbot.service.chatbot_service.BackendApiClient.list_events",
            new=AsyncMock(
                return_value=[
                    {
                        "eventId": 3,
                        "eventName": "코리아 펫 엑스포",
                        "location": "킨텍스",
                        "startAt": "2026-03-10T09:00:00",
                        "endAt": "2026-03-30T18:00:00",
                        "status": "ONGOING",
                    }
                ]
            ),
        ), patch(
            "pupoo_ai.app.features.chatbot.service.chatbot_service.BackendApiClient.list_programs",
            new=AsyncMock(return_value=[]),
        ), patch(
            "pupoo_ai.app.features.chatbot.service.chatbot_service.invoke_bedrock",
            new=AsyncMock(return_value="LLM fallback"),
        ) as mocked_invoke:
            response = await chat(request)

        self.assertIn("코리아 펫 엑스포", response.message)
        self.assertIn("킨텍스", response.message)
        self.assertEqual(response.context_hints["lastEventId"], 3)
        mocked_invoke.assert_not_awaited()

    async def test_user_login_help_returns_navigation_action(self):
        request = ChatRequest(message="로그인 어떻게 해?")

        with patch(
            "pupoo_ai.app.features.chatbot.service.chatbot_service.BackendApiClient.list_events",
            new=AsyncMock(return_value=[]),
        ), patch(
            "pupoo_ai.app.features.chatbot.service.chatbot_service.BackendApiClient.list_faqs",
            new=AsyncMock(return_value=[]),
        ), patch(
            "pupoo_ai.app.features.chatbot.service.chatbot_service.invoke_bedrock",
            new=AsyncMock(return_value="LLM fallback"),
        ) as mocked_invoke:
            response = await chat(request)

        navigate_routes = [
            action.payload.get("route")
            for action in response.actions
            if action.type == "NAVIGATE"
        ]
        self.assertIn("/auth/login", navigate_routes)
        self.assertIn("로그인", response.message)
        mocked_invoke.assert_not_awaited()

    async def test_user_capability_question_returns_action_menu(self):
        request = ChatRequest(
            message="푸리야 뭘 할 수 있어?",
            context=ChatContext(lastEventName="코리아 펫 엑스포"),
        )

        response = await chat(request)

        action_types = [action.type for action in response.actions]
        self.assertIn("SEND_MESSAGE", action_types)
        self.assertIn("NAVIGATE", action_types)
        self.assertIn("코리아 펫 엑스포", response.message)
        self.assertEqual(response.context_hints["lastTopic"], "capability")


if __name__ == "__main__":
    unittest.main()
