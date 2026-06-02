from __future__ import annotations

import threading
from typing import List

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel, Field

from pupoo_ai.app.core.auth import verify_internal_token
from pupoo_ai.app.core.constants import INTERNAL_API_PREFIX


class EmbedRequest(BaseModel):
    texts: List[str] = Field(..., min_length=1, description="임베딩할 텍스트 리스트")


class EmbedResponse(BaseModel):
    model: str = Field(..., description="사용한 임베딩 모델 ID")
    dim: int = Field(..., description="임베딩 차원")
    vectors: List[List[float]] = Field(..., description="texts와 같은 순서의 벡터 리스트")


# 레거시: 로컬 BGE-M3 전용 마이크로서비스. 메인 pupoo-ai 는 watsonx 임베딩을 사용한다.
_model = None
_model_id = "BAAI/bge-m3"
_dim = 1024
_ready = False
_lock = threading.Lock()


def _set_ready(v: bool) -> None:
    global _ready
    with _lock:
        _ready = v


def _get_ready() -> bool:
    with _lock:
        return _ready


def create_app() -> FastAPI:
    app = FastAPI(title="pupoo-ai-embedding-service")

    @app.on_event("startup")
    def _startup() -> None:
        global _model
        try:
            from sentence_transformers import SentenceTransformer
        except Exception as e:
            _set_ready(False)
            raise RuntimeError(
                "embedding-service는 sentence-transformers(및 torch)가 필요합니다. "
                "pupoo_ai/requirements.embedding.txt를 설치하세요."
            ) from e

        _model = SentenceTransformer(_model_id)
        _set_ready(True)

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok"}

    @app.get("/ready")
    def ready() -> dict:
        if not _get_ready():
            raise HTTPException(status_code=503, detail="Model is not ready")
        return {"status": "ready", "model": _model_id, "dim": _dim}

    @app.post(
        f"{INTERNAL_API_PREFIX}/embed",
        response_model=EmbedResponse,
        dependencies=[Depends(verify_internal_token)],
    )
    def embed(req: EmbedRequest) -> EmbedResponse:
        if not _get_ready() or _model is None:
            raise HTTPException(status_code=503, detail="Model is not ready")

        texts = [t if t is not None else "" for t in req.texts]
        if not texts:
            return EmbedResponse(model=_model_id, dim=_dim, vectors=[])

        emb = _model.encode(texts, batch_size=32, convert_to_numpy=True)
        vectors = [v.tolist() for v in emb]
        return EmbedResponse(model=_model_id, dim=_dim, vectors=vectors)

    return app


app = create_app()

