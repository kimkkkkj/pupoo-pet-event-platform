from __future__ import annotations

import json

from pupoo_ai.app.features.chatbot.dto.request import ChatContext, ChatRequest, NotificationDraftContext
from pupoo_ai.app.features.chatbot.dto.response import ChatResponse
from pupoo_ai.app.features.chatbot.service.bedrock_client import generate_structured_draft
from pupoo_ai.app.features.orchestrator.action_planner import PlannedAction
from pupoo_ai.app.features.orchestrator.backend_api_client import BackendApiClient, BackendApiError

VALID_NOTICE_STATUS = {"PUBLISHED", "DRAFT", "HIDDEN"}
EVENT_NOTIFICATION_SCOPES = {"INTEREST_SUBSCRIBERS", "EVENT_REGISTRANTS", "EVENT_PAYERS"}


class NavigationActionHandler:
    def handle(self, planned_action: PlannedAction) -> ChatResponse:
        targets = {
            "dashboard": {"page": "dashboard", "route": "/admin/dashboard", "message": "대시보드 화면으로 이동할게요."},
            "notice": {"page": "notice", "route": "/admin/board/notice", "message": "공지 관리 화면으로 이동할게요."},
            "notification": {
                "page": "alertManage",
                "route": "/admin/participant/alert",
                "message": "알림 관리 화면으로 이동할게요.",
            },
            "event": {"page": "eventManage", "route": "/admin/event", "message": "행사 관리 화면으로 이동할게요."},
            "refund": {"page": "refundManage", "route": "/admin/refunds", "message": "환불 관리 화면으로 이동할게요."},
        }
        target = targets[planned_action.target]
        return ChatResponse(
            message=target["message"],
            actions=[{"type": "NAVIGATE", "payload": {"page": target["page"], "route": target["route"]}}],
        )


