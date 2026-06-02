from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List

from pupoo_ai.app.features.moderation.chunking import load_policy_chunks_from_json
from pupoo_ai.app.features.moderation.embedding_service import get_embedding_service
from pupoo_ai.app.features.moderation.milvus_client import PolicyVectorStore
from pupoo_ai.app.features.moderation.policy_state import (
    POLICY_DOC_ROOT,
    make_versioned_collection_name,
    save_active_policy,
)
from pupoo_ai.scripts.chunk_policy_txt_to_moderation_rules_json import (
    CODE_TO_DB_CATEGORY,
    load_fallback_keywords,
    load_keywords_from_db,
    parse_txt,
)

SCRIPTS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "scripts"
FALLBACK_KEYWORDS_JSON = SCRIPTS_DIR / "moderation_rules.json"


# ── Step 결과 데이터클래스 ──────────────────────────────────────────


@dataclass(frozen=True)
class ParseResult:
    json_path: str
    policy_count: int
    keyword_source: str  # "db" | "fallback" | "none"
    metadata: Dict[str, Any]


@dataclass(frozen=True)
class EmbedResult:
    collection_name: str
    chunk_count: int
    embedding_dim: int


@dataclass(frozen=True)
class ActivateResult:
    active_collection: str
    active_filename: str | None
    activated_at: str


@dataclass(frozen=True)
class ApplyPolicyResult:
    active_collection: str
    active_filename: str
    chunk_count: int
    embedding_dim: int


# ── Step 1: TXT 파싱 + DB 키워드 병합 → JSON ──────────────────────


def parse_txt_to_json(
    txt_path: Path,
    *,
    use_db_keywords: bool = True,
) -> ParseResult:
    """
    TXT 정책 파일을 구조적으로 파싱하고,
    DB/fallback 키워드를 병합하여 moderation_rules.json을 생성한다.
    """
    if not txt_path.exists() or not txt_path.is_file():
        raise ValueError(f"TXT 파일이 존재하지 않습니다: {txt_path}")

    metadata, policies = parse_txt(txt_path)

    keyword_source = "none"

    db_keywords_by_category: dict[str, list[str]] = {}
    if use_db_keywords:
        db_keywords_by_category = load_keywords_from_db()
        if db_keywords_by_category:
            keyword_source = "db"

    fallback_keywords_by_code = load_fallback_keywords(FALLBACK_KEYWORDS_JSON)

    for p in policies:
        code = p.get("code", "")
        db_cat = CODE_TO_DB_CATEGORY.get(code)
        if db_cat and db_cat in db_keywords_by_category:
            p["keywords"] = db_keywords_by_category[db_cat]
        elif isinstance(code, str) and code in fallback_keywords_by_code:
            p["keywords"] = fallback_keywords_by_code[code]
            if keyword_source == "none":
                keyword_source = "fallback"
        if "keywords" not in p or p["keywords"] is None:
            p["keywords"] = []

    last_updated = metadata.get("last_updated") or txt_path.stem.split("_")[-1]
    metadata["last_updated"] = last_updated
    if not metadata.get("description"):
        metadata["description"] = "프로젝트 전체 정책 (txt -> moderation_rules 변환)"

    out_path = POLICY_DOC_ROOT / "moderation_rules.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps({"metadata": metadata, "policies": policies}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    return ParseResult(
        json_path=str(out_path),
        policy_count=len(policies),
        keyword_source=keyword_source,
        metadata=metadata,
    )


# ── Step 2: JSON → 임베딩 → Milvus upsert ─────────────────────────


def embed_and_upsert(json_path: Path) -> EmbedResult:
    """
    moderation_rules.json을 읽어 임베딩한 뒤,
    새 Milvus 컬렉션을 생성하고 upsert한다. 활성화는 수행하지 않는다.
    """
    if not json_path.exists() or not json_path.is_file():
        raise ValueError(f"JSON 파일이 존재하지 않습니다: {json_path}")

    chunks = load_policy_chunks_from_json(json_path, policy_root=json_path.parent)
    if not chunks:
        raise ValueError("JSON에서 유효한 청크를 생성하지 못했습니다.")

    embedder = get_embedding_service()
    vectors = embedder.embed_texts([c.text for c in chunks])

    new_collection = make_versioned_collection_name()
    store = PolicyVectorStore(dim=embedder.dim, collection_name=new_collection)
    store.upsert(
        embeddings=vectors,
        policy_ids=[c.policy_id for c in chunks],
        categories=[c.category for c in chunks],
        sources=[c.source for c in chunks],
        chunks=[c.text for c in chunks],
    )

    return EmbedResult(
        collection_name=new_collection,
        chunk_count=len(chunks),
        embedding_dim=embedder.dim,
    )


# ── Step 3: 활성 컬렉션 스위칭 ─────────────────────────────────────


def activate_collection(
    collection_name: str,
    filename: str | None = None,
) -> ActivateResult:
    """지정된 Milvus 컬렉션을 활성 정책으로 전환한다."""
    if not collection_name or not collection_name.strip():
        raise ValueError("collection_name은 필수입니다.")

    active = save_active_policy(collection=collection_name, filename=filename)
    return ActivateResult(
        active_collection=active.collection,
        active_filename=active.filename,
        activated_at=active.activated_at or "",
    )


# ── 기존 호환 wrapper (upload-and-activate 용) ─────────────────────


def apply_policy_file_and_activate(path: Path, original_filename: str) -> ApplyPolicyResult:
    """
    업로드된 정책 파일을 기반으로 3단계를 한 번에 수행한다.
    .txt → Step 1(파싱+키워드) → Step 2(임베딩) → Step 3(활성화)
    .json → Step 2(임베딩) → Step 3(활성화)
    """
    if not path.exists() or not path.is_file():
        raise ValueError("policy file does not exist")

    suffix = path.suffix.lower()

    if suffix == ".txt":
        parse_result = parse_txt_to_json(path, use_db_keywords=True)
        json_path = Path(parse_result.json_path)
    elif suffix == ".json":
        json_path = path
    else:
        raise ValueError(f"지원하지 않는 파일 형식: {suffix}")

    embed_result = embed_and_upsert(json_path)
    activate_result = activate_collection(embed_result.collection_name, original_filename)

    return ApplyPolicyResult(
        active_collection=activate_result.active_collection,
        active_filename=activate_result.active_filename or original_filename,
        chunk_count=embed_result.chunk_count,
        embedding_dim=embed_result.embedding_dim,
    )
