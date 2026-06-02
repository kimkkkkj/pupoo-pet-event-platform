from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from pupoo_ai.app.features.chatbot.dto.request import ChatContext


@dataclass(slots=True)
class SlotExtraction:
    slots: dict[str, Any] = field(default_factory=dict)


class SlotExtractor:
    _PREFIX_NUMBER_PATTERNS = (
        r"{prefix}(?:id)?(\d+)",
        r"(\d+)번{prefix}",
        r"{prefix}번호(\d+)",
    )

    def extract(self, message: str, context: ChatContext | None, action_key: str) -> SlotExtraction:
        compact = self._compact(message)
        slots: dict[str, Any] = {}

        if action_key.startswith("notice_"):
            slots.update(self._extract_notice_slots(compact, context))
        elif action_key.startswith("notification_"):
            slots.update(self._extract_notification_slots(compact, context, action_key))

        if action_key.startswith("navigate_"):
            slots["routeHint"] = action_key.removeprefix("navigate_")

        return SlotExtraction(slots=slots)

    def _extract_notice_slots(self, compact: str, context: ChatContext | None) -> dict[str, Any]:
        slots: dict[str, Any] = {}
        draft = context.notice_draft if context else None

        notice_id = self._extract_prefixed_number(compact, ("공지", "공지사항"))
        if notice_id is None and draft is not None and draft.notice_id is not None and self._has_reference_term(compact, ("이공지", "현재공지", "공지")):
            notice_id = draft.notice_id
        if notice_id is not None:
            slots["noticeId"] = notice_id

        if self._contains_any(compact, ("숨김", "숨겨", "내려", "비공개", "감춰")):
            slots["status"] = "HIDDEN"
        elif self._contains_any(compact, ("발행", "게시", "공개", "올려")):
            slots["status"] = "PUBLISHED"
        elif self._contains_any(compact, ("초안", "임시", "임시저장")):
            slots["status"] = "DRAFT"

        return slots

    def _extract_notification_slots(self, compact: str, context: ChatContext | None, action_key: str) -> dict[str, Any]:
        slots: dict[str, Any] = {}
        draft = context.notification_draft if context else None

        event_id = self._extract_prefixed_number(compact, ("행사", "이벤트"))
        if event_id is None and draft is not None and draft.event_id is not None and self._has_reference_term(compact, ("이행사", "행사", "이벤트")):
            event_id = draft.event_id
        if event_id is not None:
            slots["eventId"] = event_id

        notification_id = self._extract_prefixed_number(compact, ("알림", "초안"))
        if notification_id is None and draft is not None and draft.notification_id is not None and self._has_reference_term(
            compact, ("이알림", "이초안", "저장된초안", "초안")
        ):
            notification_id = draft.notification_id
        if action_key != "notification_event_send" and notification_id is not None:
            slots["notificationId"] = notification_id

        if self._contains_any(compact, ("관심구독", "관심자", "구독자")):
            slots["recipientScopes"] = ["INTEREST_SUBSCRIBERS"]
        elif self._contains_any(compact, ("신청자", "등록자")):
            slots["recipientScopes"] = ["EVENT_REGISTRANTS"]
        elif self._contains_any(compact, ("결제자", "구매자")):
            slots["recipientScopes"] = ["EVENT_PAYERS"]

        if self._contains_any(compact, ("전체", "전원", "브로드캐스트", "전체공지", "전체알림")):
            slots["alertMode"] = "important"
            slots["notificationType"] = "NOTICE"
        elif self._contains_any(compact, ("시스템", "점검", "장애안내")):
            slots["alertMode"] = "system"
            slots["notificationType"] = "SYSTEM"
        elif self._contains_any(compact, ("행사", "이벤트")):
            slots["alertMode"] = "event"
            slots["notificationType"] = "EVENT"

        if action_key == "notification_event_send" and event_id is not None:
            slots["targetType"] = "EVENT"
            slots["targetId"] = event_id

        if draft is not None:
            if draft.target_type and "targetType" not in slots:
                slots["targetType"] = draft.target_type
            if draft.target_id is not None and "targetId" not in slots:
                slots["targetId"] = draft.target_id
            if draft.channels and "channels" not in slots:
                slots["channels"] = draft.channels

        return slots

    def _extract_prefixed_number(self, compact: str, prefixes: tuple[str, ...]) -> int | None:
        for prefix in prefixes:
            for pattern in self._PREFIX_NUMBER_PATTERNS:
                match = re.search(pattern.format(prefix=re.escape(prefix)), compact)
                if match:
                    return int(match.group(1))
        return None

    def _has_reference_term(self, compact: str, terms: tuple[str, ...]) -> bool:
        return any(term in compact for term in terms)

    def _contains_any(self, compact: str, terms: tuple[str, ...]) -> bool:
        return any(term in compact for term in terms)

    def _compact(self, message: str) -> str:
        return re.sub(r"[\s\W_]+", "", str(message or "").lower())
