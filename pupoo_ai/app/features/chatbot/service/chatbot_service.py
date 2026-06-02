"""Chatbot service entrypoints."""

from pupoo_ai.app.features.chatbot.dto.request import ChatRequest
from pupoo_ai.app.features.chatbot.dto.response import ChatResponse
from pupoo_ai.app.features.chatbot.prompts.system import SYSTEM_PROMPT, USER_SYSTEM_PROMPT
from pupoo_ai.app.features.chatbot.service.bedrock_client import invoke_bedrock
from pupoo_ai.app.features.chatbot.service.grounded_answer_service import GroundedAnswerService
from pupoo_ai.app.features.orchestrator.action_planner import ActionPlanner
from pupoo_ai.app.features.orchestrator.backend_api_client import BackendApiClient
from pupoo_ai.app.features.orchestrator.handlers import (
    DraftActionHandler,
    ExecuteActionHandler,
    NavigationActionHandler,
    SummaryActionHandler,
    UnsupportedActionHandler,
)
from pupoo_ai.app.features.orchestrator.intent_analyzer import IntentAnalyzer

USER_FALLBACK_MESSAGE = (
    "\uc548\ub155\ud558\uc138\uc694, \ud478\ub9ac\uc608\uc694. \ubb34\uc5c7\uc744 \ub3c4\uc640\ub4dc\ub9b4\uae4c\uc694? "
    "\ud589\uc0ac, \ub85c\uadf8\uc778, \uacb0\uc81c, \ud658\ubd88, \uccb4\ud06c\uc778 \uac19\uc740 "
    "\uc774\uc6a9 \ubc29\ubc95\uc744 \uc548\ub0b4\ud574\ub4dc\ub9b4\uac8c\uc694."
)
ADMIN_FALLBACK_MESSAGE = (
    "\uc548\ub155\ud558\uc138\uc694, \ub204\ub9ac\uc608\uc694. \ubb34\uc5c7\uc744 \ub3c4\uc640\ub4dc\ub9b4\uae4c\uc694? "
    "\uc6b4\uc601 \uc694\uc57d, \ud654\uba74 \uc774\ub3d9, \uacf5\uc9c0\uc640 \uc54c\ub9bc \ucd08\uc548 "
    "\uc900\ube44\uae4c\uc9c0 \ub3c4\uc640\ub4dc\ub9b4\uac8c\uc694."
)
AMBIGUOUS_MESSAGE = (
    "\uc6d0\ud558\uc2dc\ub294 \uc791\uc5c5\uc774 \uc5ec\ub7ec \uac00\uc9c0\ub85c \ud574\uc11d\ub418\uace0 \uc788\uc5b4\uc694. "
    "\uc5b4\ub5a4 \uc791\uc5c5\uc778\uc9c0 \ud55c \ubc88\ub9cc \ub354 \uad6c\uccb4\uc801\uc73c\ub85c \uc54c\ub824\uc8fc\uc138\uc694."
)
LOW_CONFIDENCE_MESSAGE = (
    "\uc694\uccad\uc744 \uc815\ud655\ud558\uac8c \uc774\ud574\ud558\uc9c0 \ubabb\ud588\uc5b4\uc694. "
    "\ud544\uc694\ud55c \uc791\uc5c5\uc744 \uc870\uae08 \ub354 \uc790\uc138\ud788 \uc54c\ub824\uc8fc\uc138\uc694."
)


def _is_user_role(request: ChatRequest) -> bool:
    return getattr(request.context, "role", "user") == "user"


def _build_messages(request: ChatRequest) -> list[dict]:
    history = list(request.history)
    while history and history[0].role == "assistant":
        history.pop(0)

    messages = [
        {"role": message.role, "content": [{"text": message.content}]}
        for message in history
    ]
    messages.append({"role": "user", "content": [{"text": request.message}]})
    return messages


async def _user_chat(request: ChatRequest) -> ChatResponse:
    grounded_reply = await GroundedAnswerService(BackendApiClient()).answer_user_structured(request)
    if grounded_reply is not None:
        return grounded_reply

    reply = await invoke_bedrock(_build_messages(request), system_prompt=USER_SYSTEM_PROMPT)
    reply_text = str(reply or "").strip() or USER_FALLBACK_MESSAGE
    return ChatResponse(message=reply_text, actions=[])


async def chat(request: ChatRequest, authorization: str | None = None) -> ChatResponse:
    if _is_user_role(request):
        return await _user_chat(request)

    intent = IntentAnalyzer().analyze(request.message, request.context)
    backend_client = BackendApiClient(authorization)
    grounded_service = GroundedAnswerService(backend_client)
    execute_handler = ExecuteActionHandler()

    if request.confirmation is not None:
        return await execute_handler.confirm(
            request.confirmation.model_dump(),
            backend_client,
        )

    if intent is not None:
        if intent.intent_type == "ambiguous":
            return ChatResponse(
                message=AMBIGUOUS_MESSAGE,
                messageType="ambiguous",
                actions=[],
            )
        if intent.intent_type == "low_confidence":
            grounded_reply = await grounded_service.answer_admin(request.message)
            if grounded_reply is not None:
                return ChatResponse(message=grounded_reply, actions=[])
            return ChatResponse(
                message=LOW_CONFIDENCE_MESSAGE,
                messageType="low_confidence",
                actions=[],
            )

        planned_action = ActionPlanner().plan(intent, request.context)
        if planned_action.intent_type == "navigation":
            return NavigationActionHandler().handle(planned_action)
        if planned_action.intent_type == "summary":
            return await SummaryActionHandler().handle(planned_action, backend_client)
        if planned_action.intent_type == "draft":
            return await DraftActionHandler().handle(planned_action, request)
        if planned_action.intent_type == "unsupported":
            return UnsupportedActionHandler().handle(planned_action, request.context)
        if planned_action.intent_type == "execute":
            return execute_handler.prepare(planned_action, request.context)

    grounded_reply = await grounded_service.answer_admin(request.message)
    if grounded_reply is not None:
        return ChatResponse(message=grounded_reply, actions=[])

    reply = await invoke_bedrock(_build_messages(request), system_prompt=SYSTEM_PROMPT)
    reply_text = str(reply or "").strip() or ADMIN_FALLBACK_MESSAGE
    return ChatResponse(message=reply_text, actions=[])
