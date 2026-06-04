"""내부 모더레이션 API 라우터."""

import asyncio
import logging

from fastapi import APIRouter, Depends

from pupoo_ai.app.core.auth import verify_internal_token
from pupoo_ai.app.core.config import settings
from pupoo_ai.app.core.constants import INTERNAL_API_PREFIX
from pupoo_ai.app.features.moderation.llm_moderation import moderate_with_llm
from pupoo_ai.app.features.moderation.rag_service import moderate_with_rag
from pupoo_ai.app.features.moderation.schemas import ModerateRequest, ModerateResponse

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix=INTERNAL_API_PREFIX,
    tags=["moderation"],
    dependencies=[Depends(verify_internal_token)],
)


def _normalize_decision(value: str | None) -> str:
    normalized = str(value or "").strip().upper()
    if normalized in {"BLOCK", "WARN", "REVIEW"}:
        return normalized
    return "ALLOW"


def _build_response(
    *,
    decision: str,
    reason: str | None,
    score: float | None,
    stack: str,
    flagged_phrases: list[str] | None,
    inferred_phrases: list[str] | None,
) -> ModerateResponse:
    normalized_decision = _normalize_decision(decision)
    legacy_result = "BLOCK" if normalized_decision == "BLOCK" else "PASS"

    return ModerateResponse(
        decision=normalized_decision,
        result=legacy_result,
        action=legacy_result,
        reason=reason,
        score=score,
        ai_score=score,
        stack=stack,
        flagged_phrases=flagged_phrases,
        inferred_phrases=inferred_phrases,
    )


def _block_response(reason: str, stack: str) -> ModerateResponse:
    return _build_response(
        decision="BLOCK",
        reason=reason,
        score=None,
        stack=stack,
        flagged_phrases=None,
        inferred_phrases=None,
    )


async def _run_moderation(body: ModerateRequest) -> ModerateResponse:
    content = (body.content or body.text or "").strip()
    board_type = (body.board_type or body.content_type or "").strip() or None
    metadata = dict(body.metadata or {})
    if body.board_id is not None:
        metadata.setdefault("boardId", body.board_id)
    if board_type:
        metadata.setdefault("boardType", board_type)

    if not content:
        return _block_response("검사할 내용이 비어 있어 등록을 차단합니다.", "validation")

    provider = (settings.moderation_provider or "rag").strip().lower()
    if provider == "llm":
        moderation_coro = moderate_with_llm(content, board_type, metadata)
    else:
        moderation_coro = asyncio.to_thread(moderate_with_rag, content, board_type, metadata)

    try:
        result, score, reason, stack, flagged_phrases, inferred_phrases = await asyncio.wait_for(
            moderation_coro,
            timeout=settings.moderation_timeout_seconds,
        )
    except asyncio.TimeoutError:
        logger.warning(
            "Moderation timed out. board_type=%s metadata=%s",
            board_type,
            metadata,
        )
        return _block_response("금칙어 검사가 지연되어 등록을 차단합니다.", "timeout")
    except Exception:
        logger.exception(
            "Moderation failed unexpectedly. board_type=%s metadata=%s",
            board_type,
            metadata,
        )
        return _block_response("금칙어 검사를 완료하지 못해 등록을 차단합니다.", "error")

    return _build_response(
        decision=result,
        reason=reason,
        score=score,
        stack=stack,
        flagged_phrases=flagged_phrases,
        inferred_phrases=inferred_phrases,
    )


@router.post("/moderate", response_model=ModerateResponse)
async def moderate(body: ModerateRequest) -> ModerateResponse:
    return await _run_moderation(body)


@router.post("/moderation/check", response_model=ModerateResponse)
async def moderate_check(body: ModerateRequest) -> ModerateResponse:
    return await _run_moderation(body)