class SummaryActionHandler:
    async def handle(self, planned_action: PlannedAction, backend_client: BackendApiClient) -> ChatResponse:
        if planned_action.target == "capabilities":
            capabilities = await backend_client.get_ai_capabilities()
            actions = capabilities.get("actions") or []
            supported_actions = [action for action in actions if action.get("supported")]
            unsupported_actions = [action for action in actions if not action.get("supported")]
            payload = {
                "summaryType": "capabilities",
                "title": "실행 가능 작업",
                "items": [
                    {"label": "지원 작업", "value": len(supported_actions)},
                    {"label": "미지원 작업", "value": len(unsupported_actions)},
                ],
                "sections": [
                    {
                        "key": "supported",
                        "title": "현재 가능한 작업",
                        "items": [
                            {"label": action.get("action", ""), "value": action.get("method", ""), "meta": action.get("path", "")}
                            for action in supported_actions[:6]
                        ],
                    },
                    {
                        "key": "unsupported",
                        "title": "제한된 작업",
                        "items": [
                            {
                                "label": action.get("action", ""),
                                "value": "UNSUPPORTED",
                                "meta": action.get("description", ""),
                            }
                            for action in unsupported_actions[:4]
                        ],
                    },
                ],
            }
            return ChatResponse(
                message=f"현재 지원 작업은 {len(supported_actions)}개이고, 제한된 작업은 {len(unsupported_actions)}개입니다.",
                actions=[{"type": "SHOW_SUMMARY", "payload": payload}],
            )

        summary = await backend_client.get_ai_summary()

        if planned_action.target == "congestion":
            congestion = summary.get("congestion") or {}
            notices = summary.get("notices") or {}
            notifications = summary.get("notifications") or {}
            notice_total = int(notices.get("publishedCount") or 0) + int(notices.get("draftCount") or 0) + int(
                notices.get("hiddenCount") or 0
            )
            notification_total = int(notifications.get("draftCount") or 0) + int(notifications.get("sentCount") or 0)
            payload = {
                "summaryType": "congestion",
                "title": "혼잡도 요약",
                "items": [
                    {"label": "진행 중 행사", "value": int(congestion.get("ongoingEventCount") or 0)},
                    {"label": "예정 행사", "value": int(congestion.get("plannedEventCount") or 0)},
                    {"label": "종료 행사", "value": int(congestion.get("endedEventCount") or 0)},
                    {"label": "오늘 체크인", "value": int(congestion.get("todayCheckinCount") or 0)},
                ],
                "sections": [
                    {
                        "key": "notices",
                        "title": "공지 운영 현황",
                        "items": [
                            {"label": "전체 공지", "value": notice_total},
                            {"label": "게시 중", "value": int(notices.get("publishedCount") or 0)},
                            {"label": "초안", "value": int(notices.get("draftCount") or 0)},
                            {"label": "숨김", "value": int(notices.get("hiddenCount") or 0)},
                        ],
                    },
                    {
                        "key": "notifications",
                        "title": "알림 운영 현황",
                        "items": [
                            {"label": "전체 알림", "value": notification_total},
                            {"label": "초안", "value": int(notifications.get("draftCount") or 0)},
                            {"label": "발송 완료", "value": int(notifications.get("sentCount") or 0)},
                        ],
                    },
                ],
            }
            return ChatResponse(
                message=f"현재 진행 중 행사는 {payload['items'][0]['value']}건이고 오늘 체크인은 {payload['items'][3]['value']}건입니다.",
                actions=[{"type": "SHOW_SUMMARY", "payload": payload}],
            )

        if planned_action.target == "applicants":
            applicants = summary.get("applicants") or {}
            event_registrations = applicants.get("eventRegistrations") or {}
            program_applies = applicants.get("programApplies") or {}
            payload = {
                "summaryType": "applicants",
                "title": "신청자 수 요약",
                "items": [
                    {"label": "행사 신청 전체", "value": int(event_registrations.get("appliedCount") or 0)},
                    {"label": "프로그램 신청 전체", "value": int(program_applies.get("appliedCount") or 0)},
                ],
                "sections": [
                    {
                        "key": "eventRegistrations",
                        "title": "행사 신청 현황",
                        "items": [
                            {"label": "신청", "value": int(event_registrations.get("appliedCount") or 0)},
                            {"label": "승인", "value": int(event_registrations.get("approvedCount") or 0)},
                            {"label": "반려", "value": int(event_registrations.get("rejectedCount") or 0)},
                            {"label": "취소", "value": int(event_registrations.get("cancelledCount") or 0)},
                            {"label": "활성", "value": int(event_registrations.get("activeCount") or 0)},
                        ],
                    },
                    {
                        "key": "programApplies",
                        "title": "프로그램 신청 현황",
                        "items": [
                            {"label": "신청", "value": int(program_applies.get("appliedCount") or 0)},
                            {"label": "대기", "value": int(program_applies.get("waitingCount") or 0)},
                            {"label": "승인", "value": int(program_applies.get("approvedCount") or 0)},
                            {"label": "반려", "value": int(program_applies.get("rejectedCount") or 0)},
                            {"label": "취소", "value": int(program_applies.get("cancelledCount") or 0)},
                            {"label": "체크인", "value": int(program_applies.get("checkedInCount") or 0)},
                            {"label": "활성", "value": int(program_applies.get("activeCount") or 0)},
                        ],
                    },
                ],
            }
            return ChatResponse(
                message=f"행사 신청은 {payload['sections'][0]['items'][0]['value']}건, 프로그램 신청은 {payload['sections'][1]['items'][0]['value']}건입니다.",
                actions=[{"type": "SHOW_SUMMARY", "payload": payload}],
            )

        refunds = summary.get("refunds") or {}
        notices = summary.get("notices") or {}
        notifications = summary.get("notifications") or {}
        payload = {
            "summaryType": "refund",
            "title": "환불 현황 요약",
            "items": [
                {"label": "전체 환불", "value": int(refunds.get("totalCount") or 0)},
                {"label": "요청", "value": int(refunds.get("requestedCount") or 0)},
                {"label": "승인", "value": int(refunds.get("approvedCount") or 0)},
                {"label": "반려", "value": int(refunds.get("rejectedCount") or 0)},
                {"label": "완료", "value": int(refunds.get("completedCount") or 0)},
            ],
            "sections": [
                {
                    "key": "notices",
                    "title": "공지 운영 현황",
                    "items": [
                        {"label": "게시 중", "value": int(notices.get("publishedCount") or 0)},
                        {"label": "초안", "value": int(notices.get("draftCount") or 0)},
                        {"label": "숨김", "value": int(notices.get("hiddenCount") or 0)},
                    ],
                },
                {
                    "key": "notifications",
                    "title": "알림 운영 현황",
                    "items": [
                        {"label": "초안", "value": int(notifications.get("draftCount") or 0)},
                        {"label": "발송 완료", "value": int(notifications.get("sentCount") or 0)},
                    ],
                },
            ],
        }
        return ChatResponse(
            message=f"환불은 전체 {payload['items'][0]['value']}건이고 요청 {payload['items'][1]['value']}건, 완료 {payload['items'][4]['value']}건입니다.",
            actions=[{"type": "SHOW_SUMMARY", "payload": payload}],
        )


