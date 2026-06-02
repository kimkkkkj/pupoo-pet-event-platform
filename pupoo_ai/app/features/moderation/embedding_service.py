"""모더레이션 임베딩 서비스.

기능:
- 정책 검색용 텍스트 임베딩을 IBM watsonx.ai Embeddings API로 생성한다.
"""

from __future__ import annotations

import logging
import threading
from typing import Iterable, List, Protocol

from pupoo_ai.app.core.config import settings
from pupoo_ai.app.features.moderation.watsonx_client import is_watsonx_embedding_configured

logger = logging.getLogger(__name__)

_EMBED_BATCH_SIZE = 32


class EmbeddingService(Protocol):
    def embed_texts(self, texts: Iterable[str]) -> List[List[float]]:
        ...

    @property
    def dim(self) -> int:
        ...


class WatsonxEmbeddingService:
    """watsonx.ai 임베딩 서비스."""

    def __init__(self) -> None:
        if not is_watsonx_embedding_configured():
            raise RuntimeError(
                "watsonx 임베딩에 필요한 설정이 없습니다. "
                "PUPOO_AI_WATSONX_API_KEY, PUPOO_AI_WATSONX_URL, "
                "PUPOO_AI_WATSONX_PROJECT_ID, PUPOO_AI_WATSONX_EMBEDDING_MODEL_ID를 확인해 주세요."
            )
        self._dim = settings.watsonx_embedding_dim
        self._client = None
        self._lock = threading.Lock()

    @property
    def dim(self) -> int:
        return self._dim

    def _get_watsonx(self):
        with self._lock:
            if self._client is None:
                from langchain_ibm import WatsonxEmbeddings

                self._client = WatsonxEmbeddings(
                    model_id=settings.watsonx_embedding_model_id.strip(),
                    url=settings.watsonx_url or "https://us-south.ml.cloud.ibm.com",
                    apikey=settings.watsonx_api_key,
                    project_id=settings.watsonx_project_id,
                )
            return self._client

    def embed_texts(self, texts: Iterable[str]) -> List[List[float]]:
        texts_list = [text if text is not None else "" for text in texts]
        if not texts_list:
            return []

        watsonx = self._get_watsonx()
        embeddings: List[List[float]] = []
        for index in range(0, len(texts_list), _EMBED_BATCH_SIZE):
            batch = texts_list[index : index + _EMBED_BATCH_SIZE]
            embeddings.extend(watsonx.embed_documents(batch))

        if embeddings and len(embeddings[0]) != self._dim:
            logger.warning(
                "임베딩 벡터 길이(%d)가 PUPOO_AI_WATSONX_EMBEDDING_DIM(%d)과 다릅니다. "
                "Milvus 스키마와 설정을 함께 확인해 주세요.",
                len(embeddings[0]),
                self._dim,
            )
        return embeddings


_service_lock = threading.Lock()
_service: WatsonxEmbeddingService | None = None


def get_embedding_service() -> EmbeddingService:
    global _service
    with _service_lock:
        if _service is None:
            _service = WatsonxEmbeddingService()
        return _service
