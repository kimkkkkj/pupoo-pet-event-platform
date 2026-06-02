"""
입력: 날짜가 포함된 `Pupoo_Moderation_Policy_YYYYMMDD.txt`
출력: `pupoo_ai/policy_docs/moderation_rules.json` (파일명 고정)

- txt 안의 메타데이터(service_name/last_updated/version/description)와
  POL-XXX 블록들을 파싱하여 moderation_rules 포맷으로 변환한다.
- keywords는 DB(board_banned_words)에서 category별로 우선 로드하고,
  DB 미설정/실패 시 fallback moderation_rules.json을 참고한다.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

_PROJECT_ROOT = str(Path(__file__).resolve().parent.parent.parent)
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)


CODE_TO_DB_CATEGORY = {
    "PII_COLLECTION_AND_EXPOSURE": "PII_COLLECTION_AND_EXPOSURE",
    "LEGAL_RESTRICTION": "LEGAL_RESTRICTION",
    "ABUSE_INSULT": "ABUSE_INSULT",
    "HATE_SPEECH": "HATE_SPEECH",
    "ADULT_CONTENT": "ADULT_CONTENT",
    "DEFAMATION_HARASSMENT": "DEFAMATION_HARASSMENT",
    "COPYRIGHT_VIOLATION": "COPYRIGHT_VIOLATION",
    "SPAM_ADVERTISING": "SPAM_ADVERTISING",
    "PET_SENSITIVE": "PET_SENSITIVE",
    "COMMERCIAL_SALE": "COMMERCIAL_SALE",
    "SYSTEM_ABUSE": "SYSTEM_ABUSE",
    "MINOR_AGE_RESTRICTION": "MINOR_AGE_RESTRICTION",
    "PAYMENT_REFUND_POLICY": "PAYMENT_REFUND_POLICY",
    "BOARD_COMMUNITY_POLICY": "BOARD_COMMUNITY_POLICY",
    "REPORT_MODERATION": "REPORT_MODERATION",
    "OTHER": "OTHER",
}


def parse_txt(txt_path: Path) -> tuple[dict[str, Any], List[dict[str, Any]]]:
    text = txt_path.read_text(encoding="utf-8", errors="ignore")
    metadata: dict[str, Any] = {
        "service_name": "",
        "last_updated": "",
        "version": "",
        "description": "",
    }
    policies: List[dict[str, Any]] = []

    # 메타데이터: service_name:/last_updated:/version:/description: 키를 찾으면 파싱 종료
    for line in text.splitlines():
        s = line.strip()
        if s.startswith("service_name:"):
            metadata["service_name"] = s.split(":", 1)[1].strip()
        elif s.startswith("last_updated:"):
            metadata["last_updated"] = s.split(":", 1)[1].strip()
        elif s.startswith("version:"):
            metadata["version"] = s.split(":", 1)[1].strip()
        elif s.startswith("description:"):
            metadata["description"] = s.split(":", 1)[1].strip()

        if metadata["service_name"] and metadata["version"]:
            break

    # 정책 블록: POL-001  CODE  |  CategoryLabel
    # - CODE는 대문자/숫자/_ 형태로 가정
    block_pat = re.compile(r"^POL-(\d+)\s+([A-Z0-9_]+)\s*\|\s*(.+)$", re.MULTILINE)
    field_pat = re.compile(
        r"^\s*(source|source_date|description|violation_criteria|action_type|ai_response_guide):\s*(.*)$"
    )

    blocks = list(block_pat.finditer(text))
    for i, m in enumerate(blocks):
        start = m.end()
        end = blocks[i + 1].start() if i + 1 < len(blocks) else len(text)
        block_text = text[start:end]

        pol_num = int(m.group(1))
        code = m.group(2)
        category_label = m.group(3).strip()
        pol_id = f"POL-{pol_num:03d}"

        rec: dict[str, Any] = {
            "id": pol_id,
            "code": code,
            "category": category_label,
            "source": "",
            "source_date": "",
            "description": "",
            "violation_criteria": "",
            "action_type": "BLOCK",
            "ai_response_guide": "",
            # keywords는 아래에서 fallback으로 보강
            "keywords": [],
        }

        for line in block_text.splitlines():
            fm = field_pat.match(line)
            if not fm:
                continue
            key = fm.group(1)
            val = fm.group(2).strip()
            if key in rec:
                rec[key] = val
        policies.append(rec)

    return metadata, policies


def load_keywords_from_db() -> dict[str, List[str]]:
    """board_banned_words 테이블에서 공통(board_id IS NULL) 금칙어를 category별로 조회한다."""
    try:
        from pupoo_ai.app.infrastructure.rds import db_connection, is_rds_configured
    except ImportError:
        print("[WARN] DB 모듈 임포트 실패 - DB 키워드 건너뜀")
        return {}

    if not is_rds_configured():
        print("[WARN] DB 미설정 - DB 키워드 건너뜀")
        return {}

    result: dict[str, List[str]] = {}
    try:
        with db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT category, banned_word "
                    "FROM board_banned_words "
                    "WHERE board_id IS NULL "
                    "ORDER BY category, banned_word_id"
                )
                for row in cur.fetchall():
                    cat = row["category"]
                    result.setdefault(cat, []).append(row["banned_word"])
        total = sum(len(v) for v in result.values())
        print(f"[INFO] DB에서 {len(result)}개 카테고리, 총 {total}개 키워드 로드 완료")
    except Exception as exc:
        print(f"[WARN] DB 키워드 조회 실패 - {exc}")
    return result


def load_fallback_keywords(fallback_json_path: Path) -> dict[str, List[str]]:
    if not fallback_json_path.exists():
        return {}
    try:
        data = json.loads(fallback_json_path.read_text(encoding="utf-8"))
    except Exception:
        return {}

    out: dict[str, List[str]] = {}
    for p in data.get("policies") or []:
        if not isinstance(p, dict):
            continue
        code = p.get("code")
        keywords = p.get("keywords") or []
        if isinstance(code, str) and isinstance(keywords, list):
            out[code] = [str(x) for x in keywords if x is not None]
    return out


def main() -> None:
    parser = argparse.ArgumentParser(
        description="정책 txt(Pupoo_Moderation_Policy_YYYYMMDD.txt)를 moderation_rules.json 포맷으로 변환"
    )
    parser.add_argument("input_txt", type=str, help="예: pupoo_ai/policy_docs/Pupoo_Moderation_Policy_20260317.txt")
    parser.add_argument(
        "--fallback-json",
        type=str,
        default="",
        help="keywords fallback용 JSON 경로(기본: scripts/moderation_rules.json)",
    )
    parser.add_argument(
        "--out",
        type=str,
        default="",
        help="출력 경로(기본: pupoo_ai/policy_docs/moderation_rules.json). 파일명은 고정.",
    )
    parser.add_argument(
        "--no-db",
        action="store_true",
        help="DB에서 키워드를 가져오지 않고 fallback JSON만 사용",
    )
    args = parser.parse_args()

    input_txt_path = Path(args.input_txt).resolve()
    if not input_txt_path.exists():
        raise SystemExit(f"Not found: {input_txt_path}")

    scripts_dir = Path(__file__).resolve().parent
    pupoo_ai_root = scripts_dir.parent
    policy_docs_dir = pupoo_ai_root / "policy_docs"

    out_path = Path(args.out).resolve() if args.out else (policy_docs_dir / "moderation_rules.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)

    fallback_path = Path(args.fallback_json).resolve() if args.fallback_json else (scripts_dir / "moderation_rules.json")
    fallback_keywords_by_code = load_fallback_keywords(fallback_path)

    db_keywords_by_category: dict[str, List[str]] = {}
    if not args.no_db:
        db_keywords_by_category = load_keywords_from_db()

    metadata, policies = parse_txt(input_txt_path)

    for p in policies:
        code = p.get("code", "")
        db_cat = CODE_TO_DB_CATEGORY.get(code)
        if db_cat and db_cat in db_keywords_by_category:
            p["keywords"] = db_keywords_by_category[db_cat]
        elif isinstance(code, str) and code in fallback_keywords_by_code:
            p["keywords"] = fallback_keywords_by_code[code]

    # 파일명은 고정이므로 “현재 변환 대상”을 metadata description으로 표시만 보강
    last_updated = metadata.get("last_updated") or input_txt_path.stem.split("_")[-1]
    metadata["last_updated"] = last_updated
    if not metadata.get("description"):
        metadata["description"] = "프로젝트 전체 정책 (txt → moderation_rules 변환)"

    out_obj = {"metadata": metadata, "policies": policies}
    out_path.write_text(json.dumps(out_obj, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Written: {out_path}")


if __name__ == "__main__":
    main()

