from dataclasses import dataclass, field
from typing import Any

from pupoo_ai.app.features.chatbot.dto.request import ChatContext
from pupoo_ai.app.features.orchestrator.intent_analyzer import IntentResult


@dataclass(slots=True)
class PlannedAction:
    intent_type: str
    target: str
    action_key: str
    requires_confirmation: bool = False
    metadata: dict = field(default_factory=dict)


def validate_action_executable(action_key: str, slots: dict, payload: dict, capabilities: dict) -> dict:
    if action_key.startswith("navigate_") or action_key in {"summary_get", "applicants_get", "refund_get", "capabilities_get"}:
        return {"status": "ok"}

    if action_key == "notification_schedule_send":
        return {"status": "unsupported", "message": "예약 발송은 지금 사용할 수 없어요."}

    notice_supported = set((capabilities.get("notice") or {}).get("supportedExecuteTypes") or [])
    notification_supported = set((capabilities.get("notification") or {}).get("supportedExecuteTypes") or [])

    if action_key in {"notice_create", "notice_update", "notice_hide"} and "SAVE_NOTICE" not in notice_supported:
        return {"status": "unsupported", "message": "공지 작업은 지금 바로 실행할 수 없어요."}

    if action_key == "notice_create":
        missing_fields = _collect_missing_fields(payload, ("scope", "title", "content", "status"), include_false=("pinned",))
        if missing_fields:
            return {"status": "validation", "message": "공지 저장에 필요한 정보가 부족해요.", "missingFields": missing_fields}
        return {"status": "ok"}

    if action_key == "notice_update":
        if payload.get("noticeId") is None:
            return {"status": "validation", "message": "수정할 공지를 먼저 선택해 주세요.", "missingFields": ["noticeId"]}
        return {"status": "ok"}

    if action_key == "notice_hide":
        if payload.get("noticeId") is None:
            return {"status": "validation", "message": "숨길 공지를 먼저 선택해 주세요.", "missingFields": ["noticeId"]}
        return {"status": "ok"}

    if action_key in {"notification_draft_create", "notification_draft_update"}:
        missing_fields = _collect_missing_fields(payload, ("title", "content", "alertMode"))
        if missing_fields:
            return {"status": "validation", "message": "알림 초안에 필요한 정보가 부족해요.", "missingFields": missing_fields}
        if str(payload.get("alertMode") or "").upper() == "EVENT" and payload.get("eventId") is None:
            return {"status": "validation", "message": "행사 알림 초안에는 행사 번호가 필요해요.", "missingFields": ["eventId"]}
        return {"status": "ok"}

    if action_key == "notification_draft_send":
        if "SEND_NOTIFICATION_DRAFT" not in notification_supported:
            return {"status": "unsupported", "message": "저장된 알림 초안은 지금 바로 발송할 수 없어요."}
        if payload.get("notificationId") is None:
            return {"status": "validation", "message": "발송할 알림 초안을 먼저 선택해 주세요.", "missingFields": ["notificationId"]}
        return {"status": "ok"}

    if action_key == "notification_event_send":
        if "SEND_EVENT_NOTIFICATION" not in notification_supported:
            return {"status": "unsupported", "message": "행사 알림은 지금 바로 발송할 수 없어요."}
        if slots.get("deliveryScope") == "unknown":
            return {
                "status": "validation",
                "message": "알림을 보내려면 대상이 필요해요. 전체 알림인지 행사 알림인지 선택해 주세요.",
                "missingFields": ["targetScope"],
            }
        missing_fields = _collect_missing_fields(payload, ("title", "content", "eventId"))
        if not (payload.get("notificationType") or payload.get("type")):
            missing_fields.append("type")
        if missing_fields:
            return {"status": "validation", "message": "행사 알림을 보내려면 필요한 정보가 더 있어요.", "missingFields": missing_fields}
        if payload.get("targetType") != "EVENT" or payload.get("targetId") != payload.get("eventId"):
            return {"status": "validation", "message": "행사 대상 정보가 맞지 않아요. 행사 번호를 다시 확인해 주세요.", "missingFields": ["targetType", "targetId"]}
        return {"status": "ok"}

    if action_key == "notification_broadcast_send":
        if "SEND_BROADCAST_NOTIFICATION" not in notification_supported:
            return {"status": "unsupported", "message": "전체 알림은 지금 바로 발송할 수 없어요."}
        if slots.get("deliveryScope") == "unknown":
            return {
                "status": "validation",
                "message": "알림을 보내려면 대상이 필요해요. 전체 알림인지 행사 알림인지 선택해 주세요.",
                "missingFields": ["targetScope"],
            }
        missing_fields = _collect_missing_fields(payload, ("title", "content"))
        if not (payload.get("notificationType") or payload.get("type")):
            missing_fields.append("type")
        if missing_fields:
            return {"status": "validation", "message": "전체 알림을 보내려면 제목과 내용이 필요해요.", "missingFields": missing_fields}
        return {"status": "ok"}

    if action_key == "notification_draft_delete":
        if payload.get("notificationId") is None:
            return {"status": "validation", "message": "삭제할 알림 초안을 먼저 선택해 주세요.", "missingFields": ["notificationId"]}
        return {"status": "ok"}

    return {"status": "ok"}


