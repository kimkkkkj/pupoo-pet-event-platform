"""
Milvus 연결 + 컬렉션 생성 + insert + row_count 확인 (임베딩 API 없음).

실행 (pupoo_ai/.venv 권장):
  cd pupoo_ai
  ..\\.venv\\Scripts\\python.exe scripts\\milvus_smoke_test.py
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

_repo_root = Path(__file__).resolve().parent.parent.parent
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

from pupoo_ai.app.core.config import settings
from pupoo_ai.app.features.moderation.milvus_client import PolicyVectorStore

# 스모크 전용: 연결 실패 시 기본 20회 재시도(수분) 대신 짧게 끝낸다.
PolicyVectorStore._CONNECT_RETRIES = 3
PolicyVectorStore._CONNECT_RETRY_DELAY_SEC = 1.0


def main() -> None:
    dim = int(settings.watsonx_embedding_dim)
    collection_name = f"smoke_test_{int(time.time())}"
    vec = [0.001 * ((i % 7) + 1) for i in range(dim)]

    print(
        f"Connecting Milvus uri=http://{settings.milvus_host}:{settings.milvus_port} "
        f"dim={dim} collection={collection_name}",
        flush=True,
    )
    store = PolicyVectorStore(dim=dim, collection_name=collection_name)
    store.upsert(
        embeddings=[vec],
        policy_ids=["smoke-policy-id"],
        categories=["smoke"],
        sources=["milvus_smoke_test.py"],
        chunks=["smoke row — Milvus insert OK"],
    )
    store._client.flush(collection_name=collection_name)

    stats = store._client.get_collection_stats(collection_name=collection_name)
    row_count = stats.get("row_count")
    print(f"OK: inserted 1 row, get_collection_stats row_count={row_count}", flush=True)
    if row_count is not None and int(row_count) < 1:
        raise SystemExit(f"Unexpected row_count: {row_count}")


if __name__ == "__main__":
    main()
