"""Milvus 정책 벡터 저장소 어댑터.

기능:
- 정책 청크 임베딩을 Milvus에 저장하고 검색한다.

설명:
- moderation 정책 검색은 이 저장소를 기준으로 동작한다.
- `chunk_text`는 최종 판단이 아니라 검색 근거 스니펫이다.
"""

from __future__ import annotations

import logging
import time
from typing import Iterable, List, Optional

from pymilvus import CollectionSchema, DataType, FieldSchema, MilvusClient
from pymilvus.exceptions import MilvusException
from pymilvus.milvus_client import IndexParams

from pupoo_ai.app.core.config import settings

logger = logging.getLogger(__name__)

# CollectionSchema FieldSchema max_length 와 반드시 일치 (초과 시 insert 실패 → 500)
_MILVUS_VARCHAR_LIMITS = {
    "policy_id": 128,
    "category": 64,
    "source": 256,
    "chunk_text": 2048,
}

_PRIMARY_METRIC_TYPE = "COSINE"
_FALLBACK_METRIC_TYPE = "IP"


def _clip_varchar(value: object, field: str) -> str:
    s = "" if value is None else str(value)
    limit = _MILVUS_VARCHAR_LIMITS[field]
    if len(s) > limit:
        logger.warning(
            "Milvus 필드 길이 초과로 절단: field=%s len=%d max=%d",
            field,
            len(s),
            limit,
        )
        return s[:limit]
    return s


def _ensure_collection(client: MilvusClient, collection_name: str, dim: int) -> None:
    """
    정책 벡터용 컬렉션이 없으면 생성한다.

    컬럼:
    - id: int64 (primary key, auto_id)
    - embedding: float_vector (dim)
    - policy_id: varchar
    - category: varchar
    - source: varchar
    - chunk_text: varchar
    """
    if client.has_collection(collection_name):
        try:
            indexes = client.list_indexes(collection_name=collection_name)
        except Exception:
            indexes = []
        if indexes:
            return
        logger.warning(
            "Milvus 컬렉션은 존재하지만 인덱스가 없어 재생성합니다. collection=%s",
            collection_name,
        )
    else:
        fields = [
            FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
            FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=dim),
            FieldSchema(name="policy_id", dtype=DataType.VARCHAR, max_length=128),
            FieldSchema(name="category", dtype=DataType.VARCHAR, max_length=64),
            FieldSchema(name="source", dtype=DataType.VARCHAR, max_length=256),
            FieldSchema(name="chunk_text", dtype=DataType.VARCHAR, max_length=2048),
        ]
        schema = CollectionSchema(fields=fields, description="Policy RAG vectors")

        client.create_collection(
            collection_name=collection_name,
            schema=schema,
            shards_num=2,
        )

    metric_type = _PRIMARY_METRIC_TYPE
    index_params = IndexParams()
    index_params.add_index(
        "embedding",
        index_type="IVF_FLAT",
        index_name="policy_embedding_idx",
        metric_type=metric_type,
        nlist=1024,
    )
    try:
        client.create_index(
            collection_name=collection_name,
            index_params=index_params,
        )
    except MilvusException as exc:
        if metric_type != _PRIMARY_METRIC_TYPE:
            raise
        logger.warning(
            "Milvus 인덱스 metric_type=%s 생성에 실패해 %s로 재시도합니다. 원인: %s",
            _PRIMARY_METRIC_TYPE,
            _FALLBACK_METRIC_TYPE,
            exc,
        )
        index_params = IndexParams()
        index_params.add_index(
            "embedding",
            index_type="IVF_FLAT",
            index_name="policy_embedding_idx",
            metric_type=_FALLBACK_METRIC_TYPE,
            nlist=1024,
        )
        client.create_index(
            collection_name=collection_name,
            index_params=index_params,
        )


