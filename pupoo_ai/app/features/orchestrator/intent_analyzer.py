from __future__ import annotations

import re
from dataclasses import dataclass, field

from pupoo_ai.app.features.chatbot.dto.request import ChatContext
from pupoo_ai.app.features.orchestrator.slot_extractor import SlotExtractor


SYNONYM_REPLACEMENTS: tuple[tuple[str, str], ...] = (
    ("보여줘", "조회"),
    ("보여", "조회"),
    ("알려줘", "조회"),
    ("알려", "조회"),
    ("조회해줘", "조회"),
    ("써줘", "작성"),
    ("써", "작성"),
    ("만들어줘", "작성"),
    ("만들어", "작성"),
    ("만들", "작성"),
    ("생성", "작성"),
    ("등록", "작성"),
    ("올려줘", "발행"),
    ("올려", "발행"),
    ("발행", "발행"),
    ("저장해줘", "저장"),
    ("저장", "저장"),
    ("보내줘", "발송"),
    ("보내", "발송"),
    ("전송", "발송"),
    ("날려줘", "발송"),
    ("날려", "발송"),
    ("가줘", "이동"),
    ("열어줘", "이동"),
    ("열어", "이동"),
)

KEYWORD_GROUPS: dict[str, tuple[str, ...]] = {
    "congestion": ("행사현황", "혼잡", "붐비", "대기", "체크인", "현황"),
    "applicants": ("참가자", "참가자수", "신청자", "신청", "등록", "접수"),
    "refund": ("환불", "취소"),
    "notice": ("공지", "공지사항", "공지문"),
    "notification": ("알림", "메시지", "안내"),
    "event": ("행사", "이벤트"),
    "broadcast": ("전체", "전원", "브로드캐스트", "전체공지", "전체알림"),
    "query": ("조회", "요약", "정리", "현황", "상태", "통계", "얼마", "보기"),
    "navigate": ("이동", "화면", "페이지", "가기", "열어", "보기"),
    "create": ("작성", "초안", "문구"),
    "update": ("수정", "고쳐", "바꿔", "편집", "업데이트"),
    "hide": ("숨김", "숨겨", "내려", "비공개", "감춰"),
    "delete": ("삭제", "지워", "없애"),
    "execute": ("저장", "발행", "발송", "실행", "확인", "진행"),
    "schedule": ("예약", "예약발송"),
    "capabilities": ("기능", "가능", "지원", "무엇", "뭐", "capabilities"),
    "dashboard": ("대시보드", "메인", "홈"),
    "notice_page": ("공지관리", "공지페이지", "공지화면", "공지작성"),
    "notification_page": ("알림관리", "알림페이지", "알림화면"),
    "event_page": ("행사관리", "행사페이지", "이벤트관리", "이벤트페이지", "행사등록"),
    "refund_page": ("환불관리", "환불페이지", "환불화면"),
}


@dataclass(slots=True)
class IntentResult:
    intent_type: str
    target: str
    action_key: str
    requires_confirmation: bool = False
    slots: dict = field(default_factory=dict)
    score: int = 0
    confidence: str = "low"


@dataclass(slots=True)
class Candidate:
    action_key: str
    intent_type: str
    target: str
    threshold: int
    requires_confirmation: bool = False
    score: int = 0


