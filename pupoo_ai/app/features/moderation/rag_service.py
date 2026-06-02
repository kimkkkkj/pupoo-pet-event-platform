"""RAG 기반 모더레이션 조합 서비스."""

from __future__ import annotations

import logging
import re
import threading
import time
from pathlib import Path
from typing import List, Tuple

from pupoo_ai.app.features.moderation.chunking import PolicyChunk, load_policy_chunks
from pupoo_ai.app.features.moderation.embedding_service import get_embedding_service
from pupoo_ai.app.features.moderation.milvus_client import PolicyVectorStore
from pupoo_ai.app.features.moderation.policy_state import load_active_policy
from pupoo_ai.app.features.moderation.watsonx_client import (
    is_watsonx_configured,
    moderate_with_llm,
)

POLICY_DOC_ROOT = Path(__file__).resolve().parent.parent.parent.parent / "policy_docs"
logger = logging.getLogger(__name__)

_SPACE_PATTERN = re.compile(r"\s+")
_HARD_BLOCK_TERMS = (
    "죽여버리고싶다",
    "죽여버리고 싶다",
    "죽여버릴거야",
    "죽이고싶다",
    "죽이고 싶다",
    "죽어버려",
    "죽어라",
    "때려죽이고싶다",
    "칼로찔러",
    "칼로 찔러",
    "없애버리고싶다",
)
_WARN_TERMS = (
    "패버리고싶다",
    "패버리고 싶다",
    "한대치고싶다",
    "한 대 치고 싶다",
    "꺼져버렸으면좋겠",
    "꺼져버렸으면 좋겠",
)
_SEED_SOURCE_NAME = "moderation_seed_examples.json"
_SEED_SCORE_THRESHOLDS = {
    "ALLOW": 0.84,
    "WARN": 0.82,
    "REVIEW": 0.82,
    "BLOCK": 0.82,
}
_STORE_LOCK = threading.Lock()
_STORE_CACHE: dict[tuple[str, int], PolicyVectorStore] = {}


def _precheck_text(text: str) -> tuple[str, str, list[str] | None] | None:
    compact = _SPACE_PATTERN.sub("", text or "").lower()

    matched_block = [term for term in _HARD_BLOCK_TERMS if term in compact]
    if matched_block:
        return (
            "BLOCK",
            "직접적인 위해 표현이 감지되어 등록을 차단합니다.",
            matched_block,
        )

    matched_warn = [term for term in _WARN_TERMS if term in compact]
    if matched_warn:
        return (
            "WARN",
            "공격적인 표현이 감지되어 주의가 필요합니다.",
            matched_warn,
        )

    return None


def _seed_decision_from_policy_id(policy_id: str | None) -> str | None:
    normalized = str(policy_id or "").upper()
    if normalized.startswith("SEED-ALLOW-"):
        return "ALLOW"
    if normalized.startswith("SEED-WARN-"):
        return "WARN"
    if normalized.startswith("SEED-REVIEW-"):
        return "REVIEW"
    if normalized.startswith("SEED-BLOCK-"):
        return "BLOCK"
    return None


def _shortcut_from_retrieved_docs(
    docs: list[dict],
) -> tuple[str, float, str, list[str] | None] | None:
    if not docs:
        return None

    for document in docs:
        source = str(document.get("source") or "")
        policy_id = str(document.get("policy_id") or "")
        score = float(document.get("score") or 0.0)
        decision = _seed_decision_from_policy_id(policy_id)

        if not decision:
            continue
        if not source.endswith(_SEED_SOURCE_NAME):
            continue
        if score < _SEED_SCORE_THRESHOLDS[decision]:
            continue

        if decision == "ALLOW":
            return (
                "ALLOW",
                score,
                "운영 시드 예시와 매우 유사한 일반 문장으로 판단합니다.",
                None,
            )
        if decision == "WARN":
            return (
                "WARN",
                score,
                "운영 시드 예시와 유사한 주의 표현으로 판단합니다.",
                None,
            )
        if decision == "REVIEW":
            return (
                "REVIEW",
                score,
                "운영 시드 예시와 유사해 검토 대기로 처리합니다.",
                None,
            )
        return (
            "BLOCK",
            score,
            "운영 시드 예시와 유사한 위해 표현으로 판단하여 등록을 차단합니다.",
            None,
        )

    return None


def build_policy_index(dry_run: bool = False) -> Tuple[int, int]:
    chunks: List[PolicyChunk] = load_policy_chunks(POLICY_DOC_ROOT)
    if not chunks:
        return 0, 0

    embedder = get_embedding_service()
    if dry_run:
        return len(chunks), embedder.dim

    texts = [chunk.text for chunk in chunks]
    vectors = embedder.embed_texts(texts)
    active = load_active_policy()
    store = PolicyVectorStore(dim=embedder.dim, collection_name=active.collection)
    store.upsert(
        embeddings=vectors,
        policy_ids=[chunk.policy_id for chunk in chunks],
        categories=[chunk.category for chunk in chunks],
        sources=[chunk.source for chunk in chunks],
        chunks=[chunk.text for chunk in chunks],
    )
    return len(chunks), embedder.dim


