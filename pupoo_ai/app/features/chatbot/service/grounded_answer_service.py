from __future__ import annotations

from datetime import datetime
import re
from typing import Any

from pupoo_ai.app.features.chatbot.dto.request import ChatRequest, MessageItem
from pupoo_ai.app.features.chatbot.dto.response import ChatResponse
from pupoo_ai.app.features.orchestrator.backend_api_client import BackendApiClient, BackendApiError

_CURRENT_KEYWORDS = ("\uc624\ub298", "\uc9c0\uae08", "\ud604\uc7ac", "\uc9c4\ud589", "\uc6b4\uc601", "ongoing")
_UPCOMING_KEYWORDS = ("\uc608\uc815", "\ub2e4\uac00\uc624\ub294", "\ub2e4\uc74c", "upcoming")
_ENDED_KEYWORDS = ("\uc885\ub8cc", "\ub05d\ub09c", "\uc9c0\ub09c", "\ub9c8\uac10", "ended")
_EVENT_KEYWORDS = ("\ud589\uc0ac", "\uc774\ubca4\ud2b8", "\ubc15\ub78c\ud68c", "\ucd95\uc81c", "\uc5d1\uc2a4\ud3ec", "\ud398\uc5b4")
_PROGRAM_KEYWORDS = ("\ud504\ub85c\uadf8\ub7a8", "\uc138\uc158", "\uccb4\ud5d8", "\ubd80\uc2a4", "\ucf54\uc2a4")
_LOCATION_KEYWORDS = ("\uc7a5\uc18c", "\uc704\uce58", "\uc5b4\ub514")
_SCHEDULE_KEYWORDS = ("\uc77c\uc815", "\ub0a0\uc9dc", "\uc2dc\uac04", "\uc5b8\uc81c", "\uae30\uac04")
_NOTICE_KEYWORDS = ("\uacf5\uc9c0", "\uc548\ub0b4", "\uc54c\ub9bc", "\uc8fc\ucc28")
_FAQ_KEYWORDS = (
    "faq",
    "\uc790\uc8fc \ubb3b\ub294",
    "\uc9c8\ubb38",
    "\ud658\ubd88",
    "\uacb0\uc81c",
    "\uccb4\ud06c\uc778",
    "\ub85c\uadf8\uc778",
    "\ud68c\uc6d0\uac00\uc785",
    "\ub9c8\uc774\ud398\uc774\uc9c0",
    "qr",
)
_SUMMARY_KEYWORDS = ("\uc694\uc57d", "\ud604\ud669", "\uc0c1\ud669", "\uba87 \uac1c", "\uac1c\uc218", "\ud1b5\uacc4", "\uccb4\ud06c\uc778")
_RECOMMEND_KEYWORDS = ("\ucd94\ucc9c", "\ud3ec\uc778\ud2b8", "\uac15\uc870", "\uc7a5\uc810")
_GREETING_KEYWORDS = ("\uc548\ub155", "\ubc18\uac00\uc6cc", "\ud558\uc774", "hello", "hi")
_FOLLOW_UP_EVENT_KEYWORDS = ("\uadf8 \ud589\uc0ac", "\uadf8\uac70", "\uac70\uae30", "\uadf8\uacf3", "\ud574\ub2f9 \ud589\uc0ac", "\uc774\ubc88 \ud589\uc0ac")
_CAPABILITY_KEYWORDS = (
    "\ubb50 \ud560 \uc218 \uc788\uc5b4",
    "뭘 할 수 있어",
    "\ubb34\uc5c7\uc744 \ub3c4\uc640\uc918",
    "\ubb50\ud574",
    "\ub3c4\uc640\uc904 \uc218 \uc788\uc5b4",
    "\uc5b4\ub5a4 \uac78 \ud560 \uc218 \uc788\uc5b4",
    "\ud560 \uc218 \uc788\ub294 \uac8c \ubb50\uc57c",
)
_NAME_KEYWORDS = ("\uc774\ub984", "\ub204\uad6c\uc57c", "\uc790\uae30\uc18c\uac1c", "\uc815\uccb4")
_KEYWORD_CANDIDATES = (
    "\uc8fc\ucc28",
    "\ud658\ubd88",
    "\uacb0\uc81c",
    "\uccb4\ud06c\uc778",
    "\ub85c\uadf8\uc778",
    "\ud68c\uc6d0\uac00\uc785",
    "\ub9c8\uc774\ud398\uc774\uc9c0",
    "QR",
    "\ud589\uc0ac",
    "\uacf5\uc9c0",
)
_LOGIN_KEYWORDS = ("\ub85c\uadf8\uc778", "\ub85c\uadf8\uc778 \ubc29\ubc95", "\ub85c\uadf8\uc778\ud574")
_JOIN_KEYWORDS = ("\ud68c\uc6d0\uac00\uc785", "\uac00\uc785", "\uc2e0\uaddc \uac00\uc785")
_CHECKIN_KEYWORDS = ("\uccb4\ud06c\uc778", "qr", "qr \uccb4\ud06c\uc778", "\uc785\uc7a5")
_PAYMENT_KEYWORDS = ("\uacb0\uc81c", "\uad6c\ub9e4", "\uc608\ub9e4")
_REFUND_HELP_KEYWORDS = ("\ud658\ubd88", "\ucde8\uc18c", "\uacb0\uc81c \ucde8\uc18c")
_MYPAGE_KEYWORDS = ("\ub9c8\uc774\ud398\uc774\uc9c0", "\ub0b4 \uc815\ubcf4", "\ub0b4 qr", "\uc2e0\uccad \ub0b4\uc5ed")

