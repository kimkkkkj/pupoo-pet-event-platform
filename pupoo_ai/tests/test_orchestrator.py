import sys
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[2]))

from pupoo_ai.app.features.chatbot.dto.request import (  # noqa: E402
    ChatContext,
    ExecutionContext,
    NoticeDraftContext,
    NotificationDraftContext,
)
from pupoo_ai.app.features.orchestrator.action_planner import ActionPlanner, validate_action_executable  # noqa: E402
from pupoo_ai.app.features.orchestrator.handlers import ExecuteActionHandler, SummaryActionHandler  # noqa: E402
from pupoo_ai.app.features.orchestrator.intent_analyzer import IntentAnalyzer  # noqa: E402


class IntentAnalyzerTest(unittest.TestCase):
    def setUp(self):
        self.analyzer = IntentAnalyzer()

    def test_summary_congestion_phrase(self):
        result = self.analyzer.analyze("행사 현황 보여줘")
        self.assertIsNotNone(result)
        self.assertEqual(result.intent_type, "summary")
        self.assertEqual(result.action_key, "summary_get")
        self.assertEqual(result.target, "congestion")

    def test_summary_applicants_phrase(self):
        result = self.analyzer.analyze("\ucc38\uac00\uc790 \uc218 \uc54c\ub824\uc918")
        self.assertIsNotNone(result)
        self.assertEqual(result.intent_type, "summary")
        self.assertEqual(result.action_key, "applicants_get")

    def test_notice_draft_phrase(self):
        result = self.analyzer.analyze("공지 하나 만들어줘")
        self.assertIsNotNone(result)
        self.assertEqual(result.intent_type, "draft")
        self.assertEqual(result.action_key, "prefill_notice_form")

    def test_event_notification_phrase(self):
        result = self.analyzer.analyze("행사 12번 알림 보내줘")
        self.assertIsNotNone(result)
        self.assertEqual(result.intent_type, "execute")
        self.assertEqual(result.action_key, "notification_event_send")
        self.assertEqual(result.confidence, "high")
        self.assertEqual(result.slots["eventId"], 12)
        self.assertEqual(result.slots["targetType"], "EVENT")
        self.assertEqual(result.slots["targetId"], 12)

    def test_generic_notification_send_phrase_prefers_execute(self):
        result = self.analyzer.analyze("알림 보내기")
        self.assertIsNotNone(result)
        self.assertEqual(result.intent_type, "execute")
        self.assertEqual(result.action_key, "notification_broadcast_send")
        self.assertEqual(result.slots["deliveryScope"], "unknown")

    def test_event_notification_without_event_id_prefers_validation_path(self):
        result = self.analyzer.analyze("행사 알림 보내기")
        self.assertIsNotNone(result)
        self.assertEqual(result.intent_type, "execute")
        self.assertEqual(result.action_key, "notification_event_send")
        self.assertEqual(result.confidence, "medium")

    def test_notice_update_without_target_prefers_validation_path(self):
        result = self.analyzer.analyze("공지 수정해줘")
        self.assertIsNotNone(result)
        self.assertEqual(result.intent_type, "execute")
        self.assertEqual(result.action_key, "notice_update")

    def test_notice_hide_without_target_prefers_validation_path(self):
        result = self.analyzer.analyze("공지 숨겨줘")
        self.assertIsNotNone(result)
        self.assertEqual(result.intent_type, "execute")
        self.assertEqual(result.action_key, "notice_hide")

    def test_notice_related_phrase_is_ambiguous(self):
        result = self.analyzer.analyze("공지 관련 처리해줘")
        self.assertIsNotNone(result)
        self.assertEqual(result.intent_type, "ambiguous")

    def test_notification_related_phrase_is_ambiguous(self):
        result = self.analyzer.analyze("알림 작업 해줘")
        self.assertIsNotNone(result)
        self.assertEqual(result.intent_type, "ambiguous")

    def test_navigate_notice_manage_phrase(self):
        result = self.analyzer.analyze("공지 관리 화면 열어줘")
        self.assertIsNotNone(result)
        self.assertEqual(result.intent_type, "navigation")
        self.assertEqual(result.action_key, "navigate_notice_manage")

    def test_navigate_notification_manage_phrase(self):
        result = self.analyzer.analyze("알림 관리로 가자")
        self.assertIsNotNone(result)
        self.assertEqual(result.intent_type, "navigation")
        self.assertEqual(result.action_key, "navigate_notification_manage")