class DraftActionHandler:
    async def handle(self, planned_action: PlannedAction, request: ChatRequest) -> ChatResponse:
        if planned_action.target == "notice":
            draft = await self._build_notice_draft(request.message)
            return ChatResponse(
                message="공지 초안을 준비했습니다. 제목과 내용을 확인한 뒤 저장을 요청해 주세요.",
                actions=[
                    {
                        "type": "PREFILL_FORM",
                        "payload": {
                            "formType": "notice",
                            "page": "notice",
                            "route": "/admin/board/notice",
                            "formData": draft,
                            "execution": {
                                "supported": True,
                                "executeType": "SAVE_NOTICE",
                                "targetType": "NOTICE",
                                "status": draft.get("status"),
                                "supportedExecuteTypes": ["SAVE_NOTICE"],
                            },
                        },
                    }
                ],
            )

        draft = await self._build_notification_draft(request.message)
        execution = self._build_notification_execution(draft)
        return ChatResponse(
            message="알림 초안을 준비했습니다. 대상과 발송 방식을 확인한 뒤 다시 요청해 주세요.",
            actions=[
                {
                    "type": "PREFILL_FORM",
                    "payload": {
                        "formType": "notification",
                        "page": "alertManage",
                        "route": "/admin/participant/alert",
                        "formData": draft,
                        "execution": execution,
                    },
                }
            ],
        )

    async def _build_notice_draft(self, user_message: str) -> dict:
        prompt = (
            "관리자 공지 초안을 JSON으로 생성한다. "
            "title, content, pinned, scope, status만 사용한다. "
            "scope는 ALL 또는 EVENT, status는 DRAFT만 사용한다.\n"
            f"사용자 요청: {user_message}"
        )
        fallback = {
            "title": "행사 운영 안내",
            "content": "안녕하세요.\n행사 운영 안내 사항을 공유드립니다.\n세부 내용은 관리자 화면에서 확인해 주세요.",
            "pinned": False,
            "scope": "ALL",
            "status": "DRAFT",
        }
        return await self._generate_json(prompt, fallback)

    async def _build_notification_draft(self, user_message: str) -> dict:
        prompt = (
            "관리자 알림 초안을 JSON으로 생성한다. "
            "title, content, alertMode, recipientScopes, specialTargetKey만 사용한다. "
            "기본 alertMode는 event, recipientScopes 기본값은 [\"INTEREST_SUBSCRIBERS\"] 이다.\n"
            f"사용자 요청: {user_message}"
        )
        fallback = {
            "title": "행사 안내 알림",
            "content": "행사 관련 새로운 안내가 등록되었습니다. 자세한 내용은 관리자 공지를 확인해 주세요.",
            "alertMode": "event",
            "recipientScopes": ["INTEREST_SUBSCRIBERS"],
            "specialTargetKey": "",
        }
        return await self._generate_json(prompt, fallback)

    async def _generate_json(self, prompt: str, fallback: dict) -> dict:
        try:
            raw = await generate_structured_draft(prompt)
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                merged = dict(fallback)
                merged.update({key: value for key, value in parsed.items() if value is not None})
                return merged
        except Exception:
            return fallback
        return fallback

    def _build_notification_execution(self, draft: dict) -> dict:
        draft_context = NotificationDraftContext.model_validate(draft)
        return _build_notification_execution_payload(draft_context)


class UnsupportedActionHandler:
    def handle(self, planned_action: PlannedAction, context: ChatContext) -> ChatResponse:
        metadata = planned_action.metadata or {}
        if planned_action.target != "schedule_notification":
            return ChatResponse(
                message=metadata.get("unsupportedReason") or "현재 요청은 backend 계약 기준으로 지원되지 않습니다.",
                messageType="unsupported",
                actions=[],
            )

        actions = []
        if context.notification_draft is not None and context.notification_draft.title.strip():
            actions.append(
                {
                    "type": "PREFILL_FORM",
                    "payload": {
                        "formType": "notification",
                        "page": "alertManage",
                        "route": "/admin/participant/alert",
                        "formData": context.notification_draft.model_dump(by_alias=True),
                        "execution": {
                            "supported": False,
                            "requestedAction": "SCHEDULE_NOTIFICATION",
                            "reason": "예약 발송은 backend에서 지원하지 않습니다. 현재는 즉시 발송만 가능합니다.",
                            "unsupportedActions": ["SCHEDULE_NOTIFICATION"],
                            "supportedExecuteTypes": [],
                        },
                    },
                }
            )

        return ChatResponse(
            message="예약 발송은 현재 지원되지 않습니다. 즉시 발송 또는 초안 저장만 가능합니다.",
            messageType="unsupported",
            actions=actions,
        )


