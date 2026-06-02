"""watsonx 기반 moderation LLM 클라이언트."""

from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING, List

from pupoo_ai.app.core.config import settings

if TYPE_CHECKING:
    from langchain_ibm import WatsonxLLM


logger = logging.getLogger(__name__)

ACTION_PATTERN = re.compile(r"\b(BLOCK|PASS|WARN|REVIEW)\b", re.I)
SCORE_PATTERN = re.compile(r"SCORE\s*:\s*(-?[0-9.]+)", re.I)
REASON_PATTERN = re.compile(r"REASON\s*:\s*([^\n]+)", re.I)
FLAGGED_PATTERN = re.compile(r"FLAGGED\s*:\s*([^\n]+)", re.I)
INFERRED_PATTERN = re.compile(r"INFERRED\s*:\s*([^\n]+)", re.I)


def _watsonx_llm_params() -> dict:
    return {
        "url": settings.watsonx_url or "https://us-south.ml.cloud.ibm.com",
        "apikey": settings.watsonx_api_key,
        "project_id": settings.watsonx_project_id,
        "model_id": settings.watsonx_llm_id or "ibm/granite-13b-instruct-v2",
        "params": {
            "decoding_method": "greedy",
            "max_new_tokens": 256,
            "temperature": 0.1,
        },
    }


def is_watsonx_configured() -> bool:
    return bool(
        settings.watsonx_api_key
        and settings.watsonx_url
        and settings.watsonx_project_id
    )


def is_watsonx_embedding_configured() -> bool:
    model_id = (settings.watsonx_embedding_model_id or "").strip()
    return bool(
        settings.watsonx_api_key
        and settings.watsonx_url
        and settings.watsonx_project_id
        and model_id
    )


def get_llm_for_moderation():
    if not is_watsonx_configured():
        logger.warning("watsonx LLM 설정이 없어 모더레이션 결과를 차단으로 처리합니다.")
        return None

    from langchain_ibm import WatsonxLLM

    return WatsonxLLM(**_watsonx_llm_params())


def _parse_phrase_list(pattern: re.Pattern[str], output: str) -> list[str] | None:
    match = pattern.search(output)
    if not match:
        return None

    raw_text = match.group(1).strip()
    if not raw_text or "없음" in raw_text:
        return None

    values = [
        phrase.strip()
        for phrase in re.split(r"[,|/]+", raw_text)
        if phrase.strip()
    ]
    if not values:
        return None
    return list(dict.fromkeys(values))


def moderate_with_llm(
    user_text: str,
    retrieved_docs: List[dict],
) -> tuple[str, float | None, str | None, list[str] | None, list[str] | None]:
    logger.info(
        "LLM moderation 시작. text_length=%d, retrieved_docs=%d",
        len(user_text or ""),
        len(retrieved_docs or []),
    )

    llm = get_llm_for_moderation()
    if not llm:
        logger.error("LLM 인스턴스를 만들 수 없어 모더레이션 결과를 차단으로 처리합니다.")
        return (
            "BLOCK",
            None,
            "LLM 설정이 없어 모더레이션을 수행할 수 없습니다.",
            None,
            None,
        )

    context_parts = [
        f"[{document.get('policy_id', '')}] {document.get('chunk_text', '')[:300]}"
        for document in retrieved_docs[:5]
    ]
    context = "\n\n".join(context_parts) if context_parts else "관련 정책 없음."

    prompt = f"""당신은 PUPOO 커뮤니티 게시글 모더레이션 심사기입니다.
정책과 사용자 입력을 함께 보고 최종 판단을 내려 주세요.

판정 기준:
- PASS: 정책 위반이 명확하지 않고 일반적인 일상 대화, 후기, 정보 공유에 해당합니다.
- WARN: 공격적이거나 불쾌할 수 있지만 즉시 차단할 정도의 명확한 위반은 아닙니다.
- REVIEW: 문맥상 애매하거나 운영자 검토가 필요합니다.
- BLOCK: 직접적인 위협, 심한 비하, 혐오, 차별, 불법 조장, 명확한 금칙 표현입니다.

중요 규칙:
- 참고 정책보다 실제 사용자 입력 자체를 우선으로 판단합니다.
- 정상적인 반려동물 일상 글, 정보 공유 글, 감상문은 PASS를 우선 검토합니다.
- 경계 사례는 WARN 또는 REVIEW를 사용합니다.
- 아래 출력 형식만 사용하고 다른 문장은 추가하지 마세요.

## 참고 정책
{context}

## 사용자 입력
{user_text[:1000]}

## 출력 형식
ACTION: BLOCK 또는 WARN 또는 REVIEW 또는 PASS
SCORE: 0.0부터 1.0 사이 숫자 하나
REASON: 판단 이유 한 줄
FLAGGED: 입력에서 직접 확인한 문제 표현 목록. 없으면 없음
INFERRED: 정책 문맥으로 추론한 문제 표현 목록. 없으면 없음
"""

    try:
        output = str(llm.invoke(prompt) or "").strip()

        action_match = ACTION_PATTERN.search(output)
        action = action_match.group(1).upper() if action_match else None
        if action not in {"BLOCK", "PASS", "WARN", "REVIEW"}:
            logger.error("LLM 출력에서 ACTION을 해석하지 못해 차단으로 처리합니다.")
            return "BLOCK", None, "LLM 응답을 해석하지 못해 차단 처리했습니다.", None, None

        score_match = SCORE_PATTERN.search(output)
        ai_score: float | None = None
        if score_match:
            try:
                ai_score = max(0.0, min(1.0, float(score_match.group(1))))
            except (TypeError, ValueError):
                ai_score = None

        reason_match = REASON_PATTERN.search(output)
        reason = reason_match.group(1).strip() if reason_match else None
        if not reason:
            lines = [line.strip() for line in output.splitlines() if line.strip()]
            for line in lines:
                upper_line = line.upper()
                if upper_line.startswith(("ACTION:", "SCORE:", "REASON:", "FLAGGED:", "INFERRED:")):
                    continue
                if len(line) <= 200:
                    reason = line
                    break
        if not reason and output:
            reason = output[:200]

        flagged_phrases = _parse_phrase_list(FLAGGED_PATTERN, output)
        inferred_phrases = _parse_phrase_list(INFERRED_PATTERN, output)

        logger.info(
            "LLM moderation 완료. action=%s, ai_score=%s, flagged_count=%d, inferred_count=%d",
            action,
            ai_score,
            len(flagged_phrases or []),
            len(inferred_phrases or []),
        )
        return action, ai_score, reason, flagged_phrases, inferred_phrases
    except Exception:
        logger.exception("LLM moderation 호출 중 오류가 발생했습니다.")
        return (
            "BLOCK",
            None,
            "모더레이션 모델 호출 중 오류가 발생했습니다.",
            None,
            None,
        )
