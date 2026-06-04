"""LLM 기반 게시판 모더레이션.

watsonx + Milvus(RAG) 없이 OpenAI 호환 LLM(Groq/Gemini 등)으로 게시물을 판정한다.
chatbot_* 설정(api_key/base_url/model)을 그대로 재사용한다.
반환 형식은 rag_service.moderate_with_rag 와 동일한 6-튜플:
    (decision, score, reason, stack, flagged_phrases, inferred_phrases)
"""

import json
import logging

from pupoo_ai.app.core.config import settings

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = (
    "너는 반려동물 행사 커뮤니티 게시판의 콘텐츠 검열기다. "
    "사용자가 작성한 글이 게시 가능한지 판정한다.\n"
    "[BLOCK] 욕설·비속어, 혐오·차별, 성적/음란, 폭력·위협, 스팸·도배, "
    "광고·홍보·외부 결제 유도, 개인정보(전화번호·주민번호·주소·계좌 등) 노출, 사기.\n"
    "[WARN] 경미한 비방이나 맥락상 애매하게 부적절할 수 있는 경우.\n"
    "[ALLOW] 그 외 정상적인 글.\n"
    "반드시 아래 JSON 형식 하나만 출력한다(다른 설명 금지):\n"
    '{"decision":"ALLOW|WARN|BLOCK","reason":"한국어로 한 문장","flagged":["문제된 표현"]}'
)


async def moderate_with_llm(content, board_type=None, metadata=None):
    from openai import AsyncOpenAI

    client = AsyncOpenAI(
        api_key=settings.chatbot_api_key or "missing",
        base_url=settings.chatbot_base_url or None,
    )

    user_text = content if not board_type else f"[게시판: {board_type}]\n{content}"

    response = await client.chat.completions.create(
        model=settings.chatbot_model,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_text},
        ],
        temperature=0,
        max_tokens=300,
        response_format={"type": "json_object"},
    )

    raw = (response.choices[0].message.content or "").strip()
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("LLM moderation returned non-JSON: %s", raw[:200])
        # 응답 해석 실패 시 안전하게 차단(fail-closed)
        return "BLOCK", None, "검열 응답을 해석하지 못해 등록을 차단합니다.", "llm_parse_error", None, None

    decision = str(parsed.get("decision") or "").strip().upper()
    if decision not in {"ALLOW", "WARN", "REVIEW", "BLOCK"}:
        decision = "BLOCK"

    reason = parsed.get("reason")
    if not reason:
        reason = "정상적인 게시물입니다." if decision == "ALLOW" else "부적절한 표현이 감지되었습니다."

    flagged = parsed.get("flagged") or None
    if isinstance(flagged, str):
        flagged = [flagged]
    if isinstance(flagged, list):
        flagged = [str(item) for item in flagged if str(item).strip()] or None

    score = 0.2 if decision == "ALLOW" else 0.9
    return decision, score, reason, "llm", flagged, None