class ExecuteActionHandler:
    def validation_failure(self, message: str, actions: list[dict] | None = None) -> ChatResponse:
        return ChatResponse(message=message, messageType="validation", actions=actions or [])

    def low_confidence(self, message: str, actions: list[dict] | None = None) -> ChatResponse:
        return ChatResponse(message=message, messageType="low_confidence", actions=actions or [])

    def prepare(self, planned_action: PlannedAction, context: ChatContext) -> ChatResponse:
        preflight_response = self._handle_preflight_failure(planned_action)
        if preflight_response is not None:
            return preflight_response
        if not self._can_prepare_execute(planned_action):
            return self.validation_failure(
                "실행 요청 해석이 아직 충분히 명확하지 않습니다. 조회인지 실행인지 조금 더 구체적으로 말씀해 주세요.",
            )
        if planned_action.target == "save_notice":
            return self._prepare_notice(planned_action, context)
        if planned_action.target == "save_notification_draft":
            return self._prepare_notification(planned_action, context)
        if planned_action.target == "delete_notification_draft":
            return self._prepare_notification_delete(context)
        if planned_action.target in {
            "send_notification",
            "send_notification_draft",
            "send_event_notification",
            "send_broadcast_notification",
        }:
            return self._prepare_notification(planned_action, context)
        return self.unsupported("현재 요청한 실행은 지원되지 않습니다.")

    def unsupported(self, message: str) -> ChatResponse:
        return ChatResponse(message=message, messageType="unsupported", actions=[])

    def _can_prepare_execute(self, planned_action: PlannedAction) -> bool:
        metadata = planned_action.metadata or {}
        confidence = str(metadata.get("confidence") or "").lower()
        return confidence == "high"

    def _handle_preflight_failure(self, planned_action: PlannedAction) -> ChatResponse | None:
        metadata = planned_action.metadata or {}
        preflight = metadata.get("preflight") or {}
        status = preflight.get("status")
        if status in {None, "ok"}:
            return None

        payload = dict(metadata.get("candidate_payload") or {})
        message = preflight.get("message") or "필요한 정보가 부족해요."
        missing_fields = list(preflight.get("missingFields") or [])
        action_key = (metadata.get("action_key") or planned_action.action_key or "")

        if status == "unsupported":
            return self.unsupported(message)

        if action_key.startswith("notice_"):
            actions = [self._prefill_notice_action(payload, supported=False)] if payload else [self._navigate_notice_action()]
            if status == "low_confidence":
                return self.low_confidence(message, actions=actions)
            return self.validation_failure(message, actions=actions)

        if action_key.startswith("notification_"):
            actions = [
                self._prefill_notification_action(
                    payload,
                    supported=False,
                    missing_fields=missing_fields,
                    reason=message,
                )
            ] if payload else [self._navigate_notification_action()]
            if status == "low_confidence":
                return self.low_confidence(message, actions=actions)
            return self.validation_failure(message, actions=actions)

        if status == "low_confidence":
            return self.low_confidence(message)
        return self.validation_failure(message)

    async def confirm(self, confirmation: dict, backend_client: BackendApiClient) -> ChatResponse:
        confirmation_type = str(confirmation.get("executeType") or confirmation.get("type") or "").upper()
        payload = confirmation.get("payload") or {}

        if confirmation_type == "SAVE_NOTICE":
            status = str(payload.get("status") or "DRAFT").upper()
            if status not in VALID_NOTICE_STATUS:
                status = "DRAFT"

            body = {
                "title": payload.get("title", ""),
                "content": payload.get("content", ""),
                "pinned": bool(payload.get("pinned", False)),
                "status": status,
            }
            notice_id = payload.get("noticeId")
            if not notice_id:
                body["scope"] = payload.get("scope") or "ALL"
                body["eventId"] = payload.get("eventId")
            saved = await (
                backend_client.update_notice(int(notice_id), body)
                if notice_id
                else backend_client.create_notice(body)
            )
            saved_notice = {**payload, "noticeId": saved.get("noticeId") or notice_id, "status": str(saved.get("status") or status)}
            return ChatResponse(
                message="공지 저장이 완료됐어요.",
                actions=[
                    {
                        "type": "PREFILL_FORM",
                        "payload": {
                            "formType": "notice",
                            "page": "notice",
                            "route": "/admin/board/notice",
                            "formData": saved_notice,
                            "execution": {
                                "supported": True,
                                "executeType": "SAVE_NOTICE",
                                "targetType": "NOTICE",
                                "status": saved_notice.get("status"),
                                "supportedExecuteTypes": ["SAVE_NOTICE"],
                            },
                        },
                    }
                ],
            )

        if confirmation_type == "DELETE_NOTIFICATION_DRAFT":
            notification_id = payload.get("notificationId")
            if not notification_id:
                return self.validation_failure("삭제할 알림 초안 id가 없습니다.")
            await backend_client.delete_notification_draft(int(notification_id))
            return ChatResponse(
                message="알림 초안 삭제가 완료됐어요.",
                actions=[self._prefill_notification_action({}, supported=False, reason="삭제가 완료되어 기존 초안 정보를 유지하지 않습니다.")],
            )

        if confirmation_type == "SAVE_NOTIFICATION_DRAFT":
            draft_body = self._build_notification_draft_body(payload)
            notification_id = payload.get("notificationId")
            saved = await (
                backend_client.update_notification_draft(int(notification_id), draft_body)
                if notification_id
                else backend_client.create_notification_draft(draft_body)
            )
            saved_payload = {
                **payload,
                "notificationId": saved.get("id") or saved.get("notificationId") or notification_id,
                "title": saved.get("title") or payload.get("title", ""),
                "content": saved.get("content") or payload.get("content", ""),
                "alertMode": saved.get("alertMode") or payload.get("alertMode") or "event",
                "eventId": saved.get("eventId") if "eventId" in saved else payload.get("eventId"),
            }
            saved_payload = self._apply_event_defaults(saved_payload)
            return ChatResponse(
                message="알림 초안 저장이 완료됐어요.",
                actions=[
                    self._prefill_notification_action(
                        saved_payload,
                        supported=True,
                        execute_type="SEND_NOTIFICATION_DRAFT",
                        reason="초안 저장이 완료됐어요. 필요하면 바로 발송할 수 있어요.",
                    )
                ],
            )

        if confirmation_type == "SEND_NOTIFICATION_DRAFT":
            notification_id = payload.get("notificationId")
            if not notification_id:
                return self.validation_failure(
                    "저장된 알림 초안 id가 없습니다. 알림 관리 화면에서 초안을 먼저 저장해 주세요.",
                    actions=[self._prefill_notification_action(payload, supported=False)],
                )
            draft_body = self._build_notification_draft_body(payload)
            draft = await backend_client.update_notification_draft(int(notification_id), draft_body)
            sent = await backend_client.send_notification(int(draft.get("id") or notification_id))
            return ChatResponse(
                message=self._build_notification_success_message("저장된 초안 발송", sent),
                actions=[self._prefill_notification_action(payload, supported=False, execute_type="SEND_NOTIFICATION_DRAFT", reason="초안 발송이 완료되었습니다.")],
            )

        if confirmation_type == "SEND_EVENT_NOTIFICATION":
            event_payload = self._apply_event_defaults(payload)
            validation_error = self._validate_event_notification_payload(event_payload)
            if validation_error is not None:
                return self.validation_failure(
                    validation_error,
                    actions=[self._prefill_notification_action(event_payload, supported=False)],
                )
            sent = await backend_client.send_event_notification(self._build_event_notification_body(event_payload))
            return ChatResponse(
                message=self._build_notification_success_message("이벤트 알림 발송", sent),
                actions=[self._prefill_notification_action(event_payload, supported=False, execute_type="SEND_EVENT_NOTIFICATION", reason="이벤트 알림 발송이 완료되었습니다.")],
            )

        if confirmation_type == "SEND_BROADCAST_NOTIFICATION":
            sent = await backend_client.send_broadcast_notification(self._build_broadcast_notification_body(payload))
            return ChatResponse(
                message=self._build_notification_success_message("전체 알림 발송", sent),
                actions=[self._prefill_notification_action(payload, supported=False, execute_type="SEND_BROADCAST_NOTIFICATION", reason="전체 알림 발송이 완료되었습니다.")],
            )

        if confirmation_type == "SCHEDULE_NOTIFICATION":
            return self.unsupported("알림 예약 발송은 backend 미지원 기능입니다.")

        raise BackendApiError("지원하지 않는 확인 요청입니다.")

    def _prepare_notice(self, planned_action: PlannedAction, context: ChatContext) -> ChatResponse:
        slots = ((planned_action.metadata or {}).get("slots") or {}).copy()
        notice_capability = ((planned_action.metadata or {}).get("capabilities") or {}).get("notice") or {}
        action_key = (planned_action.metadata or {}).get("action_key") or planned_action.action_key
        draft = context.notice_draft

        if draft is None:
            return self.validation_failure(
                "공지 초안이 없습니다. 공지 내용을 먼저 작성하거나 공지 화면으로 이동해 주세요.",
                actions=[self._navigate_notice_action()],
            )

        payload = draft.model_dump(by_alias=True)
        payload.update({key: value for key, value in slots.items() if value is not None})

        if "SAVE_NOTICE" not in (notice_capability.get("supportedExecuteTypes") or []):
            return self.unsupported("현재 공지 저장은 실행 가능한 상태가 아닙니다.")
        if not str(payload.get("title") or "").strip():
            return self.validation_failure(
                "공지 제목이 비어 있습니다. 제목을 입력한 뒤 다시 요청해 주세요.",
                actions=[self._prefill_notice_action(payload, supported=False)],
            )
        if action_key in {"notice_update", "notice_hide"} and not payload.get("noticeId"):
            return self.validation_failure(
                "수정하거나 숨길 공지를 특정해야 합니다. 기존 공지를 열어 둔 상태에서 다시 요청해 주세요.",
                actions=[self._navigate_notice_action()],
            )

        execute_label = {"notice_hide": "숨김 처리", "notice_update": "수정 저장"}.get(action_key, "저장")
        return ChatResponse(
            message=f"해석 결과: 공지 {execute_label}\n- 제목: {payload.get('title')}\n- 상태: {payload.get('status') or 'DRAFT'}",
            actions=[
                {
                    "type": "CONFIRM_EXECUTE",
                    "payload": {
                        "actionKey": action_key,
                        "type": "SAVE_NOTICE",
                        "executeType": "SAVE_NOTICE",
                        "targetType": "NOTICE",
                        "payload": payload,
                    },
                }
            ],
        )

    def _prepare_notification_delete(self, context: ChatContext) -> ChatResponse:
        draft = context.notification_draft
        if draft is None or draft.notification_id is None:
            return self.validation_failure(
                "삭제할 알림 초안을 특정하지 못했습니다. 알림 관리 화면에서 초안을 선택한 뒤 다시 요청해 주세요.",
                actions=[self._navigate_notification_action()],
            )
        payload = draft.model_dump(by_alias=True)
        return ChatResponse(
            message=f"해석 결과: 알림 초안 삭제\n- notificationId: {payload.get('notificationId')}\n- 제목: {payload.get('title')}",
            actions=[
                {
                    "type": "CONFIRM_EXECUTE",
                    "payload": {
                        "actionKey": "notification_draft_delete",
                        "type": "DELETE_NOTIFICATION_DRAFT",
                        "executeType": "DELETE_NOTIFICATION_DRAFT",
                        "targetType": "NOTIFICATION_DRAFT",
                        "payload": payload,
                    },
                }
            ],
        )

    def _prepare_notification(self, planned_action: PlannedAction, context: ChatContext) -> ChatResponse:
        draft = context.notification_draft
        if draft is None or not draft.title.strip():
            return self.validation_failure(
                "알림 초안이 없습니다. 알림 문구를 먼저 작성하거나 알림 관리 화면에서 초안을 확인해 주세요.",
                actions=[self._navigate_notification_action()],
            )

        payload = draft.model_dump(by_alias=True)
        payload.update({key: value for key, value in ((planned_action.metadata or {}).get('slots') or {}).items() if value is not None})
        payload = self._apply_event_defaults(payload)

        execute_type = self._resolve_notification_execute_type(planned_action, context, payload)
        if execute_type is None:
            return self.validation_failure(
                "발송 방식을 특정하지 못했습니다. 저장된 초안 발송인지, 이벤트 알림인지, 전체 알림인지 더 구체적으로 말씀해 주세요.",
                actions=[self._prefill_notification_action(payload, supported=False)],
            )
        if execute_type == "SEND_NOTIFICATION_DRAFT" and payload.get("notificationId") is None:
            return self.validation_failure(
                "저장된 초안 발송에는 notificationId가 필요합니다. 초안을 먼저 저장한 뒤 다시 요청해 주세요.",
                actions=[self._prefill_notification_action(payload, supported=False)],
            )
        if execute_type == "SEND_EVENT_NOTIFICATION":
            validation_error = self._validate_event_notification_payload(payload)
            if validation_error is not None:
                return self.validation_failure(
                    validation_error,
                    actions=[self._prefill_notification_action(payload, supported=False)],
                )
        if execute_type == "SEND_BROADCAST_NOTIFICATION":
            missing_fields = self._collect_missing_fields(payload, ("title", "content"))
            if missing_fields:
                return self.validation_failure(
                    "전체 알림 발송에는 제목과 내용이 모두 필요합니다.",
                    actions=[self._prefill_notification_action(payload, supported=False, missing_fields=missing_fields)],
                )

        notification_capability = ((planned_action.metadata or {}).get("capabilities") or {}).get("notification") or {}
        supported_execute_types = notification_capability.get("supportedExecuteTypes") or []
        if execute_type != "SAVE_NOTIFICATION_DRAFT" and execute_type not in supported_execute_types:
            return self.validation_failure(
                "현재 초안 상태로는 이 실행을 바로 진행할 수 없습니다. 초안 정보를 다시 확인해 주세요.",
                actions=[self._prefill_notification_action(payload, supported=False)],
            )

        label = self._resolve_notification_label(execute_type)
        description = self._build_notification_description(payload, execute_type)
        return ChatResponse(
            message=f"해석 결과: {label}\n{description}",
            actions=[
                {
                    "type": "CONFIRM_EXECUTE",
                    "payload": {
                        "actionKey": (planned_action.metadata or {}).get("action_key") or planned_action.action_key,
                        "type": execute_type,
                        "executeType": execute_type,
                        "targetType": self._resolve_notification_target_type(execute_type),
                        "payload": payload,
                    },
                }
            ],
        )

    def _resolve_notification_execute_type(self, planned_action: PlannedAction, context: ChatContext, payload: dict) -> str | None:
        action_key = (planned_action.metadata or {}).get("action_key") or planned_action.action_key
        explicit_mapping = {
            "save_notification_draft": "SAVE_NOTIFICATION_DRAFT",
            "send_notification_draft": "SEND_NOTIFICATION_DRAFT",
            "send_event_notification": "SEND_EVENT_NOTIFICATION",
            "send_broadcast_notification": "SEND_BROADCAST_NOTIFICATION",
            "notification_draft_create": "SAVE_NOTIFICATION_DRAFT",
            "notification_draft_update": "SAVE_NOTIFICATION_DRAFT",
            "notification_draft_send": "SEND_NOTIFICATION_DRAFT",
            "notification_event_send": "SEND_EVENT_NOTIFICATION",
            "notification_broadcast_send": "SEND_BROADCAST_NOTIFICATION",
        }
        if planned_action.target in explicit_mapping:
            return explicit_mapping[planned_action.target]
        if action_key in explicit_mapping:
            return explicit_mapping[action_key]

        notification_capability = ((planned_action.metadata or {}).get("capabilities") or {}).get("notification") or {}
        supported_execute_types = notification_capability.get("supportedExecuteTypes") or []
        if len(supported_execute_types) == 1:
            return supported_execute_types[0]

        if context.notification_draft is not None:
            inferred = _infer_notification_execute_type(NotificationDraftContext.model_validate(payload))
            if inferred is not None:
                return inferred
        return None

    def _resolve_notification_target_type(self, execute_type: str) -> str:
        mapping = {
            "SAVE_NOTIFICATION_DRAFT": "NOTIFICATION_DRAFT",
            "SEND_NOTIFICATION_DRAFT": "NOTIFICATION_DRAFT",
            "SEND_EVENT_NOTIFICATION": "EVENT_NOTIFICATION",
            "SEND_BROADCAST_NOTIFICATION": "BROADCAST_NOTIFICATION",
            "DELETE_NOTIFICATION_DRAFT": "NOTIFICATION_DRAFT",
        }
        return mapping.get(execute_type, "NOTIFICATION")

    def _resolve_notification_label(self, execute_type: str) -> str:
        mapping = {
            "SAVE_NOTIFICATION_DRAFT": "알림 초안 저장",
            "SEND_NOTIFICATION_DRAFT": "저장된 초안 발송",
            "SEND_EVENT_NOTIFICATION": "이벤트 알림 발송",
            "SEND_BROADCAST_NOTIFICATION": "전체 알림 발송",
        }
        return mapping.get(execute_type, "알림 발송")

    def _build_notification_description(self, payload: dict, execute_type: str) -> str:
        lines = [f"- 제목: {payload.get('title') or '(없음)'}"]
        if execute_type == "SAVE_NOTIFICATION_DRAFT":
            lines.append(f"- alertMode: {payload.get('alertMode') or 'event'}")
            if payload.get("notificationId") is not None:
                lines.append(f"- notificationId: {payload.get('notificationId')}")
        if execute_type == "SEND_NOTIFICATION_DRAFT":
            lines.append(f"- notificationId: {payload.get('notificationId')}")
        if execute_type == "SEND_EVENT_NOTIFICATION":
            lines.append(f"- eventId: {payload.get('eventId')}")
            lines.append(f"- targetType: {payload.get('targetType')}")
            lines.append(f"- targetId: {payload.get('targetId')}")
        if execute_type == "SEND_BROADCAST_NOTIFICATION":
            lines.append(f"- type: {payload.get('notificationType') or 'NOTICE'}")
        return "\n".join(lines)

    def _build_notification_draft_body(self, payload: dict) -> dict:
        return {
            "title": payload.get("title", ""),
            "content": payload.get("content", ""),
            "alertMode": payload.get("alertMode") or "event",
            "eventId": payload.get("eventId"),
            "eventName": payload.get("eventName") or "",
            "eventStatus": payload.get("eventStatus") or "",
            "alertTargetLabel": payload.get("alertTargetLabel") or "",
            "specialTargetKey": payload.get("specialTargetKey") or "",
            "recipientScope": payload.get("recipientScope"),
            "recipientScopes": payload.get("recipientScopes") or [],
        }

    def _apply_event_defaults(self, payload: dict) -> dict:
        event_id = payload.get("eventId")
        if event_id is not None:
            payload.setdefault("targetType", "EVENT")
            payload.setdefault("targetId", event_id)
        payload.setdefault("channels", ["APP"])
        return payload

    def _validate_event_notification_payload(self, payload: dict) -> str | None:
        if payload.get("eventId") is None:
            return "이벤트 알림 발송에는 eventId가 필요합니다. 어느 행사를 대상으로 할지 알려주세요."
        if not payload.get("targetType"):
            return "이벤트 알림 발송 대상 유형이 없습니다. 행사 선택 후 다시 요청해 주세요."
        if payload.get("targetId") is None:
            return "이벤트 알림 발송 대상 id가 없습니다. 행사 선택 후 다시 요청해 주세요."
        return None

    def _build_event_notification_body(self, payload: dict) -> dict:
        event_id = payload.get("eventId")
        if event_id is None:
            raise BackendApiError("이벤트 알림 발송에는 eventId가 필요합니다.")

        recipient_scopes = [
            scope
            for scope in (payload.get("recipientScopes") or [])
            if str(scope).upper() in EVENT_NOTIFICATION_SCOPES
        ]
        recipient_scope = payload.get("recipientScope")
        if not recipient_scopes and recipient_scope in EVENT_NOTIFICATION_SCOPES:
            recipient_scopes = [recipient_scope]
        if not recipient_scopes:
            recipient_scopes = ["INTEREST_SUBSCRIBERS"]

        return {
            "type": payload.get("notificationType") or "EVENT",
            "title": payload.get("title", ""),
            "content": payload.get("content", ""),
            "targetType": payload.get("targetType"),
            "targetId": payload.get("targetId"),
            "eventId": event_id,
            "channels": payload.get("channels") or ["APP"],
            "recipientScope": recipient_scopes[0],
            "recipientScopes": recipient_scopes,
        }

    def _build_broadcast_notification_body(self, payload: dict) -> dict:
        missing_fields = self._collect_missing_fields(payload, ("title", "content"))
        if missing_fields:
            raise BackendApiError("전체 알림 발송에는 제목과 내용이 모두 필요합니다.")
        notification_type = payload.get("notificationType")
        alert_mode = str(payload.get("alertMode") or "").lower()
        if not notification_type:
            notification_type = "SYSTEM" if alert_mode == "system" else "NOTICE"

        return {
            "type": notification_type,
            "title": payload.get("title", ""),
            "content": payload.get("content", ""),
            "targetType": payload.get("targetType") or notification_type,
            "targetId": payload.get("targetId") or 0,
            "channels": payload.get("channels") or ["APP"],
        }

    def _build_notification_success_message(self, prefix: str, response: dict) -> str:
        target_count = response.get("targetCount")
        if target_count is None:
            return f"{prefix}이 완료되었습니다."
        return f"{prefix}이 완료되었습니다. 발송 대상 수는 {target_count}명입니다."

    def _navigate_notice_action(self) -> dict:
        return {"type": "NAVIGATE", "payload": {"page": "notice", "route": "/admin/board/notice"}}

    def _navigate_notification_action(self) -> dict:
        return {"type": "NAVIGATE", "payload": {"page": "alertManage", "route": "/admin/participant/alert"}}

    def _prefill_notice_action(self, payload: dict, supported: bool) -> dict:
        return {
            "type": "PREFILL_FORM",
            "payload": {
                "formType": "notice",
                "page": "notice",
                "route": "/admin/board/notice",
                "formData": payload,
                "execution": {
                    "supported": supported,
                    "executeType": "SAVE_NOTICE",
                    "targetType": "NOTICE",
                    "status": payload.get("status"),
                    "supportedExecuteTypes": ["SAVE_NOTICE"] if supported else [],
                },
            },
        }

    def _collect_missing_fields(self, payload: dict, fields: tuple[str, ...]) -> list[str]:
        return [field for field in fields if not str(payload.get(field) or "").strip()]

    def _prefill_notification_action(
        self,
        payload: dict,
        *,
        supported: bool = False,
        execute_type: str | None = None,
        reason: str | None = None,
        missing_fields: list[str] | None = None,
    ) -> dict:
        supported_types = [execute_type] if supported and execute_type else []
        return {
            "type": "PREFILL_FORM",
            "payload": {
                "formType": "notification",
                "page": "alertManage",
                "route": "/admin/participant/alert",
                "formData": payload,
                "execution": {
                    "supported": supported,
                    "executeType": execute_type,
                    "targetType": self._resolve_notification_target_type(execute_type or "NOTIFICATION"),
                    "reason": reason or ("추가 정보가 필요합니다. 대상과 발송 방식을 먼저 확인해 주세요." if not supported else None),
                    "missingFields": missing_fields or [],
                    "supportedExecuteTypes": supported_types,
                    "unsupportedActions": ["SCHEDULE_NOTIFICATION"],
                },
            },
        }


