from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pupoo_ai.app.core.config import settings


POLICY_DOC_ROOT = Path(__file__).resolve().parent.parent.parent.parent / "policy_docs"
POLICY_STATE_PATH = POLICY_DOC_ROOT / "active_policy.json"


def make_versioned_collection_name() -> str:
    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    base = settings.milvus_collection or "policy_vectors"
    return f"{base}_v{ts}"


@dataclass(frozen=True)
class ActivePolicy:
    collection: str
    filename: str | None
    activated_at: str | None


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_active_policy() -> ActivePolicy:
    """
    현재 활성 정책 상태를 읽는다.
    - 상태 파일이 없으면 settings.milvus_collection을 기본 컬렉션으로 사용한다.
    """
    if not POLICY_STATE_PATH.exists():
        return ActivePolicy(collection=settings.milvus_collection, filename=None, activated_at=None)

    try:
        raw: dict[str, Any] = json.loads(POLICY_STATE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return ActivePolicy(collection=settings.milvus_collection, filename=None, activated_at=None)

    collection = str(raw.get("active_collection") or settings.milvus_collection)
    filename = raw.get("active_filename")
    activated_at = raw.get("activated_at")
    return ActivePolicy(collection=collection, filename=filename, activated_at=activated_at)


def save_active_policy(collection: str, filename: str | None) -> ActivePolicy:
    """
    활성 정책을 저장한다. (원자적 저장: temp 파일 작성 후 replace)
    """
    POLICY_DOC_ROOT.mkdir(parents=True, exist_ok=True)
    payload = {
        "active_collection": collection,
        "active_filename": filename,
        "activated_at": _utc_now_iso(),
    }
    tmp = POLICY_STATE_PATH.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(POLICY_STATE_PATH)
    return ActivePolicy(collection=collection, filename=filename, activated_at=payload["activated_at"])

