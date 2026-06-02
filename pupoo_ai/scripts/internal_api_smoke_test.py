"""내부 API smoke test 준비 및 실행 스크립트.

실행 예시:
  .venv\Scripts\python.exe scripts\internal_api_smoke_test.py --print-only
  .venv\Scripts\python.exe scripts\internal_api_smoke_test.py --print-curl
  set PUPOO_AI_SMOKE_BASE_URL=http://127.0.0.1:8000
  set PUPOO_AI_SMOKE_INTERNAL_TOKEN=YOUR_INTERNAL_TOKEN_HERE
  .venv\Scripts\python.exe scripts\internal_api_smoke_test.py --run
"""

from __future__ import annotations

import argparse
import json
import os
from dataclasses import dataclass

import httpx

HEADER_INTERNAL_TOKEN = "X-Internal-Token"
DEFAULT_BASE_URL = os.getenv("PUPOO_AI_SMOKE_BASE_URL", "http://127.0.0.1:8000")
DEFAULT_TOKEN_PLACEHOLDER = "YOUR_INTERNAL_TOKEN_HERE"


@dataclass(frozen=True)
class SmokeCase:
    name: str
    path: str
    body: dict
    success_expectation: str
    failure_expectation: str


SMOKE_CASES = (
    SmokeCase(
        name="user_chatbot",
        path="/internal/chatbot/chat",
        body={
            "message": "행사 안내 도와줘",
            "history": [],
            "context": {"route": "/", "role": "user"},
        },
        success_expectation="200 OK, success=true, data.message 존재",
        failure_expectation="토큰 누락 또는 불일치 시 403",
    ),
    SmokeCase(
        name="admin_chatbot",
        path="/internal/admin/chatbot/chat",
        body={
            "message": "공지 초안 작성 도와줘",
            "history": [],
            "context": {"route": "/admin/dashboard", "role": "admin"},
        },
        success_expectation="200 OK, success=true, data.message 존재",
        failure_expectation="토큰 누락 또는 불일치 시 403",
    ),
    SmokeCase(
        name="moderate_legacy",
        path="/internal/moderate",
        body={
            "content": "오늘은 반려견과 산책했어요.",
            "board_type": "FREE",
            "metadata": {"source": "smoke-test"},
        },
        success_expectation="200 OK, decision/result/action 필드 존재",
        failure_expectation="토큰 누락 또는 불일치 시 403",
    ),
    SmokeCase(
        name="moderate_check",
        path="/internal/moderation/check",
        body={
            "content": "오늘은 반려견과 산책했어요.",
            "board_type": "FREE",
            "metadata": {"source": "smoke-test"},
        },
        success_expectation="200 OK, decision/result/action 필드 존재",
        failure_expectation="토큰 누락 또는 불일치 시 403",
    ),
)


def print_cases(base_url: str) -> None:
    print(f"[smoke] base_url={base_url}")
    print(f"[smoke] header={HEADER_INTERNAL_TOKEN}: {DEFAULT_TOKEN_PLACEHOLDER}")
    print()
    for case in SMOKE_CASES:
        print(f"- {case.name}")
        print(f"  path: {case.path}")
        print(f"  success: {case.success_expectation}")
        print(f"  failure: {case.failure_expectation}")
        print("  body:")
        print(json.dumps(case.body, ensure_ascii=False, indent=2))
        print()


def print_curl_examples(base_url: str) -> None:
    print(f"[smoke] base_url={base_url}")
    print(f"[smoke] header={HEADER_INTERNAL_TOKEN}: {DEFAULT_TOKEN_PLACEHOLDER}")
    print()
    for case in SMOKE_CASES:
        body_json = json.dumps(case.body, ensure_ascii=False)
        print(f"# {case.name}")
        print(
            "curl -X POST "
            f"\"{base_url}{case.path}\" "
            f"-H \"Content-Type: application/json\" "
            f"-H \"{HEADER_INTERNAL_TOKEN}: {DEFAULT_TOKEN_PLACEHOLDER}\" "
            f"-d '{body_json}'"
        )
        print(f"# 기대 성공 결과: {case.success_expectation}")
        print(f"# 기대 실패 결과: {case.failure_expectation}")
        print()


def run_cases(base_url: str, token: str) -> int:
    headers = {
        HEADER_INTERNAL_TOKEN: token,
        "Content-Type": "application/json",
    }

    with httpx.Client(base_url=base_url, timeout=10.0) as client:
        for case in SMOKE_CASES:
            response = client.post(case.path, json=case.body, headers=headers)
            print(f"[smoke] {case.name}: status={response.status_code}")
            try:
                payload = response.json()
            except ValueError:
                print("[smoke] JSON 응답이 아닙니다.")
                return 1

            print(json.dumps(payload, ensure_ascii=False, indent=2))

            if response.status_code != 200:
                print(f"[smoke] 실패: 기대 상태는 200입니다. actual={response.status_code}")
                return 1

            if case.path.startswith("/internal/moderat"):
                data = payload.get("data") if isinstance(payload, dict) else None
                target = data or payload
                for key in ("decision", "result", "action"):
                    if key not in target:
                        print(f"[smoke] 실패: moderation 응답에 {key} 필드가 없습니다.")
                        return 1
            else:
                if not isinstance(payload, dict) or payload.get("success") is not True:
                    print("[smoke] 실패: chatbot 응답에서 success=true를 확인하지 못했습니다.")
                    return 1

    print("[smoke] 모든 내부 API smoke test가 통과했습니다.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="PUPOO AI 내부 API smoke test 도구")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="AI 서비스 base URL")
    parser.add_argument("--token", default=os.getenv("PUPOO_AI_SMOKE_INTERNAL_TOKEN", DEFAULT_TOKEN_PLACEHOLDER))
    parser.add_argument("--print-only", action="store_true", help="실행하지 않고 케이스만 출력")
    parser.add_argument("--print-curl", action="store_true", help="실행하지 않고 curl 예시만 출력")
    parser.add_argument("--run", action="store_true", help="실제 HTTP 요청 실행")
    args = parser.parse_args()

    if args.print_only:
        print_cases(args.base_url)
        return 0
    if args.print_curl:
        print_curl_examples(args.base_url)
        return 0
    if not args.run:
        print_cases(args.base_url)
        return 0

    if not args.token or args.token == DEFAULT_TOKEN_PLACEHOLDER:
        print("[smoke] 실행을 위해 실제 내부 토큰을 --token 또는 PUPOO_AI_SMOKE_INTERNAL_TOKEN으로 지정해 주세요.")
        return 1

    return run_cases(args.base_url, args.token)


if __name__ == "__main__":
    raise SystemExit(main())