def _infer_notification_execute_type(draft: NotificationDraftContext) -> str | None:
    alert_mode = str(draft.alert_mode or "").lower()
    if draft.notification_id is not None:
        return "SEND_NOTIFICATION_DRAFT"
    if alert_mode == "event" and draft.event_id is not None and draft.target_type and draft.target_id is not None:
        return "SEND_EVENT_NOTIFICATION"
    if alert_mode in {"important", "system", "broadcast"}:
        return "SEND_BROADCAST_NOTIFICATION"
    return None


def _build_notification_execution_payload(draft: NotificationDraftContext) -> dict:
    execute_type = _infer_notification_execute_type(draft)
    if execute_type is None:
        return {
            "supported": False,
            "reason": "현재 초안은 backend 계약 기준으로 바로 발송할 수 없습니다.",
            "unsupportedActions": ["SCHEDULE_NOTIFICATION"],
            "supportedExecuteTypes": [],
        }

    target_type_map = {
        "SEND_NOTIFICATION_DRAFT": "NOTIFICATION_DRAFT",
        "SEND_EVENT_NOTIFICATION": "EVENT_NOTIFICATION",
        "SEND_BROADCAST_NOTIFICATION": "BROADCAST_NOTIFICATION",
    }
    return {
        "supported": True,
        "executeType": execute_type,
        "targetType": target_type_map[execute_type],
        "status": draft.status,
        "supportedExecuteTypes": [execute_type],
        "unsupportedActions": ["SCHEDULE_NOTIFICATION"],
    }
