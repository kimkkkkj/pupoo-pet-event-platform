"""
정책 업로드/즉시 반영(활성화) 내부 API.
- X-Internal-Token 필수. 백엔드(Spring Boot)에서만 호출.
- 개별 Step API(parse-txt / embed / activate)는 IBM Orchestrate Skill로 등록하여 사용한다.
- upload-and-activate는 3단계를 한 번에 수행하는 기존 호환 엔드포인트이다.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from pupoo_ai.app.core.auth import verify_internal_token
from pupoo_ai.app.core.constants import INTERNAL_API_PREFIX
from pupoo_ai.app.features.moderation.policy_apply_service import (
    activate_collection,
    apply_policy_file_and_activate,
    embed_and_upsert,
    parse_txt_to_json,
)
from pupoo_ai.app.features.moderation.policy_state import POLICY_DOC_ROOT, load_active_policy

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix=INTERNAL_API_PREFIX,
    tags=["policies"],
    dependencies=[Depends(verify_internal_token)],
)


# ── Request Models ─────────────────────────────────────────────────


class EmbedRequest(BaseModel):
    json_path: str


class ActivateRequest(BaseModel):
    collection_name: str
    filename: str | None = None


# ── Response Models (Orchestrate Skill 매핑용) ─────────────────────


class ParseTxtResponse(BaseModel):
    status: str = Field(examples=["ok"])
    json_path: str = Field(description="생성된 moderation_rules JSON 파일 경로")
    policy_count: int = Field(description="파싱된 정책 수")
    keyword_source: str = Field(description="키워드 소스 (db / fallback / none)")
    metadata: Dict[str, Any] = Field(description="정책 메타데이터")
    original_filename: str = Field(description="업로드된 원본 파일명")


class EmbedResponse(BaseModel):
    status: str = Field(examples=["ok"])
    collection_name: str = Field(description="생성된 Milvus 컬렉션명")
    chunk_count: int = Field(description="임베딩된 청크 수")
    embedding_dim: int = Field(description="임베딩 차원 수")


class ActivateResponse(BaseModel):
    status: str = Field(examples=["ok"])
    active_collection: str = Field(description="활성화된 Milvus 컬렉션명")
    active_filename: str | None = Field(description="활성 정책 파일명")
    activated_at: str = Field(description="활성화 시각 (ISO 8601)")


# ── 기존 엔드포인트 ───────────────────────────────────────────────


@router.get("/policies/active")
async def get_active_policy() -> dict:
    active = load_active_policy()
    return {
        "active_collection": active.collection,
        "active_filename": active.filename,
        "activated_at": active.activated_at,
    }


@router.post("/policies/upload-and-activate")
async def upload_and_activate_policy(file: UploadFile = File(...)) -> dict:
    """
    정책 파일 업로드 후 즉시 반영 (기존 호환).
    .txt → TXT 파싱 + DB 키워드 병합 → 임베딩 → Milvus upsert → 활성화
    .json → 임베딩 → Milvus upsert → 활성화
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="filename is required")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in (".txt", ".json"):
        raise HTTPException(status_code=400, detail="지원하지 않는 파일 형식입니다. (.txt/.json만 지원)")

    uploads_dir = POLICY_DOC_ROOT / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)

    save_path = uploads_dir / Path(file.filename).name
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="빈 파일은 업로드할 수 없습니다.")
    save_path.write_bytes(content)

    try:
        result = apply_policy_file_and_activate(save_path, original_filename=Path(file.filename).name)
        return {
            "status": "ok",
            "active_collection": result.active_collection,
            "active_filename": result.active_filename,
            "chunk_count": result.chunk_count,
            "embedding_dim": result.embedding_dim,
        }
    except Exception as e:
        logger.exception("정책 upload-and-activate 실패: %s", file.filename)
        raise HTTPException(status_code=500, detail=f"정책 반영 실패: {e}")


# ── Orchestrate Skill 용 개별 엔드포인트 ──────────────────────────


@router.post("/policies/parse-txt", response_model=ParseTxtResponse)
async def parse_txt_endpoint(
    file: UploadFile = File(...),
    use_db_keywords: bool = True,
) -> ParseTxtResponse:
    """
    [Skill 1] TXT 정책 파일을 파싱하고 DB 키워드를 병합하여 moderation_rules JSON을 생성한다.
    - 입력: TXT 파일 업로드, use_db_keywords (기본 True)
    - 출력: json_path, policy_count, keyword_source, metadata, original_filename
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="filename is required")
    if Path(file.filename).suffix.lower() != ".txt":
        raise HTTPException(status_code=400, detail=".txt 파일만 지원합니다.")

    uploads_dir = POLICY_DOC_ROOT / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)

    save_path = uploads_dir / Path(file.filename).name
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="빈 파일은 업로드할 수 없습니다.")
    save_path.write_bytes(content)

    try:
        result = parse_txt_to_json(save_path, use_db_keywords=use_db_keywords)
        return ParseTxtResponse(
            status="ok",
            json_path=result.json_path,
            policy_count=result.policy_count,
            keyword_source=result.keyword_source,
            metadata=result.metadata,
            original_filename=Path(file.filename).name,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TXT 파싱 실패: {e}")


@router.post("/policies/embed", response_model=EmbedResponse)
async def embed_endpoint(body: EmbedRequest) -> EmbedResponse:
    """
    [Skill 2] moderation_rules JSON을 임베딩하여 Milvus 새 컬렉션에 upsert한다.
    - 입력: json_path (Step 1의 출력)
    - 출력: collection_name, chunk_count, embedding_dim
    """
    json_path = Path(body.json_path)
    if not json_path.exists():
        raise HTTPException(status_code=400, detail=f"JSON 파일을 찾을 수 없습니다: {body.json_path}")

    try:
        result = embed_and_upsert(json_path)
        return EmbedResponse(
            status="ok",
            collection_name=result.collection_name,
            chunk_count=result.chunk_count,
            embedding_dim=result.embedding_dim,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"임베딩/Milvus 적재 실패: {e}")


@router.post("/policies/activate", response_model=ActivateResponse)
async def activate_endpoint(body: ActivateRequest) -> ActivateResponse:
    """
    [Skill 3] 지정된 Milvus 컬렉션을 활성 정책으로 전환한다.
    - 입력: collection_name (Step 2의 출력), filename (원본 파일명, 선택)
    - 출력: active_collection, active_filename, activated_at
    """
    if not body.collection_name or not body.collection_name.strip():
        raise HTTPException(status_code=400, detail="collection_name은 필수입니다.")

    try:
        result = activate_collection(body.collection_name, body.filename)
        return ActivateResponse(
            status="ok",
            active_collection=result.active_collection,
            active_filename=result.active_filename,
            activated_at=result.activated_at,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"활성화 실패: {e}")