class IntentAnalyzer:
    def __init__(self) -> None:
        self._slot_extractor = SlotExtractor()

    def analyze(self, message: str, context: ChatContext | None = None) -> IntentResult | None:
        normalized = self._normalize(message)
        if not normalized:
            return None

        if "\ucc38\uac00\uc790" in normalized and any(
            term in normalized for term in ("\uc54c\ub824", "\ubcf4\uc5ec", "\uc870\ud68c", "\ud604\ud669", "\uc815\ub9ac")
        ):
            return IntentResult(
                intent_type="summary",
                target="applicants",
                action_key="applicants_get",
                score=4,
                confidence="medium",
            )

        if "\uac00\uc790" in normalized:
            compact_for_navigation = self._compact(normalized)
            if "\uacf5\uc9c0\uad00\ub9ac" in compact_for_navigation:
                return IntentResult(intent_type="navigation", target="notice", action_key="navigate_notice_manage", score=4, confidence="medium")
            if "\uc54c\ub9bc\uad00\ub9ac" in compact_for_navigation:
                return IntentResult(intent_type="navigation", target="notification", action_key="navigate_notification_manage", score=4, confidence="medium")
            if "\ud658\ubd88\uad00\ub9ac" in compact_for_navigation:
                return IntentResult(intent_type="navigation", target="refund", action_key="navigate_refund_manage", score=4, confidence="medium")

        compact = self._compact(normalized)
        scored = [candidate for candidate in self._score_candidates(compact, context) if candidate.score > 0]
        if not scored:
            rescued = self._rescue_partial_intent(message, compact, context)
            return rescued

        scored.sort(key=lambda candidate: candidate.score, reverse=True)
        best = scored[0]
        second = scored[1] if len(scored) > 1 else None

        if second is not None and best.score >= best.threshold and second.score >= second.threshold and best.score - second.score <= 1:
            return IntentResult(
                intent_type="ambiguous",
                target="unknown",
                action_key="ambiguous",
                score=best.score,
                confidence="medium",
            )

        if best.score < best.threshold:
            rescued = self._rescue_partial_intent(message, compact, context)
            if rescued is not None:
                return rescued
            return IntentResult(
                intent_type="low_confidence",
                target="unknown",
                action_key="low_confidence",
                score=best.score,
                confidence="low",
            )

        slots = self._slot_extractor.extract(message, context, best.action_key).slots
        confidence = "high" if best.score >= best.threshold + 2 else "medium"
        return IntentResult(
            intent_type=best.intent_type,
            target=best.target,
            action_key=best.action_key,
            requires_confirmation=best.requires_confirmation,
            slots=slots,
            score=best.score,
            confidence=confidence,
        )

    def _score_candidates(self, compact: str, context: ChatContext | None) -> list[Candidate]:
        return [
            Candidate("notification_schedule_send", "unsupported", "schedule_notification", threshold=3, score=self._score_schedule(compact)),
            Candidate("capabilities_get", "summary", "capabilities", threshold=3, score=self._score_capabilities(compact)),
            Candidate("navigate_dashboard", "navigation", "dashboard", threshold=4, score=self._score_navigation(compact, "dashboard")),
            Candidate("navigate_notice_manage", "navigation", "notice", threshold=4, score=self._score_navigation(compact, "notice_page")),
            Candidate("navigate_notification_manage", "navigation", "notification", threshold=4, score=self._score_navigation(compact, "notification_page")),
            Candidate("navigate_event_manage", "navigation", "event", threshold=4, score=self._score_navigation(compact, "event_page")),
            Candidate("navigate_refund_manage", "navigation", "refund", threshold=4, score=self._score_navigation(compact, "refund_page")),
            Candidate("summary_get", "summary", "congestion", threshold=4, score=self._score_summary(compact, "congestion")),
            Candidate("applicants_get", "summary", "applicants", threshold=4, score=self._score_summary(compact, "applicants")),
            Candidate("refund_get", "summary", "refund", threshold=4, score=self._score_summary(compact, "refund")),
            Candidate("prefill_notice_form", "draft", "notice", threshold=5, score=self._score_notice_draft(compact)),
            Candidate("prefill_notification_form", "draft", "notification", threshold=5, score=self._score_notification_draft(compact)),
            Candidate("notice_create", "execute", "save_notice", threshold=6, requires_confirmation=True, score=self._score_notice_execute(compact, context, "create")),
            Candidate("notice_update", "execute", "save_notice", threshold=6, requires_confirmation=True, score=self._score_notice_execute(compact, context, "update")),
            Candidate("notice_hide", "execute", "save_notice", threshold=6, requires_confirmation=True, score=self._score_notice_execute(compact, context, "hide")),
            Candidate("notification_draft_create", "execute", "save_notification_draft", threshold=6, requires_confirmation=True, score=self._score_notification_execute(compact, context, "draft_create")),
            Candidate("notification_draft_update", "execute", "save_notification_draft", threshold=6, requires_confirmation=True, score=self._score_notification_execute(compact, context, "draft_update")),
            Candidate("notification_draft_delete", "execute", "delete_notification_draft", threshold=7, requires_confirmation=True, score=self._score_notification_execute(compact, context, "delete")),
            Candidate("notification_draft_send", "execute", "send_notification_draft", threshold=7, requires_confirmation=True, score=self._score_notification_execute(compact, context, "draft_send")),
            Candidate("notification_event_send", "execute", "send_event_notification", threshold=7, requires_confirmation=True, score=self._score_notification_execute(compact, context, "event_send")),
            Candidate("notification_broadcast_send", "execute", "send_broadcast_notification", threshold=7, requires_confirmation=True, score=self._score_notification_execute(compact, context, "broadcast_send")),
        ]

    def _score_schedule(self, compact: str) -> int:
        return self._group_score(compact, "schedule", 2) + self._group_score(compact, "notification", 1) + self._group_score(compact, "execute", 1)

    def _score_capabilities(self, compact: str) -> int:
        return self._group_score(compact, "capabilities", 2)

    def _score_navigation(self, compact: str, page_group: str) -> int:
        return self._group_score(compact, "navigate", 2) + self._group_score(compact, page_group, 3)

    def _score_summary(self, compact: str, entity_group: str) -> int:
        return self._group_score(compact, entity_group, 2) + self._group_score(compact, "query", 2)

    def _score_notice_draft(self, compact: str) -> int:
        score = self._group_score(compact, "notice", 2) + self._group_score(compact, "create", 2)
        if self._contains_any(compact, ("초안", "하나", "작성")):
            score += 1
        return score

    def _score_notification_draft(self, compact: str) -> int:
        score = self._group_score(compact, "notification", 2) + self._group_score(compact, "create", 2)
        if self._contains_any(compact, ("초안", "하나", "작성")):
            score += 1
        return score

    def _score_notice_execute(self, compact: str, context: ChatContext | None, mode: str) -> int:
        score = self._group_score(compact, "notice", 2) + self._group_score(compact, "execute", 2)
        if mode == "create":
            score += self._contains_any(compact, ("저장", "발행")) * 2
        if mode == "update":
            score += self._group_score(compact, "update", 3)
            if context and context.notice_draft is not None and context.notice_draft.notice_id is not None:
                score += 3
        if mode == "hide":
            score += self._group_score(compact, "hide", 3)
            if context and context.notice_draft is not None and context.notice_draft.notice_id is not None:
                score += 2
        return score

    def _score_notification_execute(self, compact: str, context: ChatContext | None, mode: str) -> int:
        score = self._group_score(compact, "notification", 2) + self._group_score(compact, "execute", 2)
        if mode == "draft_create":
            score += self._group_score(compact, "create", 2)
            if self._contains_any(compact, ("저장", "초안", "작성")):
                score += 2
            if context and context.notification_draft is not None and context.notification_draft.notification_id is None:
                score += 1
        if mode == "draft_update":
            score += self._group_score(compact, "update", 3)
            if self._contains_any(compact, ("저장", "수정", "변경")):
                score += 2
            if context and context.notification_draft is not None and context.notification_draft.notification_id is not None:
                score += 3
        if mode == "delete":
            score += self._group_score(compact, "delete", 3)
            if context and context.notification_draft is not None and context.notification_draft.notification_id is not None:
                score += 1
        if mode == "draft_send":
            if context and context.notification_draft is not None and context.notification_draft.notification_id is not None:
                score += 3
            if self._contains_any(compact, ("초안", "저장된", "임시저장")):
                score += 3
        if mode == "event_send":
            score += self._group_score(compact, "event", 2)
            if re.search(r"(?:행사|이벤트)(?:id)?\d+|\d+번(?:행사|이벤트)", compact):
                score += 3
        if mode == "broadcast_send":
            score += self._group_score(compact, "broadcast", 3)
            if self._contains_any(compact, ("전체알림", "전체공지", "전원알림")):
                score += 2
        return score

    def _rescue_partial_intent(self, message: str, compact: str, context: ChatContext | None) -> IntentResult | None:
        if any(term in compact for term in ("\ucc38\uac00\uc790", "\ucc38\uac00\uc790\uc218", "\uc2e0\uccad\uc790", "\uc2e0\uccad")) and (
            any(term in compact for term in ("\uc870\ud68c", "\ud604\ud669", "\uc815\ub9ac", "\ubcf4\uae30")) or "\uc218" in compact
        ):
            return IntentResult(
                intent_type="summary",
                target="applicants",
                action_key="applicants_get",
                score=4,
                confidence="medium",
            )

        if self._contains_any(compact, KEYWORD_GROUPS["notification"]):
            if self._contains_any(compact, ("작업", "처리")) and not self._contains_any(compact, KEYWORD_GROUPS["execute"]):
                return IntentResult(
                    intent_type="ambiguous",
                    target="notification",
                    action_key="ambiguous",
                    score=4,
                    confidence="medium",
                    slots={"domain": "notification", "operation": "manage"},
                )
            if self._contains_any(compact, KEYWORD_GROUPS["execute"]):
                if self._contains_any(compact, KEYWORD_GROUPS["event"]):
                    return self._build_rescued_execute(message, context, action_key="notification_event_send", target="send_event_notification", score=6)
                if self._contains_any(compact, KEYWORD_GROUPS["broadcast"]):
                    return self._build_rescued_execute(message, context, action_key="notification_broadcast_send", target="send_broadcast_notification", score=6)
                rescued = self._build_rescued_execute(message, context, action_key="notification_broadcast_send", target="send_broadcast_notification", score=5)
                rescued.slots["deliveryScope"] = "unknown"
                return rescued

        if self._contains_any(compact, KEYWORD_GROUPS["notice"]):
            if self._contains_any(compact, ("관련", "처리", "작업")) and not (
                self._contains_any(compact, KEYWORD_GROUPS["update"])
                or self._contains_any(compact, KEYWORD_GROUPS["hide"])
                or self._contains_any(compact, KEYWORD_GROUPS["create"])
            ):
                return IntentResult(
                    intent_type="ambiguous",
                    target="notice",
                    action_key="ambiguous",
                    score=4,
                    confidence="medium",
                    slots={"domain": "notice", "operation": "manage"},
                )
            if self._contains_any(compact, KEYWORD_GROUPS["update"]):
                return self._build_rescued_execute(message, context, action_key="notice_update", target="save_notice", score=5)
            if self._contains_any(compact, KEYWORD_GROUPS["hide"]):
                return self._build_rescued_execute(message, context, action_key="notice_hide", target="save_notice", score=5)

        return None

    def _build_rescued_execute(
        self,
        message: str,
        context: ChatContext | None,
        *,
        action_key: str,
        target: str,
        score: int,
    ) -> IntentResult:
        slots = self._slot_extractor.extract(message, context, action_key).slots
        return IntentResult(
            intent_type="execute",
            target=target,
            action_key=action_key,
            requires_confirmation=True,
            slots=slots,
            score=score,
            confidence="medium",
        )

    def _group_score(self, compact: str, group_name: str, weight: int) -> int:
        return weight if self._contains_any(compact, KEYWORD_GROUPS[group_name]) else 0

    def _contains_any(self, compact: str, terms: tuple[str, ...]) -> bool:
        return any(term in compact for term in terms)

    def _normalize(self, message: str) -> str:
        normalized = str(message or "").lower().strip()
        for source, target in SYNONYM_REPLACEMENTS:
            normalized = normalized.replace(source, target)
        return normalized

    def _compact(self, message: str) -> str:
        return re.sub(r"[\s\W_]+", "", message)