_USER_STATUS_LABELS = {
    "ONGOING": "\uc9c4\ud589 \uc911",
    "PLANNED": "\uc608\uc815",
    "ENDED": "\uc885\ub8cc",
    "CANCELLED": "\ucde8\uc18c",
}

_USER_HELP_TOPICS = (
    ("checkin", _CHECKIN_KEYWORDS),
    ("login", _LOGIN_KEYWORDS),
    ("join", _JOIN_KEYWORDS),
    ("payment", _PAYMENT_KEYWORDS),
    ("refund", _REFUND_HELP_KEYWORDS),
    ("mypage", _MYPAGE_KEYWORDS),
)

_USER_HELP_ROUTE_META = {
    "checkin": {
        "route": "/registration/qrcheckin",
        "label": "QR 체크인 바로가기",
        "title": "QR 체크인 안내",
        "guide": "\ub9c8\uc774\ud398\uc774\uc9c0\uc5d0\uc11c QR\uc744 \ud655\uc778\ud55c \ub4a4 \ud604\uc7a5 \uc785\uad6c\uc5d0\uc11c \uc81c\uc2dc\ud558\uba74 \ub3fc\uc694.",
    },
    "login": {
        "route": "/auth/login",
        "label": "로그인 하러가기",
        "title": "로그인 안내",
        "guide": "\ub85c\uadf8\uc778 \ud654\uba74\uc5d0\uc11c \uc774\uba54\uc77c \ub610\ub294 \uc18c\uc15c \uacc4\uc815\uc73c\ub85c \uc811\uc18d\ud558\uc2e4 \uc218 \uc788\uc5b4\uc694.",
    },
    "join": {
        "route": "/auth/join/joinselect",
        "label": "회원가입 하러가기",
        "title": "회원가입 안내",
        "guide": "\uc77c\ubc18 \uac00\uc785\uacfc \uc18c\uc15c \uac00\uc785 \uc911\uc5d0\uc11c \ud3b8\ud55c \ubc29\uc2dd\uc744 \uace0\ub974\uba74 \ub3fc\uc694.",
    },
    "payment": {
        "route": "/event/current",
        "label": "행사 보러가기",
        "title": "결제 안내",
        "guide": "\ud589\uc0ac\uc5d0\uc11c \ucc38\uac00 \uc2e0\uccad\uc744 \uc9c4\ud589\ud55c \ub4a4 \uacb0\uc81c\ub85c \uc774\uc5b4\uc9c0\ub294 \uad6c\uc870\uc608\uc694.",
    },
    "refund": {
        "route": "/registration/paymenthistory",
        "label": "결제 내역 보기",
        "title": "환불 안내",
        "guide": "\uacb0\uc81c \ub0b4\uc5ed\uc5d0\uc11c \uc0c1\ud0dc\ub97c \ud655\uc778\ud558\uace0 \ud658\ubd88 \uc694\uccad \uac00\ub2a5 \uc5ec\ubd80\ub97c \ubcf4\uc2e4 \uc218 \uc788\uc5b4\uc694.",
    },
    "mypage": {
        "route": "/auth/mypage",
        "label": "마이페이지로 이동",
        "title": "마이페이지 안내",
        "guide": "\ub9c8\uc774\ud398\uc774\uc9c0\uc5d0\uc11c \ub0b4 QR, \uc2e0\uccad \ub0b4\uc5ed, \ubc18\ub824\ub3d9\ubb3c \uc815\ubcf4\ub97c \ud55c \ubc88\uc5d0 \ud655\uc778\ud560 \uc218 \uc788\uc5b4\uc694.",
    },
}


def _contains_any(text: str, keywords: tuple[str, ...]) -> bool:
    lowered = text.lower()
    return any(keyword.lower() in lowered for keyword in keywords)


def _normalize(text: str) -> str:
    return re.sub(r"[^0-9a-zA-Z\uAC00-\uD7A3]+", "", text).lower()


def _parse_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        return None


def _format_datetime(value: Any) -> str:
    parsed = _parse_datetime(value)
    if parsed is None:
        return "-"
    return f"{parsed.year}\ub144 {parsed.month}\uc6d4 {parsed.day}\uc77c {parsed:%H:%M}"


def _trim_text(text: Any, limit: int = 90) -> str:
    content = " ".join(str(text or "").split())
    if len(content) <= limit:
        return content
    return f"{content[: limit - 1]}..."


