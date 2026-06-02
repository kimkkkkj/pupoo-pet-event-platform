from __future__ import annotations

from typing import Any

import httpx

from pupoo_ai.app.core.config import settings


class BackendApiError(Exception):
    """Backend API request failed."""

    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


class BackendApiClient:
    """HTTP client for backend orchestration and grounded chatbot lookups."""

    def __init__(self, authorization: str | None = None):
        self._base_url = settings.backend_base_url.rstrip("/")
        self._authorization = authorization

    async def get_ai_summary(self) -> dict[str, Any]:
        return await self._request("GET", "/api/admin/ai/summary")

    async def get_ai_capabilities(self) -> dict[str, Any]:
        return await self._request("GET", "/api/admin/ai/capabilities")

    async def list_events(
        self,
        *,
        keyword: str | None = None,
        status: str | None = None,
        size: int = 20,
    ) -> list[dict[str, Any]]:
        response = await self._request(
            "GET",
            "/api/events",
            params={
                "page": 0,
                "size": size,
                "keyword": keyword,
                "status": status,
            },
        )
        return self._content_items(response)

    async def get_event(self, event_id: int) -> dict[str, Any]:
        return await self._request("GET", f"/api/events/{event_id}")

    async def list_programs(
        self,
        event_id: int,
        *,
        size: int = 10,
    ) -> list[dict[str, Any]]:
        response = await self._request(
            "GET",
            f"/api/events/{event_id}/programs",
            params={
                "page": 0,
                "size": size,
            },
        )
        return self._content_items(response)

    async def list_notices(self, *, keyword: str | None = None, size: int = 10) -> list[dict[str, Any]]:
        response = await self._request(
            "GET",
            "/api/notices",
            params={
                "page": 0,
                "size": size,
                "keyword": keyword,
            },
        )
        return self._content_items(response)

    async def get_notice(self, notice_id: int) -> dict[str, Any]:
        return await self._request("GET", f"/api/notices/{notice_id}")

    async def list_faqs(self, *, keyword: str | None = None, size: int = 10) -> list[dict[str, Any]]:
        response = await self._request(
            "GET",
            "/api/faqs",
            params={
                "page": 0,
                "size": size,
                "keyword": keyword,
            },
        )
        return self._content_items(response)

    async def get_faq(self, post_id: int) -> dict[str, Any]:
        return await self._request("GET", f"/api/faqs/{post_id}")

    async def create_notice(self, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._request("POST", "/api/admin/notices", json=payload)

    async def update_notice(self, notice_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._request("PATCH", f"/api/admin/notices/{notice_id}", json=payload)

    async def create_notification_draft(self, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._request("POST", "/api/admin/notifications", json=payload)

    async def update_notification_draft(self, notification_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._request("PUT", f"/api/admin/notifications/{notification_id}", json=payload)

    async def delete_notification_draft(self, notification_id: int) -> dict[str, Any]:
        return await self._request("DELETE", f"/api/admin/notifications/{notification_id}")

    async def send_notification(self, notification_id: int) -> dict[str, Any]:
        return await self._request("POST", f"/api/admin/notifications/{notification_id}/send")

    async def send_event_notification(self, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._request("POST", "/api/admin/notifications/event", json=payload)

    async def send_broadcast_notification(self, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._request("POST", "/api/admin/notifications/broadcast", json=payload)

    async def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if not self._base_url:
            raise BackendApiError("PUPOO_AI_BACKEND_BASE_URL setting is required.")

        headers = {"Content-Type": "application/json"}
        if self._authorization:
            headers["Authorization"] = self._authorization

        async with httpx.AsyncClient(
            base_url=self._base_url,
            timeout=settings.backend_timeout_seconds,
        ) as client:
            response = await client.request(
                method,
                path,
                params=params,
                json=json,
                headers=headers,
            )

        try:
            body = response.json()
        except ValueError as exc:  # pragma: no cover
            raise BackendApiError(
                "Backend response could not be parsed.",
                status_code=response.status_code,
            ) from exc

        if response.is_success:
            return body.get("data", body)

        message = (
            body.get("error", {}).get("message")
            or body.get("message")
            or body.get("data", {}).get("message")
            or "Backend request failed."
        )
        raise BackendApiError(str(message), status_code=response.status_code)

    def _content_items(self, response: dict[str, Any]) -> list[dict[str, Any]]:
        content = response.get("content")
        if isinstance(content, list):
            return [item for item in content if isinstance(item, dict)]
        return []