class PolicyVectorStore:
    """Milvus 기반 정책 벡터 저장소 래퍼."""

    # standalone 기동 직후 Proxy gRPC가 늦게 뜨는 경우가 있어 재시도한다.
    # 시도당 타임아웃은 짧게: 장시간 대기 시 재시도 간격이 1분처럼 보이는 것을 줄임.
    _CONNECT_RETRIES = 20
    _CONNECT_RETRY_DELAY_SEC = 2.0
    _CONNECT_TIMEOUT_SEC = 15.0

    def __init__(self, dim: int, collection_name: str) -> None:
        self._dim = dim
        self._collection_name = collection_name
        # Milvus 2.x gRPC: URI는 http://host:port
        uri = f"http://{settings.milvus_host}:{settings.milvus_port}"
        # pymilvus는 user=None 시 str(None) → "None" 으로 넘어가 인증/연결이 깨질 수 있음 → 빈 문자열만 전달
        user = (settings.milvus_username or "").strip()
        password = (settings.milvus_password or "").strip()

        last_err: Optional[MilvusException] = None
        for attempt in range(1, self._CONNECT_RETRIES + 1):
            try:
                self._client = MilvusClient(
                    uri=uri,
                    user=user,
                    password=password,
                    db_name="default",
                    secure=settings.milvus_tls,
                    timeout=self._CONNECT_TIMEOUT_SEC,
                )
                last_err = None
                break
            except MilvusException as e:
                last_err = e
                if attempt >= self._CONNECT_RETRIES:
                    logger.error(
                        "Milvus 연결 실패 uri=%s — docker-compose.milvus.yml의 shm_size(2gb)·mem_limit, "
                        "docker logs pupoo-milvus, 19530 점유(netstat), 로컬 K8s Milvus와 RAM 경쟁 여부, "
                        "pymilvus·이미지(v2.4.x) 확인. 원본: %s",
                        uri,
                        e,
                    )
                    raise
                logger.warning(
                    "Milvus 연결 재시도 %d/%d (%.0fs 후): %s",
                    attempt,
                    self._CONNECT_RETRIES,
                    self._CONNECT_RETRY_DELAY_SEC,
                    e,
                )
                time.sleep(self._CONNECT_RETRY_DELAY_SEC)

        _ensure_collection(self._client, collection_name=self._collection_name, dim=dim)

    def upsert(
        self,
        embeddings: List[List[float]],
        policy_ids: List[str],
        categories: Optional[List[str]] = None,
        sources: Optional[List[str]] = None,
        chunks: Optional[List[str]] = None,
    ) -> None:
        """정책 청크 임베딩과 메타데이터를 Milvus에 적재한다."""
        total = len(embeddings)
        if len(policy_ids) != total:
            raise ValueError("embeddings와 policy_ids 길이가 일치하지 않습니다.")

        categories = categories or [""] * total
        sources = sources or [""] * total
        chunks = chunks or [""] * total

        if not (len(categories) == len(sources) == len(chunks) == total):
            raise ValueError("메타데이터 리스트 길이가 일치하지 않습니다.")

        data = [
            {
                "embedding": embedding,
                "policy_id": _clip_varchar(policy_id, "policy_id"),
                "category": _clip_varchar(category, "category"),
                "source": _clip_varchar(source, "source"),
                "chunk_text": _clip_varchar(chunk, "chunk_text"),
            }
            for embedding, policy_id, category, source, chunk in zip(
                embeddings, policy_ids, categories, sources, chunks
            )
        ]

        self._client.insert(
            collection_name=self._collection_name,
            data=data,
        )

    def search(
        self,
        query_embeddings: Iterable[List[float]],
        top_k: int = 5,
    ) -> List[List[dict]]:
        """질의 벡터별 상위 정책 청크를 검색한다."""
        try:
            self._client.load_collection(collection_name=self._collection_name)
        except Exception:
            # 기능: load 실패는 search에서 다시 실패시킬 수 있으므로 여기서는 조용히 넘긴다.
            pass

        results = self._client.search(
            collection_name=self._collection_name,
            data=list(query_embeddings),
            anns_field="embedding",
            limit=top_k,
            search_params={"metric_type": _FALLBACK_METRIC_TYPE, "params": {"nprobe": 16}},
            output_fields=["policy_id", "category", "source", "chunk_text"],
        )
        return results