class GroundedAnswerService:
    def __init__(self, backend_client: BackendApiClient):
        self._backend_client = backend_client

    async def answer_user(self, message: str) -> str | None:
        response = await self.answer_user_structured(ChatRequest(message=message))
        return None if response is None else response.message

    async def answer_user_structured(self, request: ChatRequest) -> ChatResponse | None:
        # 행사·도움말처럼 근거 데이터를 붙일 수 있는 답변을 먼저 시도하고 이후 일반 모델로 넘긴다.
        message = request.message
        conversational_reply = self._build_user_conversational_chat_response(message, request.context)
        if conversational_reply is not None:
            return conversational_reply

        try:
            if self._is_program_query(message):
                event = await self._select_event(message, context=request.context, history=request.history)
                if event is not None:
                    programs = await self._select_programs_for_event(int(event.get("eventId") or 0))
                    return self._build_user_program_chat_response(event, programs)

            if self._is_event_query(message):
                event = await self._select_event(message, context=request.context, history=request.history)
                if event is not None:
                    programs = await self._select_programs_for_event(int(event.get("eventId") or 0))
                    return self._build_user_event_chat_response(message, event, programs)

            if _contains_any(message, _NOTICE_KEYWORDS):
                notice = await self._select_notice(message)
                if notice is not None:
                    return self._build_user_notice_chat_response(notice)

            if _contains_any(message, _FAQ_KEYWORDS) or self._is_user_help_query(message):
                topic = self._resolve_help_topic(message)
                faq = await self._select_faq(message)
                if faq is not None:
                    return self._build_user_faq_chat_response(faq, topic)
                if topic is not None:
                    return self._build_user_help_chat_response(topic)
        except BackendApiError:
            return None

        return None

    async def answer_admin(self, message: str) -> str | None:
        conversational_reply = self._build_admin_conversational_response(message)
        if conversational_reply is not None:
            return conversational_reply

        try:
            if self._is_admin_event_summary_query(message):
                summary = await self._backend_client.get_ai_summary()
                event = await self._select_event(message)
                if event is not None:
                    return self._build_admin_summary_response(message, event, summary)

            if _contains_any(message, _NOTICE_KEYWORDS):
                notice = await self._select_notice(message)
                if notice is not None:
                    return self._build_admin_notice_response(notice)
        except BackendApiError:
            return None

        return None

    def _is_event_query(self, message: str) -> bool:
        return _contains_any(message, _EVENT_KEYWORDS) or _contains_any(
            message,
            _LOCATION_KEYWORDS + _SCHEDULE_KEYWORDS,
        )

    def _is_program_query(self, message: str) -> bool:
        return _contains_any(message, _PROGRAM_KEYWORDS)

    def _is_follow_up_event_query(self, message: str) -> bool:
        return _contains_any(
            message,
            _LOCATION_KEYWORDS + _SCHEDULE_KEYWORDS + _PROGRAM_KEYWORDS + _FOLLOW_UP_EVENT_KEYWORDS,
        )

    def _is_user_help_query(self, message: str) -> bool:
        return self._resolve_help_topic(message) is not None

    def _resolve_help_topic(self, message: str) -> str | None:
        for topic, keywords in _USER_HELP_TOPICS:
            if _contains_any(message, keywords):
                return topic
        return None

    def _is_admin_event_summary_query(self, message: str) -> bool:
        return self._is_event_query(message) and (
            _contains_any(message, _SUMMARY_KEYWORDS)
            or _contains_any(message, _RECOMMEND_KEYWORDS)
            or _contains_any(message, _CURRENT_KEYWORDS)
        )

    async def _select_event(
        self,
        message: str,
        *,
        context=None,
        history: list[MessageItem] | None = None,
    ) -> dict[str, Any] | None:
        # 행사 선택은 이름 직접 매칭을 우선하고, 없으면 직전 대화 맥락과 상태 의도를 순서대로 본다.
        events = await self._backend_client.list_events(size=30)
        if not events:
            return None

        matched = self._match_event_by_name(message, events)
        if matched is not None:
            return matched

        if context and self._is_follow_up_event_query(message):
            context_match = self._match_event_from_context(context, events)
            if context_match is not None:
                return context_match

        if history and self._is_follow_up_event_query(message):
            history_match = self._match_event_from_history(history, events)
            if history_match is not None:
                return history_match

        if _contains_any(message, _CURRENT_KEYWORDS):
            return self._pick_by_status(events, "ONGOING") or self._pick_by_status(events, "PLANNED")
        if _contains_any(message, _UPCOMING_KEYWORDS):
            return self._pick_by_status(events, "PLANNED") or self._pick_by_status(events, "ONGOING")
        if _contains_any(message, _ENDED_KEYWORDS):
            return self._pick_by_status(events, "ENDED")
        return self._pick_by_status(events, "ONGOING") or self._pick_by_status(events, "PLANNED") or events[0]

    async def _select_notice(self, message: str) -> dict[str, Any] | None:
        keyword = await self._extract_keyword(message)
        notices = await self._backend_client.list_notices(keyword=keyword, size=5)
        if not notices:
            return None
        return max(
            notices,
            key=lambda item: (
                self._score_notice_match(message, keyword, item),
                bool(item.get("pinned")),
                str(item.get("updatedAt") or ""),
            ),
        )

    async def _select_faq(self, message: str) -> dict[str, Any] | None:
        keyword = await self._extract_keyword(message)
        faqs = await self._backend_client.list_faqs(keyword=keyword, size=5)
        if not faqs:
            return None
        selected = max(
            faqs,
            key=lambda item: (
                self._score_text_match(
                    message,
                    keyword,
                    (
                        str(item.get("title") or ""),
                        str(item.get("createdAt") or ""),
                    ),
                ),
                str(item.get("createdAt") or ""),
            ),
        )
        return await self._backend_client.get_faq(int(selected["postId"]))

    async def _extract_keyword(self, message: str) -> str | None:
        events = await self._backend_client.list_events(size=30)
        matched = self._match_event_by_name(message, events)
        if matched is not None:
            return str(matched.get("eventName") or "")

        for candidate in _KEYWORD_CANDIDATES:
            if candidate.lower() in message.lower():
                return candidate
        return None

    def _match_event_by_name(
        self,
        message: str,
        events: list[dict[str, Any]],
    ) -> dict[str, Any] | None:
        normalized_message = _normalize(message)
        for event in events:
            event_name = str(event.get("eventName") or "")
            if event_name and _normalize(event_name) in normalized_message:
                return event
        return None

    def _match_event_from_context(
        self,
        context,
        events: list[dict[str, Any]],
    ) -> dict[str, Any] | None:
        last_event_id = getattr(context, "last_event_id", None)
        if isinstance(last_event_id, int):
            for event in events:
                if int(event.get("eventId") or 0) == last_event_id:
                    return event

        last_event_name = str(getattr(context, "last_event_name", "") or "")
        if last_event_name:
            return self._match_event_by_name(last_event_name, events)

        return None

    def _match_event_from_history(
        self,
        history: list[MessageItem],
        events: list[dict[str, Any]],
    ) -> dict[str, Any] | None:
        # "거기 장소는?" 같은 후속 질문은 직전 대화에서 언급한 행사를 다시 찾아 연결한다.
        for item in reversed(history):
            matched = self._match_event_by_name(item.content, events)
            if matched is not None:
                return matched
        return None

    async def _select_programs_for_event(self, event_id: int) -> list[dict[str, Any]]:
        if event_id <= 0:
            return []

        programs = await self._backend_client.list_programs(event_id, size=12)
        if not programs:
            return []

        ongoing = [program for program in programs if bool(program.get("ongoing"))]
        upcoming = [program for program in programs if bool(program.get("upcoming"))]
        ended = [program for program in programs if bool(program.get("ended"))]
        ordered = ongoing or upcoming or ended or programs
        ordered.sort(key=lambda item: _parse_datetime(item.get("startAt")) or datetime.max)
        return ordered[:4]

    def _pick_by_status(self, events: list[dict[str, Any]], status: str) -> dict[str, Any] | None:
        filtered = [event for event in events if str(event.get("status") or "").upper() == status]
        if not filtered:
            return None

        if status == "PLANNED":
            filtered.sort(key=lambda item: _parse_datetime(item.get("startAt")) or datetime.max)
        elif status == "ENDED":
            filtered.sort(
                key=lambda item: _parse_datetime(item.get("endAt")) or datetime.min,
                reverse=True,
            )
        else:
            filtered.sort(key=lambda item: _parse_datetime(item.get("endAt")) or datetime.max)
        return filtered[0]

    def _score_notice_match(self, message: str, keyword: str | None, notice: dict[str, Any]) -> int:
        return self._score_text_match(
            message,
            keyword,
            (
                str(notice.get("title") or ""),
                str(notice.get("content") or ""),
                str(notice.get("eventName") or ""),
            ),
        )

    def _score_text_match(
        self,
        message: str,
        keyword: str | None,
        fields: tuple[str, ...],
    ) -> int:
        normalized_message = _normalize(message)
        score = 0
        candidates = [candidate for candidate in (keyword, *self._message_terms(message)) if candidate]
        weighted_fields = tuple(enumerate(fields))

        for index, field in weighted_fields:
            normalized_field = _normalize(field)
            if not normalized_field:
                continue

            for candidate in candidates:
                normalized_candidate = _normalize(candidate)
                if not normalized_candidate:
                    continue
                if normalized_candidate in normalized_field:
                    score += max(1, 6 - index * 2)
                if normalized_field and normalized_field in normalized_message:
                    score += 2

        return score

    def _message_terms(self, message: str) -> tuple[str, ...]:
        terms = []
        for candidate in _KEYWORD_CANDIDATES:
            if candidate.lower() in message.lower():
                terms.append(candidate)
        return tuple(dict.fromkeys(terms))

    def _build_user_conversational_response(self, message: str) -> str | None:
        if _contains_any(message, _NAME_KEYWORDS):
            return (
                "\uc800\ub294 \ud478\ub9ac\uc608\uc694. "
                "\ud589\uc0ac \uc548\ub0b4, \uccb4\ud06c\uc778, \ub85c\uadf8\uc778, \uacb0\uc81c\u00b7\ud658\ubd88, "
                "\ub9c8\uc774\ud398\uc774\uc9c0 \uc774\uc6a9 \uac19\uc740 \uac78 \ub3c4\uc640\ub4dc\ub9b4 \uc218 \uc788\uc5b4\uc694."
            )

        if _contains_any(message, _CAPABILITY_KEYWORDS):
            return (
                "\uc9c0\uae08 \ud478\ub9ac\uac00 \ub3c4\uc640\ub4dc\ub9b4 \uc218 \uc788\ub294 \uac74 "
                "\uc9c4\ud589 \uc911 \ud589\uc0ac, \uc77c\uc815\u00b7\uc7a5\uc18c, QR \uccb4\ud06c\uc778, \ub85c\uadf8\uc778/\ud68c\uc6d0\uac00\uc785, "
                "\uacb0\uc81c\u00b7\ud658\ubd88, \ub9c8\uc774\ud398\uc774\uc9c0 \uc774\uc6a9 \uc548\ub0b4\uc608\uc694. "
                "\uad81\uae08\ud55c \uac78 \ud558\ub098\ub9cc \ub9d0\ud574 \uc8fc\uc2dc\uba74 \ubc14\ub85c \uc774\uc5b4\uc11c \uc548\ub0b4\ud574\ub4dc\ub9b4\uac8c\uc694."
            )

        if _contains_any(message, _GREETING_KEYWORDS):
            return (
                "\uc548\ub155\ud558\uc138\uc694, \ud478\ub9ac\uc608\uc694. "
                "\uc9c0\uae08 \uc9c4\ud589 \uc911\uc778 \ud589\uc0ac \uc548\ub0b4\ubd80\ud130 \uccb4\ud06c\uc778, \uacb0\uc81c, \ud658\ubd88, \ub9c8\uc774\ud398\uc774\uc9c0 \uc774\uc6a9\uae4c\uc9c0 \ubc14\ub85c \ub3c4\uc640\ub4dc\ub9b4\uac8c\uc694."
            )

        return None

    def _build_user_conversational_chat_response(self, message: str, context) -> ChatResponse | None:
        conversational_reply = self._build_user_conversational_response(message)
        if conversational_reply is None:
            return None

        last_event_name = str(getattr(context, "last_event_name", "") or "")
        topic = "intro"
        if _contains_any(message, _CAPABILITY_KEYWORDS):
            topic = "capability"
        elif _contains_any(message, _GREETING_KEYWORDS):
            topic = "greeting"
        elif _contains_any(message, _NAME_KEYWORDS):
            topic = "identity"

        if last_event_name and topic in {"greeting", "capability"}:
            conversational_reply = (
                f"{conversational_reply} \ubc29\uae08 \ubcf4\ub358 {last_event_name} \ud589\uc0ac\ub3c4 \uc774\uc5b4\uc11c \uc548\ub0b4\ud574\ub4dc\ub9b4 \uc218 \uc788\uc5b4\uc694."
            )

        actions = [
            self._prompt_action("\uc9c4\ud589 \uc911\uc778 \ud589\uc0ac \uc54c\ub824\uc918", "\uc9c0\uae08 \uc9c4\ud589 \uc911\uc778 \ud589\uc0ac \uc54c\ub824\uc918"),
            self._prompt_action("\ud504\ub85c\uadf8\ub7a8 \ucd94\ucc9c", "\uc9c0\uae08 \ucc38\uc5ec\ud558\uae30 \uc88b\uc740 \ud504\ub85c\uadf8\ub7a8 \ucd94\ucc9c\ud574\uc918"),
            self._prompt_action("\uccb4\ud06c\uc778 \ubc29\ubc95", "\uccb4\ud06c\uc778 \uc5b4\ub5bb\uac8c \ud574?"),
            self._prompt_action("\uacb0\uc81c\u00b7\ud658\ubd88 \uc548\ub0b4", "\uacb0\uc81c\ub791 \ud658\ubd88\uc740 \uc5b4\ub5bb\uac8c \ud574?"),
            self._navigate_action("\ub9c8\uc774\ud398\uc774\uc9c0", "/auth/mypage"),
        ]
        return ChatResponse(
            message=conversational_reply,
            actions=actions,
            contextHints=self._context_hints(
                topic=topic,
                summary_type="guide",
                event_name=last_event_name or None,
            ),
        )

    def _build_user_event_chat_response(
        self,
        message: str,
        event: dict[str, Any],
        programs: list[dict[str, Any]],
    ) -> ChatResponse:
        # 사용자 행사 답변은 자연어 설명과 UI 액션을 함께 내려 화면 상호작용까지 이어지게 한다.
        name = str(event.get("eventName") or "\ud589\uc0ac")
        location = str(event.get("location") or "\uc7a5\uc18c \uc815\ubcf4 \uc5c6\uc74c")
        period = self._format_period(event)
        status = str(event.get("status") or "").upper()

        if _contains_any(message, _LOCATION_KEYWORDS):
            reply = f"{name} \ud589\uc0ac \uc7a5\uc18c\ub294 {location}\uc785\ub2c8\ub2e4. \uc77c\uc815\uc740 {period}\uc785\ub2c8\ub2e4."
        elif _contains_any(message, _SCHEDULE_KEYWORDS):
            reply = f"{name} \ud589\uc0ac \uc77c\uc815\uc740 {period}\uc785\ub2c8\ub2e4. \uc7a5\uc18c\ub294 {location}\uc5d0\uc11c \uc9c4\ud589\ub3fc\uc694."
        elif _contains_any(message, _CURRENT_KEYWORDS) and status != "ONGOING":
            reply = (
                "\ud604\uc7ac \ubc14\ub85c \uc6b4\uc601 \uc911\uc778 \ud589\uc0ac\ub294 \ud655\uc778\ub418\uc9c0 \uc54a\uc558\uc5b4\uc694. "
                f"\ub300\uc2e0 \uac00\uc7a5 \uac00\uae4c\uc6b4 \ud589\uc0ac\ub85c {name}\uc744 \uc548\ub0b4\ud574\ub4dc\ub9b4\uac8c\uc694."
            )
        else:
            reply = f"{name} \ud589\uc0ac\ub97c \uae30\uc900\uc73c\ub85c \uc548\ub0b4\ud574\ub4dc\ub9b4\uac8c\uc694. \uc7a5\uc18c\ub294 {location}\uc774\uace0 \uc77c\uc815\uc740 {period}\uc785\ub2c8\ub2e4."

        summary = {
            "summaryType": "event",
            "eventId": int(event.get("eventId") or 0),
            "eventName": name,
            "title": f"{name} \uc548\ub0b4",
            "items": [
                {"label": "\ud589\uc0ac\uba85", "value": name},
                {"label": "\uc0c1\ud0dc", "value": _USER_STATUS_LABELS.get(status, status or "-")},
                {"label": "\uc7a5\uc18c", "value": location},
                {"label": "\uc77c\uc815", "value": period},
            ],
            "sections": [],
        }
        if programs:
            summary["sections"].append(self._build_program_section(programs))

        actions = [
            {"type": "SHOW_SUMMARY", "payload": summary},
            self._prompt_action("\uc7a5\uc18c\ub9cc \ub2e4\uc2dc \ubcf4\uae30", f"{name} \uc7a5\uc18c \uc54c\ub824\uc918"),
            self._prompt_action("\ud504\ub85c\uadf8\ub7a8 \ucd94\ucc9c", f"{name} \ud504\ub85c\uadf8\ub7a8 \ucd94\ucc9c\ud574\uc918"),
            self._prompt_action("\uacb0\uc81c \uc548\ub0b4", f"{name} \ud589\uc0ac \uacb0\uc81c\ub294 \uc5b4\ub5bb\uac8c \ud574?"),
            self._navigate_action("\ud504\ub85c\uadf8\ub7a8 \ubcf4\ub7ec\uac00\uae30", f"/program/all/{event.get('eventId')}"),
            self._navigate_action("\uc2e4\uc2dc\uac04 \ud604\ud669", f"/realtime/dashboard/{event.get('eventId')}"),
        ]
        return ChatResponse(
            message=reply,
            actions=actions,
            contextHints=self._context_hints(
                topic="event",
                summary_type="event",
                event_id=int(event.get("eventId") or 0),
                event_name=name,
            ),
        )

    def _build_user_program_chat_response(
        self,
        event: dict[str, Any],
        programs: list[dict[str, Any]],
    ) -> ChatResponse:
        name = str(event.get("eventName") or "\ud589\uc0ac")

        if not programs:
            return ChatResponse(
                message=f"{name} \ud589\uc0ac\uc758 \ud504\ub85c\uadf8\ub7a8\uc740 \ud654\uba74\uc5d0\uc11c \ud655\uc778\ud558\ub294 \uac8c \uac00\uc7a5 \uc815\ud655\ud574\uc694. \ubc14\ub85c \uc774\ub3d9\ud560 \uc218 \uc788\ub3c4\ub85d \ubc84\ud2bc\uc744 \ud568\uaed8 \ub4dc\ub9b4\uac8c\uc694.",
                actions=[
                    self._navigate_action("\ud504\ub85c\uadf8\ub7a8 \ubcf4\ub7ec\uac00\uae30", f"/program/all/{event.get('eventId')}"),
                    self._navigate_action("\ud589\uc0ac \ubcf4\ub7ec\uac00\uae30", "/event/current"),
                ],
                contextHints=self._context_hints(
                    topic="program",
                    summary_type="program",
                    event_id=int(event.get("eventId") or 0),
                    event_name=name,
                ),
            )

        summary = {
            "summaryType": "program",
            "eventId": int(event.get("eventId") or 0),
            "eventName": name,
            "title": f"{name} \ucd94\ucc9c \ud504\ub85c\uadf8\ub7a8",
            "items": [
                {"label": "\ud589\uc0ac", "value": name},
                {"label": "\ucd94\ucc9c \uac1c\uc218", "value": len(programs)},
            ],
            "sections": [self._build_program_section(programs)],
        }
        reply = f"{name} \ud589\uc0ac\uc5d0\uc11c \uc9c0\uae08 \ubcf4\uae30 \uc88b\uc740 \ud504\ub85c\uadf8\ub7a8\uc744 \ucd94\ub824\uc11c \uc815\ub9ac\ud574\ub4dc\ub838\uc5b4\uc694. \uc544\ub798 \uc694\uc57d\uacfc \ubc14\ub85c\uac00\uae30\ub97c \ud568\uaed8 \ubcf4\uc138\uc694."
        actions = [
            {"type": "SHOW_SUMMARY", "payload": summary},
            self._navigate_action("\ud504\ub85c\uadf8\ub7a8 \uc804\uccb4 \ubcf4\uae30", f"/program/all/{event.get('eventId')}"),
            self._navigate_action("\uc2e4\uc2dc\uac04 \ud604\ud669", f"/realtime/dashboard/{event.get('eventId')}"),
            self._prompt_action("\ud589\uc0ac \uc7a5\uc18c \ub2e4\uc2dc \ubcf4\uae30", f"{name} \uc7a5\uc18c \uc54c\ub824\uc918"),
        ]
        return ChatResponse(
            message=reply,
            actions=actions,
            contextHints=self._context_hints(
                topic="program",
                summary_type="program",
                event_id=int(event.get("eventId") or 0),
                event_name=name,
            ),
        )

    def _build_user_notice_chat_response(self, notice: dict[str, Any]) -> ChatResponse:
        title = str(notice.get("title") or "\ucd5c\uc2e0 \uacf5\uc9c0")
        content = _trim_text(notice.get("content") or "", limit=120)
        event_name = str(notice.get("eventName") or "")
        notice_id = notice.get("noticeId") or notice.get("postId")

        summary = {
            "summaryType": "notice",
            "noticeId": int(notice_id or 0),
            "title": title,
            "items": [
                {"label": "\uacf5\uc9c0", "value": title},
                {"label": "\uad00\ub828 \ud589\uc0ac", "value": event_name or "\uc804\uccb4 \uc548\ub0b4"},
                {"label": "\ud575\uc2ec", "value": content},
            ],
            "sections": [],
        }
        actions = [{"type": "SHOW_SUMMARY", "payload": summary}]
        if isinstance(notice_id, int) and notice_id > 0:
            actions.append(self._navigate_action("\uacf5\uc9c0 \uc0c1\uc138 \ubcf4\uae30", f"/community/notice/{notice_id}"))
        actions.append(self._navigate_action("\uacf5\uc9c0 \ubaa9\ub85d \ubcf4\uae30", "/community/notice"))

        if event_name:
            reply = f"'{title}' \uacf5\uc9c0\ub97c \uba3c\uc800 \ubcf4\uc2dc\uba74 \uc88b\uc5b4\uc694. {event_name} \uad00\ub828 \uc548\ub0b4\uc774\uace0 \ud575\uc2ec \ub0b4\uc6a9\uc740 {content}"
        else:
            reply = f"'{title}' \uacf5\uc9c0\ub97c \uba3c\uc800 \ud655\uc778\ud574 \ubcf4\uc138\uc694. \ud575\uc2ec \ub0b4\uc6a9\uc740 {content}"
        return ChatResponse(
            message=reply,
            actions=actions,
            contextHints=self._context_hints(
                topic="notice",
                summary_type="notice",
                notice_id=int(notice_id or 0),
            ),
        )

    def _build_user_faq_chat_response(self, faq: dict[str, Any], topic: str | None) -> ChatResponse:
        title = str(faq.get("title") or "\uad00\ub828 FAQ")
        answer = _trim_text(faq.get("answerContent") or faq.get("content") or "", limit=140)
        summary = {
            "summaryType": "faq",
            "faqId": int(faq.get("postId") or 0),
            "topic": topic or "faq",
            "title": title,
            "items": [
                {"label": "FAQ", "value": title},
                {"label": "\ud575\uc2ec \uc548\ub0b4", "value": answer},
            ],
            "sections": [],
        }
        actions = [{"type": "SHOW_SUMMARY", "payload": summary}]
        actions.extend(self._build_help_actions(topic))
        return ChatResponse(
            message=f"'{title}' FAQ\ub97c \uae30\uc900\uc73c\ub85c \uc548\ub0b4\ud574\ub4dc\ub9b4\uac8c\uc694. \ud575\uc2ec\uc740 {answer}",
            actions=actions,
            contextHints=self._context_hints(
                topic=topic or "faq",
                summary_type="faq",
                faq_id=int(faq.get("postId") or 0),
            ),
        )

    def _build_user_help_chat_response(self, topic: str) -> ChatResponse:
        # 도움말 주제는 관련 화면으로 바로 이동할 수 있게 액션 중심으로 응답한다.
        meta = _USER_HELP_ROUTE_META[topic]
        summary = {
            "summaryType": "guide",
            "topic": topic,
            "title": meta["title"],
            "items": [
                {"label": "\uc548\ub0b4", "value": meta["guide"]},
            ],
            "sections": [],
        }
        actions = [
            {"type": "SHOW_SUMMARY", "payload": summary},
            self._navigate_action(meta["label"], meta["route"]),
        ]
        if topic == "login":
            actions.append(self._navigate_action("\ud68c\uc6d0\uac00\uc785 \ud558\ub7ec\uac00\uae30", "/auth/join/joinselect"))
        elif topic == "join":
            actions.append(self._navigate_action("\ub85c\uadf8\uc778 \ud558\ub7ec\uac00\uae30", "/auth/login"))

        return ChatResponse(
            message=meta["guide"],
            actions=actions,
            contextHints=self._context_hints(
                topic=topic,
                summary_type="guide",
            ),
        )

    def _build_program_section(self, programs: list[dict[str, Any]]) -> dict[str, Any]:
        return {
            "key": "programs",
            "title": "\ucd94\ucc9c \ud504\ub85c\uadf8\ub7a8",
            "items": [
                {
                    "label": str(program.get("programTitle") or "\ud504\ub85c\uadf8\ub7a8"),
                    "value": self._format_program_schedule(program),
                    "meta": self._format_program_meta(program),
                }
                for program in programs
            ],
        }

    def _format_program_schedule(self, program: dict[str, Any]) -> str:
        start = _parse_datetime(program.get("startAt"))
        end = _parse_datetime(program.get("endAt"))
        if start is None and end is None:
            return "\uc2dc\uac04 \uc815\ubcf4 \uc5c6\uc74c"
        if start is not None and end is not None:
            return f"{start:%m/%d %H:%M} ~ {end:%H:%M}"
        target = start or end
        return target.strftime("%m/%d %H:%M")

    def _format_program_meta(self, program: dict[str, Any]) -> str:
        category = str(program.get("category") or "").replace("_", " ").strip()
        participant_count = int(program.get("participantCount") or 0)
        parts = []
        if category:
            parts.append(category)
        if participant_count > 0:
            parts.append(f"\ucc38\uc5ec {participant_count}\uba85")
        return " \u00b7 ".join(parts)

    def _format_period(self, event: dict[str, Any]) -> str:
        return (
            f"{_format_datetime(event.get('startAt'))}\ubd80\ud130 "
            f"{_format_datetime(event.get('endAt'))}\uae4c\uc9c0"
        )

    def _build_help_actions(self, topic: str | None) -> list[dict[str, Any]]:
        if topic is None or topic not in _USER_HELP_ROUTE_META:
            return [self._navigate_action("FAQ \ubcf4\uae30", "/community/faq")]
        meta = _USER_HELP_ROUTE_META[topic]
        return [self._navigate_action(meta["label"], meta["route"])]

    def _context_hints(
        self,
        *,
        topic: str | None = None,
        summary_type: str | None = None,
        event_id: int | None = None,
        event_name: str | None = None,
        notice_id: int | None = None,
        faq_id: int | None = None,
    ) -> dict[str, Any]:
        hints: dict[str, Any] = {}
        if topic:
            hints["lastTopic"] = topic
        if summary_type:
            hints["lastSummaryType"] = summary_type
        if isinstance(event_id, int) and event_id > 0:
            hints["lastEventId"] = event_id
        if event_name:
            hints["lastEventName"] = event_name
        if isinstance(notice_id, int) and notice_id > 0:
            hints["lastNoticeId"] = notice_id
        if isinstance(faq_id, int) and faq_id > 0:
            hints["lastFaqId"] = faq_id
        return hints

    def _navigate_action(self, label: str, route: str) -> dict[str, Any]:
        return {"type": "NAVIGATE", "payload": {"label": label, "route": route}}

    def _prompt_action(self, label: str, prompt: str) -> dict[str, Any]:
        return {"type": "SEND_MESSAGE", "payload": {"label": label, "prompt": prompt}}

    def _build_admin_conversational_response(self, message: str) -> str | None:
        if _contains_any(message, _NAME_KEYWORDS):
            return (
                "\uc800\ub294 \ub204\ub9ac\uc608\uc694. "
                "\ud589\uc0ac \uc694\uc57d, \ud654\uba74 \uc774\ub3d9 \uc548\ub0b4, \uacf5\uc9c0\u00b7\uc54c\ub9bc \ucd08\uc548, "
                "\uc6b4\uc601 \ud604\ud669 \ud30c\uc545\uc744 \ub3c4\uc640\ub4dc\ub9b4 \uc218 \uc788\uc5b4\uc694."
            )

        return None

    def _build_user_event_response(self, event: dict[str, Any], *, prefer_current: bool) -> str:
        status = str(event.get("status") or "")
        name = str(event.get("eventName") or "\ud589\uc0ac")
        location = str(event.get("location") or "\uc7a5\uc18c \uc815\ubcf4 \uc5c6\uc74c")
        period = (
            f"{_format_datetime(event.get('startAt'))}\ubd80\ud130 "
            f"{_format_datetime(event.get('endAt'))}\uae4c\uc9c0"
        )

        if prefer_current and status != "ONGOING":
            return (
                "\ud604\uc7ac \uc9c4\ud589 \uc911\uc778 \ud589\uc0ac\ub294 \ubc14\ub85c \ud655\uc778\ub418\uc9c0 "
                f"\uc54a\uc558\uc2b5\ub2c8\ub2e4. \uac00\uc7a5 \uac00\uae4c\uc6b4 \ud589\uc0ac\ub294 {name}\uc774\uace0 "
                f"\uc7a5\uc18c\ub294 {location}\uc785\ub2c8\ub2e4. \uc77c\uc815\uc740 {period}\uc785\ub2c8\ub2e4."
            )

        return f"{name} \ud589\uc0ac\uac00 \ud655\uc778\ub410\uace0 \uc7a5\uc18c\ub294 {location}\uc785\ub2c8\ub2e4. \uc77c\uc815\uc740 {period}\uc785\ub2c8\ub2e4."

    def _build_user_notice_response(self, notice: dict[str, Any]) -> str:
        title = str(notice.get("title") or "\ucd5c\uc2e0 \uacf5\uc9c0")
        content = _trim_text(notice.get("content") or "")
        event_name = str(notice.get("eventName") or "")
        if event_name:
            return (
                f"\uac00\uc7a5 \uba3c\uc800 \ud655\uc778\ud560 \uacf5\uc9c0\ub294 '{title}'\uc785\ub2c8\ub2e4. "
                f"{event_name} \uad00\ub828 \uc548\ub0b4\uc774\uace0 \ud575\uc2ec \ub0b4\uc6a9\uc740 {content}"
            )
        return f"\uac00\uc7a5 \uba3c\uc800 \ud655\uc778\ud560 \uacf5\uc9c0\ub294 '{title}'\uc785\ub2c8\ub2e4. \ud575\uc2ec \ub0b4\uc6a9\uc740 {content}"

    def _build_user_faq_response(self, faq: dict[str, Any]) -> str:
        title = str(faq.get("title") or "\uad00\ub828 FAQ")
        answer = _trim_text(faq.get("answerContent") or faq.get("content") or "")
        return f"\uad00\ub828 FAQ\ub85c\ub294 '{title}'\uac00 \uc788\uc2b5\ub2c8\ub2e4. \ub2f5\ubcc0 \ud575\uc2ec\uc740 {answer}"

    def _build_admin_summary_response(
        self,
        message: str,
        event: dict[str, Any],
        summary: dict[str, Any],
    ) -> str:
        congestion = summary.get("congestion") or {}
        ongoing_count = int(congestion.get("ongoingEventCount") or 0)
        today_checkins = int(congestion.get("todayCheckinCount") or 0)
        name = str(event.get("eventName") or "\ud589\uc0ac")
        location = str(event.get("location") or "\uc7a5\uc18c \uc815\ubcf4 \uc5c6\uc74c")
        period = (
            f"{_format_datetime(event.get('startAt'))}\ubd80\ud130 "
            f"{_format_datetime(event.get('endAt'))}\uae4c\uc9c0"
        )
        description = _trim_text(
            event.get("description")
            or "\ud589\uc0ac \uc18c\uac1c \uc815\ubcf4\ub294 \ubcc4\ub3c4\ub85c \ud655\uc778\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.",
            limit=80,
        )

        if _contains_any(message, _RECOMMEND_KEYWORDS):
            return (
                f"\ud604\uc7ac \uc6b4\uc601 \uc911\uc778 \ud589\uc0ac \uc608\uc2dc\ub85c\ub294 {name}\uac00 \uc788\uace0 "
                f"\uc7a5\uc18c\ub294 {location}, \uc77c\uc815\uc740 {period}\uc785\ub2c8\ub2e4. "
                f"\uc6b4\uc601 \uc548\ub0b4\uc5d0\uc11c \uac15\uc870\ud560 \ucd94\ucc9c \ud3ec\uc778\ud2b8\ub294 {description}"
            )

        return (
            f"\ud604\uc7ac \uc9c4\ud589 \uc911\uc778 \ud589\uc0ac\ub294 {ongoing_count}\uac74\uc774\uace0 "
            f"\uc624\ub298 \uccb4\ud06c\uc778\uc740 {today_checkins}\uac74\uc785\ub2c8\ub2e4. "
            f"\ub300\ud45c \uc608\uc2dc\ub85c\ub294 {name}\uac00 \uc788\uc73c\uba70 \uc7a5\uc18c\ub294 {location}, "
            f"\uc77c\uc815\uc740 {period}\uc785\ub2c8\ub2e4."
        )

    def _build_admin_notice_response(self, notice: dict[str, Any]) -> str:
        title = str(notice.get("title") or "\ucd5c\uc2e0 \uacf5\uc9c0")
        content = _trim_text(notice.get("content") or "")
        return (
            f"\uad00\ub9ac\uc6a9 \ucc38\uace0 \uacf5\uc9c0\ub294 '{title}'\uc785\ub2c8\ub2e4. "
            f"\ubc14\ub85c \uacf5\uc720\ud560 \ud575\uc2ec \ubb38\uad6c\ub294 {content}"
        )
