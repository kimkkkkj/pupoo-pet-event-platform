"""공통 미들웨어.

기능:
- 모든 HTTP 요청에 trace ID를 주입하고 응답 헤더로 되돌린다.
"""

from uuid import uuid4

from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from pupoo_ai.app.core.constants import HEADER_TRACE_ID
from pupoo_ai.app.core.logger import reset_trace_id, set_trace_id


class TraceIdMiddleware:
    # 기능: 요청 단위 trace ID를 생성하고 전파한다.
    # 설명: 클라이언트가 보낸 trace ID가 있으면 재사용하고, 없으면 새로 만든다.
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        # 기능: HTTP 요청에만 trace ID 문맥을 적용한다.
        # 설명: 응답 시작 시 동일 trace ID를 헤더에 넣어 서버-클라이언트 추적을 맞춘다.
        # 흐름: 요청 헤더 확인 -> trace ID 저장 -> 응답 헤더 주입 -> 컨텍스트 정리.
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        trace_id = Headers(scope=scope).get(HEADER_TRACE_ID) or str(uuid4())
        scope.setdefault("state", {})["trace_id"] = trace_id
        token = set_trace_id(trace_id)

        async def send_with_trace(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = message.setdefault("headers", [])
                mutable_headers = MutableHeaders(raw=headers)
                mutable_headers[HEADER_TRACE_ID] = trace_id
            await send(message)

        try:
            await self.app(scope, receive, send_with_trace)
        finally:
            reset_trace_id(token)