def _collect_missing_fields(payload: dict[str, Any], fields: tuple[str, ...], include_false: tuple[str, ...] = ()) -> list[str]:
    missing_fields = [field for field in fields if not str(payload.get(field) or "").strip()]
    for field in include_false:
        if field not in payload:
            missing_fields.append(field)
    return missing_fields


class ActionPlanner:
    def plan(self, intent: IntentResult, context: ChatContext) -> PlannedAction:
        metadata = {
            "current_page": context.current_page,
            "route": context.route,
            "action_key": intent.action_key,
            "slots": dict(intent.slots or {}),
            "score": intent.score,
            "confidence": intent.confidence,
            "capabilities": {
                "notice": self._resolve_notice_capabilities(context),
                "notification": self._resolve_notification_capabilities(context),
            },
        }

        if context.notice_draft is not None:
            metadata["notice_draft"] = context.notice_draft.model_dump(by_alias=True)
        if context.notice_execution is not None:
            metadata["notice_execution"] = context.notice_execution.model_dump(by_alias=True)
        if context.notification_draft is not None:
            metadata["notification_draft"] = context.notification_draft.model_dump(by_alias=True)
        if context.notification_execution is not None:
            metadata["notification_execution"] = context.notification_execution.model_dump(by_alias=True)
        metadata["candidate_payload"] = self._build_candidate_payload(intent.action_key, metadata)
        metadata["preflight"] = validate_action_executable(
            intent.action_key,
            metadata["slots"],
            metadata["candidate_payload"],
            metadata["capabilities"],
        )

        planned_action = PlannedAction(
            intent_type=intent.intent_type,
            target=intent.target,
            action_key=intent.action_key,
            requires_confirmation=intent.requires_confirmation,
            metadata=metadata,
        )
        return self._apply_capability_gate(planned_action)

    def _apply_capability_gate(self, planned_action: PlannedAction) -> PlannedAction:
        if planned_action.intent_type != "execute":
            return planned_action

        metadata = planned_action.metadata or {}
        preflight = metadata.get("preflight") or {}
        if preflight.get("status") == "unsupported":
            metadata["unsupportedReason"] = preflight.get("message")
            return PlannedAction("unsupported", "unsupported_capability", planned_action.action_key, False, metadata)

        return planned_action

    def _build_candidate_payload(self, action_key: str, metadata: dict) -> dict:
        slots = {key: value for key, value in (metadata.get("slots") or {}).items() if value is not None}

        if action_key.startswith("notice_"):
            payload = dict(metadata.get("notice_draft") or {})
            payload.update(slots)
            return payload

        if action_key.startswith("notification_"):
            payload = dict(metadata.get("notification_draft") or {})
            payload.update(slots)
            event_id = payload.get("eventId")
            if event_id is not None:
                payload.setdefault("targetType", "EVENT")
                payload.setdefault("targetId", event_id)
            return payload

        return dict(slots)

    def _resolve_notice_capabilities(self, context: ChatContext) -> dict:
        execution = context.notice_execution.model_dump(by_alias=True) if context.notice_execution is not None else {}
        supported_execute_types = list(execution.get("supportedExecuteTypes") or [])
        if "SAVE_NOTICE" not in supported_execute_types:
            supported_execute_types.append("SAVE_NOTICE")

        return {
            "canConfirm": bool(supported_execute_types),
            "supportedExecuteTypes": supported_execute_types,
        }

    def _resolve_notification_capabilities(self, context: ChatContext) -> dict:
        execution = context.notification_execution.model_dump(by_alias=True) if context.notification_execution is not None else {}
        supported_execute_types = list(execution.get("supportedExecuteTypes") or [])

        for execute_type in ("SEND_EVENT_NOTIFICATION", "SEND_BROADCAST_NOTIFICATION"):
            if execute_type not in supported_execute_types:
                supported_execute_types.append(execute_type)

        draft = context.notification_draft
        if draft is not None:
            alert_mode = str(draft.alert_mode or "").lower()
            if draft.notification_id is not None and "SEND_NOTIFICATION_DRAFT" not in supported_execute_types:
                supported_execute_types.append("SEND_NOTIFICATION_DRAFT")
            elif alert_mode == "event" and draft.event_id is not None and "SEND_EVENT_NOTIFICATION" not in supported_execute_types:
                supported_execute_types.append("SEND_EVENT_NOTIFICATION")
            elif alert_mode in {"important", "system", "broadcast"} and "SEND_BROADCAST_NOTIFICATION" not in supported_execute_types:
                supported_execute_types.append("SEND_BROADCAST_NOTIFICATION")

        return {
            "canConfirm": bool(supported_execute_types),
            "supportedExecuteTypes": supported_execute_types,
            "requestedAction": execution.get("requestedAction"),
            "reason": execution.get("reason"),
        }
