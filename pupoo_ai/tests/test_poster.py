import sys
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[2]))

from pupoo_ai.app.api.routers.poster import _handle_generate  # noqa: E402
from pupoo_ai.app.features.poster.dto.provider import PosterProviderResult  # noqa: E402
from pupoo_ai.app.features.poster.dto.request import PosterGenerateRequest  # noqa: E402
from pupoo_ai.app.features.poster.prompts.poster_prompt_builder import (  # noqa: E402
    PosterPromptInput,
    build_poster_prompt,
)
from pupoo_ai.app.features.poster.provider.provider_exceptions import (  # noqa: E402
    PosterProviderError,
)
from pupoo_ai.app.features.poster.service.poster_service import (  # noqa: E402
    PosterService,
    PosterStorageError,
)
from pupoo_ai.app.infrastructure.storage import StorageReference  # noqa: E402


class PosterPromptBuilderTest(unittest.TestCase):
    def test_prompt_builder_includes_required_copy(self):
        result = build_poster_prompt(
            PosterPromptInput(
                title="펫 멤버십 페스티벌",
                required_copy=["사전 예약 필수", "입장 무료"],
            )
        )

        self.assertIn("사전 예약 필수", result.final_prompt)
        self.assertIn("입장 무료", result.final_prompt)
        self.assertEqual(
            result.debug_payload["required_copy"],
            ["사전 예약 필수", "입장 무료"],
        )

    def test_prompt_builder_supports_legacy_background_prompt(self):
        result = build_poster_prompt(
            PosterPromptInput(
                title="펫 멤버십 페스티벌",
                event_name="펫 멤버십 페스티벌",
                description="반려견과 함께하는 야외 행사",
                location="서울 월드광장",
                extra_prompt="밝고 프리미엄",
                start_at="2026-04-20T10:00:00",
                end_at="2026-04-20T18:00:00",
            )
        )

        self.assertIn("background art only", result.final_prompt)
        self.assertEqual(result.debug_payload["mode"], "legacy_background")


class FakeProvider:
    provider_name = "fake"

    def __init__(self) -> None:
        self.calls = []

    def generate_image(self, request):
        self.calls.append(request)
        return PosterProviderResult(
            image_bytes=b"fake-image",
            content_type="image/png",
            provider="fake",
            model="fake-model",
            revised_prompt="revised prompt",
            width=1024,
            height=1536,
            raw_metadata={"trace": "ok"},
        )


class FailingProvider:
    provider_name = "failing"

    def generate_image(self, request):
        raise PosterProviderError("provider failed", provider="failing")


class FakeStorageAdapter:
    def __init__(self) -> None:
        self.calls = []

    def store_generated_file(
        self,
        *,
        content: bytes,
        content_type: str,
        key_hint: str | None = None,
    ):
        self.calls.append(
            {
                "content": content,
                "content_type": content_type,
                "key_hint": key_hint,
            }
        )
        return StorageReference(
            key="posters/generated/2026/03/poster.png",
            internal_path="/tmp/poster.png",
        )


class FailingStorageAdapter:
    def store_generated_file(
        self,
        *,
        content: bytes,
        content_type: str,
        key_hint: str | None = None,
    ):
        raise RuntimeError("storage failed")


class PosterServiceTest(unittest.TestCase):
    def _make_request(self) -> PosterGenerateRequest:
        return PosterGenerateRequest(
            title="펫 멤버십 페스티벌",
            subtitle="반려견과 함께하는 야외 행사",
            date_text="2026.04.20",
            location_text="서울 월드광장",
            tone="밝고 가족친화적",
            primary_color="#FFAA00",
            secondary_color="#0055FF",
            required_copy=["사전 예약 필수"],
            reference_image_urls=["https://example.com/reference.png"],
            size="PORTRAIT_1024",
            format="png",
        )

    def test_service_stores_provider_result_and_returns_response(self):
        provider = FakeProvider()
        storage = FakeStorageAdapter()
        service = PosterService(image_provider=provider, storage_adapter=storage)

        response = service.generate_poster(self._make_request())

        self.assertEqual(len(provider.calls), 1)
        self.assertEqual(len(storage.calls), 1)
        self.assertEqual(storage.calls[0]["content"], b"fake-image")
        self.assertEqual(storage.calls[0]["content_type"], "image/png")
        self.assertEqual(response.image_url, "posters/generated/2026/03/poster.png")
        self.assertEqual(response.storage_key, "posters/generated/2026/03/poster.png")
        self.assertTrue(response.prompt_used)
        self.assertEqual(response.revised_prompt, "revised prompt")
        self.assertEqual(response.provider, "fake")
        self.assertEqual(response.model, "fake-model")
        self.assertEqual(response.width, 1024)
        self.assertEqual(response.height, 1536)

    def test_service_maps_provider_failure(self):
        storage = FakeStorageAdapter()
        service = PosterService(
            image_provider=FailingProvider(),
            storage_adapter=storage,
        )

        with self.assertRaises(PosterProviderError):
            service.generate_poster(self._make_request())

        self.assertEqual(len(storage.calls), 0)

    def test_service_maps_storage_failure(self):
        service = PosterService(
            image_provider=FakeProvider(),
            storage_adapter=FailingStorageAdapter(),
        )

        with self.assertRaises(PosterStorageError):
            service.generate_poster(self._make_request())


class PosterRouterTest(unittest.TestCase):
    def test_router_maps_provider_error(self):
        response = _handle_generate(
            PosterGenerateRequest(title="펫 멤버십 페스티벌"),
            PosterService(
                image_provider=FailingProvider(),
                storage_adapter=FakeStorageAdapter(),
            ),
        )

        self.assertEqual(response.status_code, 502)
        self.assertIn("provider_error", response.body.decode("utf-8"))


if __name__ == "__main__":
    unittest.main()
