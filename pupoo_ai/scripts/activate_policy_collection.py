"""
입력: Milvus 컬렉션명
출력: pupoo_ai/policy_docs/active_policy.json 갱신(즉시 반영용)

- “적용된 정책파일” 표시는 filename 파라미터를 사용한다(관리자 UI에서 그대로 쓸 수 있음).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

_repo_root = Path(__file__).resolve().parent.parent.parent
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

from pupoo_ai.app.features.moderation.policy_state import save_active_policy


def main() -> None:
    parser = argparse.ArgumentParser(description="Milvus 컬렉션을 active 정책으로 스위칭")
    parser.add_argument("--collection", required=True, type=str, help="Milvus 컬렉션명")
    parser.add_argument("--filename", type=str, default=None, help="관리자 표시용 정책 파일명")
    args = parser.parse_args()

    active = save_active_policy(collection=args.collection, filename=args.filename)
    print(
        f"Activated: collection={active.collection}, filename={active.filename}, activated_at={active.activated_at}"
    )


if __name__ == "__main__":
    main()