def _get_policy_vector_store(dim: int, collection_name: str) -> PolicyVectorStore:
    key = (collection_name, dim)
    cached = _STORE_CACHE.get(key)
    if cached is not None:
        return cached

    with _STORE_LOCK:
        cached = _STORE_CACHE.get(key)
        if cached is None:
            cached = PolicyVectorStore(dim=dim, collection_name=collection_name)
            _STORE_CACHE[key] = cached
        return cached


def retrieve_policies(query: str, top_k: int = 5) -> List[dict]:
    embedder = get_embedding_service()
    active = load_active_policy()
    store = _get_policy_vector_store(dim=embedder.dim, collection_name=active.collection)
    query_vectors = embedder.embed_texts([query])
    results = store.search(query_vectors, top_k=top_k)
    if not results:
        return []

    documents: List[dict] = []
    for hit in results[0]:
        fields = hit.get("entity", {})
        documents.append(
            {
                "score": float(hit.get("distance", 0.0)),
                "policy_id": fields.get("policy_id", ""),
                "category": fields.get("category", ""),
                "source": fields.get("source", ""),
                "chunk_text": fields.get("chunk_text", ""),
            }
        )
    return documents


def moderate_with_rag(
    text: str,
    board_type: str | None = None,
    metadata: dict | None = None,
) -> tuple[str, float | None, str | None, str, list[str] | None, list[str] | None]:
    safe_metadata = metadata or {}
    started_at = time.perf_counter()
    logger.info(
        "Moderation pipeline input. board_type=%s text_length=%d metadata=%s",
        board_type,
        len(text or ""),
        safe_metadata,
    )

    precheck = _precheck_text(text)
    if precheck is not None:
        decision, reason, matched_terms = precheck
        logger.info(
            "Moderation precheck hit. board_type=%s decision=%s matched_terms=%s",
            board_type,
            decision,
            matched_terms,
        )
        return (
            decision,
            1.0 if decision == "BLOCK" else 0.7,
            reason,
            "keyword_precheck",
            matched_terms,
            None,
        )

    try:
        retrieval_started_at = time.perf_counter()
        docs = retrieve_policies(text, top_k=8)
        logger.info(
            "Moderation retrieval completed. board_type=%s docs=%d elapsed_ms=%.1f",
            board_type,
            len(docs),
            (time.perf_counter() - retrieval_started_at) * 1000,
        )
    except Exception:
        logger.exception(
            "Milvus policy retrieval failed. board_type=%s metadata=%s",
            board_type,
            safe_metadata,
        )
        return "BLOCK", None, "정책 검색에 실패하여 등록을 차단합니다.", "rag_error", None, None

    if not docs:
        logger.error(
            "No policy documents were retrieved. board_type=%s metadata=%s",
            board_type,
            safe_metadata,
        )
        return "BLOCK", None, "활성 정책을 찾지 못해 등록을 차단합니다.", "rag_empty", None, None

    shortcut = _shortcut_from_retrieved_docs(docs)
    if shortcut is not None:
        decision, score, reason, flagged_phrases = shortcut
        logger.info(
            "Moderation seed shortcut hit. board_type=%s decision=%s score=%s",
            board_type,
            decision,
            score,
        )
        return decision, score, reason, "seed_shortcut", flagged_phrases, None

    if not is_watsonx_configured():
        logger.error(
            "watsonx is not configured. board_type=%s metadata=%s",
            board_type,
            safe_metadata,
        )
        return (
            "BLOCK",
            None,
            "금칙어 검사를 완료하지 못해 등록을 차단합니다.",
            "rag_watsonx_unconfigured",
            None,
            None,
        )

    try:
        llm_started_at = time.perf_counter()
        action, ai_score, reason, flagged_phrases, inferred_phrases = moderate_with_llm(
            text,
            docs,
        )
        logger.info(
            "Moderation llm completed. board_type=%s elapsed_ms=%.1f",
            board_type,
            (time.perf_counter() - llm_started_at) * 1000,
        )
    except Exception:
        logger.exception(
            "watsonx moderation failed. board_type=%s metadata=%s",
            board_type,
            safe_metadata,
        )
        return "BLOCK", None, "금칙어 검사를 완료하지 못해 등록을 차단합니다.", "rag_error", None, None

    normalized = str(action or "").upper()
    if normalized == "PASS":
        normalized = "ALLOW"
    elif normalized not in {"ALLOW", "WARN", "REVIEW", "BLOCK"}:
        normalized = "BLOCK"

    final_reason = reason or (
        "정책 위반 가능성은 낮습니다."
        if normalized in {"ALLOW", "WARN", "REVIEW"}
        else "정책 위반 가능성이 있어 등록을 차단합니다."
    )
    logger.info(
        "Moderation pipeline final decision. board_type=%s decision=%s score=%s total_elapsed_ms=%.1f",
        board_type,
        normalized,
        ai_score,
        (time.perf_counter() - started_at) * 1000,
    )
    return normalized, ai_score, final_reason, "rag_watsonx", flagged_phrases, inferred_phrases
