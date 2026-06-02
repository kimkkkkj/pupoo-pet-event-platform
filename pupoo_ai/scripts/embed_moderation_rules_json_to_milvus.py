"""
입력: pupoo_ai/policy_docs/moderation_rules.json
출력: Milvus에 버전/타임스탬프 기반 새 컬렉션을 생성 후 upsert 수행(활성화는 하지 않음)

- 임베딩은 watsonx.ai Embeddings API(langchain_ibm)를 사용한다.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

_repo_root = Path(__file__).resolve().parent.parent.parent
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

from pupoo_ai.app.features.moderation.chunking import load_policy_chunks_from_json
from pupoo_ai.app.features.moderation.embedding_service import get_embedding_service
from pupoo_ai.app.features.moderation.milvus_client import PolicyVectorStore
from pupoo_ai.app.features.moderation.policy_state import make_versioned_collection_name


def main() -> None:
    parser = argparse.ArgumentParser(description="moderation_rules.json → Milvus upsert(활성화 제외)")
    parser.add_argument(
        "--policy-json",
        type=str,
        default=str(Path(__file__).resolve().parent.parent / "policy_docs" / "moderation_rules.json"),
        help="입력 moderation_rules.json 경로",
    )
    parser.add_argument(
        "--collection",
        type=str,
        default="",
        help="upsert할 Milvus 컬렉션명(미지정이면 새 버전명 자동 생성)",
    )
    args = parser.parse_args()

    policy_json_path = Path(args.policy_json).resolve()
    if not policy_json_path.exists():
        raise SystemExit(f"Not found: {policy_json_path}")

    policy_root = policy_json_path.parent
    chunks = load_policy_chunks_from_json(policy_json_path, policy_root=policy_root)
    if not chunks:
        raise SystemExit("No chunks created from moderation_rules.json")

    embedder = get_embedding_service()
    texts = [c.text for c in chunks]
    vectors = embedder.embed_texts(texts)

    collection_name = args.collection.strip() if args.collection else make_versioned_collection_name()
    store = PolicyVectorStore(dim=embedder.dim, collection_name=collection_name)

    store.upsert(
        embeddings=vectors,
        policy_ids=[c.policy_id for c in chunks],
        categories=[c.category for c in chunks],
        sources=[c.source for c in chunks],
        chunks=[c.text for c in chunks],
    )

    print(f"Upsert done: collection={collection_name}, chunks={len(chunks)}, dim={embedder.dim}")


if __name__ == "__main__":
    main()

