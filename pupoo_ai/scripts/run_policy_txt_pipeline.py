"""
txt 정책 파일 업로드 파이프라인(로컬 스크립트)

입력: Pupoo_Moderation_Policy_YYYYMMDD.txt
처리:
  1) txt 파싱 + DB 금칙어 키워드 반영 -> moderation_rules.json 생성
  2) moderation_rules.json -> Milvus 새 컬렉션 upsert (버전/타임스탬프 기반 컬렉션명)
  3) active_policy.json을 새 컬렉션으로 스위칭

사전 조건:
- watsonx 임베딩 API(PUPOO_AI_WATSONX_* 및 EMBEDDING_MODEL_ID) 설정이 되어 있어야 합니다.
- Milvus(포트 19530)에 접근 가능해야 합니다.
- DB 키워드를 사용하려면 .env에 PUPOO_AI_DB_* 설정이 필요합니다.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


_repo_root = Path(__file__).resolve().parent.parent.parent
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))


from pupoo_ai.app.features.moderation.chunking import load_policy_chunks_from_json
from pupoo_ai.app.features.moderation.embedding_service import get_embedding_service
from pupoo_ai.app.features.moderation.milvus_client import PolicyVectorStore
from pupoo_ai.app.features.moderation.policy_state import (
    make_versioned_collection_name,
    save_active_policy,
)
from pupoo_ai.scripts.chunk_policy_txt_to_moderation_rules_json import (
    CODE_TO_DB_CATEGORY,
    load_fallback_keywords,
    load_keywords_from_db,
    parse_txt,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="txt 정책 파일 -> moderation_rules.json -> Milvus upsert -> active 스위칭")
    parser.add_argument("input_txt", type=str, help="예: pupoo_ai/policy_docs/Pupoo_Moderation_Policy_20260317.txt")
    parser.add_argument(
        "--fallback-json",
        type=str,
        default=str(Path(__file__).resolve().parent / "moderation_rules.json"),
        help="keywords fallback용 JSON 경로 (기본: pupoo_ai/scripts/moderation_rules.json)",
    )
    parser.add_argument(
        "--policy-out",
        type=str,
        default=str(Path(__file__).resolve().parent.parent / "policy_docs" / "moderation_rules.json"),
        help="출력 moderation_rules.json 경로(기본: 파일명 고정)",
    )
    parser.add_argument(
        "--no-db",
        action="store_true",
        help="DB에서 키워드를 가져오지 않고 fallback JSON만 사용",
    )
    args = parser.parse_args()

    input_txt_path = Path(args.input_txt).resolve()
    if not input_txt_path.exists():
        raise SystemExit(f"Not found: {input_txt_path}")

    policy_out_path = Path(args.policy_out).resolve()
    policy_out_path.parent.mkdir(parents=True, exist_ok=True)

    # 1) txt 파싱 + DB/fallback 키워드 병합 -> moderation_rules.json
    metadata, policies = parse_txt(input_txt_path)
    fallback_keywords_by_code = load_fallback_keywords(Path(args.fallback_json).resolve())

    db_keywords_by_category: dict[str, list[str]] = {}
    if not args.no_db:
        db_keywords_by_category = load_keywords_from_db()

    for p in policies:
        code = p.get("code", "")
        db_cat = CODE_TO_DB_CATEGORY.get(code)
        if db_cat and db_cat in db_keywords_by_category:
            p["keywords"] = db_keywords_by_category[db_cat]
        elif isinstance(code, str) and code in fallback_keywords_by_code:
            p["keywords"] = fallback_keywords_by_code[code]
        if "keywords" not in p or p["keywords"] is None:
            p["keywords"] = []

    last_updated = metadata.get("last_updated") or input_txt_path.stem.split("_")[-1]
    metadata["last_updated"] = last_updated
    if not metadata.get("description"):
        metadata["description"] = "프로젝트 전체 정책 (txt -> moderation_rules 변환)"

    policy_out_obj = {"metadata": metadata, "policies": policies}
    policy_out_path.write_text(
        json.dumps(policy_out_obj, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"[1/3] Written: {policy_out_path}")

    # 2) moderation_rules.json -> Milvus upsert (새 컬렉션)
    policy_root = policy_out_path.parent
    chunks = load_policy_chunks_from_json(policy_out_path, policy_root=policy_root)
    if not chunks:
        raise SystemExit("No chunks created from moderation_rules.json")

    embedder = get_embedding_service()
    texts = [c.text for c in chunks]
    vectors = embedder.embed_texts(texts)

    new_collection = make_versioned_collection_name()
    store = PolicyVectorStore(dim=embedder.dim, collection_name=new_collection)
    store.upsert(
        embeddings=vectors,
        policy_ids=[c.policy_id for c in chunks],
        categories=[c.category for c in chunks],
        sources=[c.source for c in chunks],
        chunks=[c.text for c in chunks],
    )
    print(f"[2/3] Upsert done: collection={new_collection}, chunks={len(chunks)}, dim={embedder.dim}")

    # 3) active 스위칭
    display_filename = input_txt_path.name
    save_active_policy(collection=new_collection, filename=display_filename)
    print(f"[3/3] Activated policy: {display_filename} -> {new_collection}")


if __name__ == "__main__":
    main()

