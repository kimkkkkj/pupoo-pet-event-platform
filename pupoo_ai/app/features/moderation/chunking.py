"""모더레이션 정책 문서를 RAG 검색용 청크로 변환한다."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List


@dataclass
class PolicyChunk:
    text: str
    policy_id: str
    category: str
    source: str


def iter_policy_files(base_dir: Path) -> Iterable[Path]:
    """텍스트 정책 파일을 순회한다."""
    if not base_dir.exists():
        return []
    return sorted(p for p in base_dir.rglob("*.txt") if p.is_file())


def iter_policy_json_files(base_dir: Path) -> Iterable[Path]:
    """JSON 정책 파일을 순회한다."""
    if not base_dir.exists():
        return []
    return sorted(p for p in base_dir.rglob("*.json") if p.is_file())


def simple_chunk_text(text: str, max_chars: int = 800, overlap: int = 200) -> List[str]:
    """긴 텍스트를 단순 겹침 기반 청크로 분할한다."""
    paragraphs = [p.strip() for p in text.splitlines() if p.strip()]
    if not paragraphs:
        return []

    joined = "\n".join(paragraphs)
    chunks: List[str] = []
    start = 0
    total_length = len(joined)

    while start < total_length:
        end = min(start + max_chars, total_length)
        chunk = joined[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end == total_length:
            break
        start = max(0, end - overlap)

    return chunks


def _coerce_examples(policy: dict) -> list[str]:
    examples = policy.get("examples") or []
    if isinstance(examples, str):
        examples = [examples]
    return [str(example).strip() for example in examples if str(example).strip()]


def _policy_json_to_chunk(policy: dict, file_source: str) -> PolicyChunk:
    """정책 JSON 항목 하나를 검색용 청크로 변환한다."""
    action_type = str(policy.get("action_type") or "").strip().upper()
    examples = _coerce_examples(policy)

    parts = [
        f"정책 ID: {policy.get('id') or policy.get('code') or ''}",
        f"카테고리: {policy.get('category') or 'GENERAL'}",
        f"판정: {action_type}" if action_type else "",
        f"설명: {policy.get('description') or ''}",
        f"위반 기준: {policy.get('violation_criteria') or ''}",
        f"운영 가이드: {policy.get('ai_response_guide') or ''}",
        "예시: " + " | ".join(examples) if examples else "",
        "키워드: " + ", ".join(policy.get("keywords") or []),
    ]
    text = "\n".join(part for part in parts if part.strip())
    policy_id = str(policy.get("id") or policy.get("code") or "")
    return PolicyChunk(
        text=text or policy_id,
        policy_id=policy_id,
        category=str(policy.get("category") or "GENERAL"),
        source=file_source,
    )


def load_policy_chunks_from_json(path: Path, policy_root: Path) -> List[PolicyChunk]:
    """JSON 정책 파일 하나를 읽어 청크 목록으로 변환한다."""
    chunks: List[PolicyChunk] = []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []

    policies = data.get("policies") or []
    try:
        source = str(path.relative_to(policy_root))
    except ValueError:
        source = path.name

    for policy in policies:
        if isinstance(policy, dict) and (policy.get("id") or policy.get("code")):
            chunks.append(_policy_json_to_chunk(policy, source))
    return chunks


def load_policy_chunks(policy_root: Path) -> List[PolicyChunk]:
    """정책 문서를 읽어 RAG 검색용 청크 목록을 만든다."""
    chunks: List[PolicyChunk] = []

    for path in iter_policy_files(policy_root):
        text = path.read_text(encoding="utf-8", errors="ignore")
        for index, chunk in enumerate(simple_chunk_text(text)):
            chunks.append(
                PolicyChunk(
                    text=chunk,
                    policy_id=f"{path.stem}:{index}",
                    category="GENERAL",
                    source=str(path.relative_to(policy_root)),
                )
            )

    for path in iter_policy_json_files(policy_root):
        chunks.extend(load_policy_chunks_from_json(path, policy_root))

    return chunks
