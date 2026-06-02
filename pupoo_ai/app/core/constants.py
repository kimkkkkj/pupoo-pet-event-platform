"""AI 서비스 공통 상수.

기능:
- 내부 라우트 prefix, 헤더명, 응답 코드 상수를 모아둔다.
"""

INTERNAL_API_PREFIX = "/internal"
HEADER_INTERNAL_TOKEN = "X-Internal-Token"
HEADER_TRACE_ID = "X-Trace-Id"

SUCCESS_CODE = "OK"
ERROR_VALIDATION = "VALIDATION_ERROR"
ERROR_UNAUTHORIZED = "UNAUTHORIZED"
ERROR_INTERNAL = "INTERNAL_SERVER_ERROR"