class ActionPlannerValidationTest(unittest.TestCase):
    def test_notice_update_without_notice_id_is_validation(self):
        result = validate_action_executable(
            "notice_update",
            {},
            {"title": "안내", "content": "본문", "pinned": False, "status": "DRAFT"},
            {"notice": {"supportedExecuteTypes": ["SAVE_NOTICE"]}, "notification": {"supportedExecuteTypes": []}},
        )
        self.assertEqual(result["status"], "validation")
        self.assertEqual(result["missingFields"], ["noticeId"])

    def test_notification_send_without_target_scope_is_validation(self):
        result = validate_action_executable(
            "notification_broadcast_send",
            {"deliveryScope": "unknown"},
            {"title": "", "content": "", "notificationType": "NOTICE"},
            {"notice": {"supportedExecuteTypes": []}, "notification": {"supportedExecuteTypes": ["SEND_BROADCAST_NOTIFICATION"]}},
        )
        self.assertEqual(result["status"], "validation")
        self.assertIn("targetScope", result["missingFields"])

    def test_event_notification_target_mismatch_is_validation(self):
        result = validate_action_executable(
            "notification_event_send",
            {},
            {
                "title": "행사 알림",
                "content": "본문",
                "eventId": 12,
                "type": "NOTICE",
                "targetType": "USER",
                "targetId": 99,
            },
            {"notice": {"supportedExecuteTypes": []}, "notification": {"supportedExecuteTypes": ["SEND_EVENT_NOTIFICATION"]}},
        )
        self.assertEqual(result["status"], "validation")
        self.assertEqual(result["missingFields"], ["targetType", "targetId"])

    def test_planner_keeps_event_and_broadcast_capabilities_available(self):
        planned = ActionPlanner().plan(
            IntentAnalyzer().analyze("행사 알림 보내기"),
            ChatContext(),
        )
        supported = set(planned.metadata["capabilities"]["notification"]["supportedExecuteTypes"])
        self.assertIn("SEND_EVENT_NOTIFICATION", supported)
        self.assertIn("SEND_BROADCAST_NOTIFICATION", supported)


class FakeBackendClient:
    def __init__(self):
        self.created_notice_body = None
        self.updated_notice_id = None
        self.updated_notice_body = None
        self.deleted_notification_id = None
        self.created_notification_body = None
        self.updated_notification_id = None
        self.updated_notification_body = None
        self.sent_notification_id = None
        self.sent_event_body = None
        self.sent_broadcast_body = None

    async def get_ai_summary(self):
        return {
            "congestion": {
                "ongoingEventCount": 2,
                "plannedEventCount": 3,
                "endedEventCount": 1,
                "todayCheckinCount": 21,
            },
            "applicants": {
                "eventRegistrations": {
                    "appliedCount": 10,
                    "approvedCount": 8,
                    "rejectedCount": 1,
                    "cancelledCount": 1,
                    "activeCount": 7,
                },
                "programApplies": {
                    "appliedCount": 6,
                    "waitingCount": 2,
                    "approvedCount": 3,
                    "rejectedCount": 1,
                    "cancelledCount": 0,
                    "checkedInCount": 2,
                    "activeCount": 3,
                },
            },
            "notices": {"publishedCount": 6, "draftCount": 3, "hiddenCount": 2},
            "notifications": {"draftCount": 5, "sentCount": 15},
            "refunds": {"totalCount": 9, "requestedCount": 3, "approvedCount": 2, "rejectedCount": 1, "completedCount": 3},
        }

    async def get_ai_capabilities(self):
        return {
            "actions": [
                {"action": "notice_create", "supported": True},
                {"action": "notification_schedule_send", "supported": False},
            ]
        }

    async def create_notice(self, body):
        self.created_notice_body = body
        return {"noticeId": 101, "status": body["status"]}

    async def update_notice(self, notice_id, body):
        self.updated_notice_id = notice_id
        self.updated_notice_body = body
        return {"noticeId": notice_id, "status": body["status"]}

    async def create_notification_draft(self, body):
        self.created_notification_body = body
        return {"id": 301, **body}

    async def update_notification_draft(self, notification_id, body):
        self.updated_notification_id = notification_id
        self.updated_notification_body = body
        return {"id": notification_id, **body}

    async def delete_notification_draft(self, notification_id):
        self.deleted_notification_id = notification_id
        return {"deleted": True}

    async def send_notification(self, notification_id):
        self.sent_notification_id = notification_id
        return {"id": notification_id, "status": "SENT"}

    async def send_event_notification(self, body):
        self.sent_event_body = body
        return {"sent": True}

    async def send_broadcast_notification(self, body):
        self.sent_broadcast_body = body
        return {"sent": True}


