"""정책 인덱싱 CLI 진입점.

기능:
- `policy_docs`를 청크/임베딩 처리해 Milvus 인덱스를 구축한다.

설명:
- dry-run 모드에서는 실제 Milvus 적재 없이 로딩 가능한 정책 수만 확인한다.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# 기능: 직접 실행 시 패키지 import 경로를 맞춘다.
_this_file = Path(__file__).resolve()
_popups_root = _this_file.parent.parent.parent.parent.parent
if _popups_root.is_dir() and str(_popups_root) not in sys.path:
    sys.path.insert(0, str(_popups_root))

from pupoo_ai.app.features.moderation.rag_service import POLICY_DOC_ROOT, build_policy_index


def main() -> None:
    # 기능: 정책 인덱싱 CLI를 실행한다.
    # 설명: dry-run 여부에 따라 실제 적재 또는 로드 검증만 수행한다.
    # 흐름: 인자 파싱 -> build_policy_index 호출 -> 결과 출력.
    parser = argparse.ArgumentParser(description="정책 문서를 청크화해 Milvus 인덱스를 구축합니다.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Milvus 연결 없이 정책 로딩 결과만 확인합니다.",
    )
    args = parser.parse_args()

    if args.dry_run:
        total, dim = build_policy_index(dry_run=True)
        print(f"[dry-run] policy_docs 경로: {POLICY_DOC_ROOT}")
        print(f"[dry-run] 로드된 청크: {total}개, 임베딩 차원: {dim}")
        if total == 0:
            print("  -> policy_docs 아래에 .json 또는 .txt 정책 파일이 있는지 확인하세요.")
        else:
            print("  -> Milvus가 준비되면 --dry-run 없이 다시 실행하면 됩니다.")
        return

    total, dim = build_policy_index()
    print(f"Indexed {total} policy chunks (dim={dim}).")


if __name__ == "__main__":
    main()