class SummaryActionHandlerTest(unittest.IsolatedAsyncioTestCase):
    async def test_summary_handler_returns_cards(self):
        planned = ActionPlanner().plan(IntentAnalyzer().analyze("행사 현황 보여줘"), ChatContext())
        response = await SummaryActionHandler().handle(planned, FakeBackendClient())
        self.assertEqual(response.actions[0].type, "SHOW_SUMMARY")
        self.assertEqual(response.actions[0].payload["items"][0]["value"], 2)


class ExecuteActionHandlerTest(unittest.IsolatedAsyncioTestCase):
    async def test_prepare_generic_notification_send_returns_validation(self):
        planned = ActionPlanner().plan(IntentAnalyzer().analyze("알림 보내기"), ChatContext())
        response = ExecuteActionHandler().prepare(planned, ChatContext())
        self.assertEqual(response.message_type, "validation")

    async def test_prepare_event_notification_without_event_id_returns_validation(self):
        planned = ActionPlanner().plan(IntentAnalyzer().analyze("행사 알림 보내기"), ChatContext())
        response = ExecuteActionHandler().prepare(planned, ChatContext())
        self.assertEqual(response.message_type, "validation")
        self.assertEqual(response.actions[0].type, "PREFILL_FORM")

    async def test_prepare_notice_update_without_target_returns_validation(self):
        planned = ActionPlanner().plan(IntentAnalyzer().analyze("공지 수정해줘"), ChatContext())
        response = ExecuteActionHandler().prepare(planned, ChatContext())
        self.assertEqual(response.message_type, "validation")

    async def test_confirm_notice_create_uses_backend_create(self):
        backend = FakeBackendClient()
        response = await ExecuteActionHandler().confirm(
            {
                "executeType": "SAVE_NOTICE",
                "actionKey": "notice_create",
                "payload": {
                    "scope": "ALL",
                    "title": "안내",
                    "content": "본문",
                    "pinned": False,
                    "status": "DRAFT",
                },
            },
            backend,
        )
        self.assertEqual(backend.created_notice_body["title"], "안내")
        self.assertEqual(response.message, "공지 저장이 완료됐어요.")

    async def test_confirm_notice_hide_uses_backend_update(self):
        backend = FakeBackendClient()
        response = await ExecuteActionHandler().confirm(
            {
                "executeType": "SAVE_NOTICE",
                "actionKey": "notice_hide",
                "payload": {
                    "noticeId": 11,
                    "title": "기존 공지",
                    "content": "본문",
                    "pinned": False,
                    "status": "HIDDEN",
                },
            },
            backend,
        )
        self.assertEqual(backend.updated_notice_id, 11)
        self.assertEqual(backend.updated_notice_body["status"], "HIDDEN")
        self.assertEqual(response.message, "공지 저장이 완료됐어요.")

    async def test_confirm_event_notification_sends_safe_target(self):
        backend = FakeBackendClient()
        response = await ExecuteActionHandler().confirm(
            {
                "executeType": "SEND_EVENT_NOTIFICATION",
                "actionKey": "notification_event_send",
                "payload": {
                    "type": "NOTICE",
                    "title": "행사 안내",
                    "content": "본문",
                    "eventId": 12,
                    "targetType": "EVENT",
                    "targetId": 12,
                },
            },
            backend,
        )
        self.assertEqual(backend.sent_event_body["eventId"], 12)
        self.assertEqual(backend.sent_event_body["targetType"], "EVENT")
        self.assertIn("발송", response.message)

    async def test_confirm_broadcast_notification_sends_body(self):
        backend = FakeBackendClient()
        response = await ExecuteActionHandler().confirm(
            {
                "executeType": "SEND_BROADCAST_NOTIFICATION",
                "actionKey": "notification_broadcast_send",
                "payload": {
                    "type": "NOTICE",
                    "title": "전체 공지",
                    "content": "본문",
                },
            },
            backend,
        )
        self.assertEqual(backend.sent_broadcast_body["title"], "전체 공지")
        self.assertIn("발송", response.message)


if __name__ == "__main__":
    unittest.main()
