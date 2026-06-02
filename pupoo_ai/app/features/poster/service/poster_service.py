import logging
from functools import lru_cache
from pathlib import Path
from typing import Callable

from pupoo_ai.app.core.config import settings
from pupoo_ai.app.features.poster.dto.provider import PosterProviderRequest
from pupoo_ai.app.features.poster.dto.request import PosterGenerateRequest
from pupoo_ai.app.features.poster.dto.response import PosterGenerateResponse
from pupoo_ai.app.features.poster.prompts.poster_prompt_builder import (
    PosterPromptBuildResult,
    PosterPromptInput,
    build_poster_prompt,
)
from pupoo_ai.app.features.poster.provider.bedrock_image_provider import (
    BedrockPosterImageProvider,
)
from pupoo_ai.app.features.poster.provider.image_provider import PosterImageProvider
from pupoo_ai.app.features.poster.provider.openai_image_provider import (
    OpenAIPosterImageProvider,
)
from pupoo_ai.app.features.poster.provider.provider_exceptions import (
    PosterProviderError,
)
from pupoo_ai.app.features.poster.provider.stub_image_provider import (
    StubPosterImageProvider,
)
from pupoo_ai.app.infrastructure.poster_storage import (
    PosterObjectStorageAdapter,
    resolve_public_url,
)
from pupoo_ai.app.infrastructure.storage import StorageAdapter, StorageReference

logger = logging.getLogger(__name__)


class PosterStorageError(Exception):
    def __init__(self, message: str, *, cause: Exception | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.cause = cause


class PosterService:
    def __init__(
        self,
        *,
        image_provider: PosterImageProvider,
        storage_adapter: StorageAdapter,
        prompt_builder: Callable[
            [PosterPromptInput],
            PosterPromptBuildResult,
        ] = build_poster_prompt,
        image_url_resolver: Callable[[StorageReference], str] | None = None,
    ) -> None:
        self._image_provider = image_provider
        self._storage_adapter = storage_adapter
        self._prompt_builder = prompt_builder
        self._image_url_resolver = image_url_resolver

    def generate_poster(
        self,
        request: PosterGenerateRequest,
    ) -> PosterGenerateResponse:
        validated = self._validate_request(request)

        logger.info(
            "Poster generation started. title=%s size=%s format=%s references=%d",
            validated.title,
            validated.size,
            validated.format,
            len(validated.reference_image_urls or []),
        )

        prompt_input = PosterPromptInput(
            title=validated.title,
            subtitle=validated.subtitle,
            date_text=validated.date_text,
            location_text=validated.location_text,
            tone=validated.tone,
            primary_color=validated.primary_color,
            secondary_color=validated.secondary_color,
            required_copy=validated.required_copy,
            reference_image_urls=[str(url) for url in validated.reference_image_urls],
            event_name=validated.event_name,
            description=validated.description,
            start_at=validated.start_at,
            end_at=validated.end_at,
            location=validated.location,
            extra_prompt=validated.extra_prompt,
        )
        prompt_result = self._prompt_builder(prompt_input)

        logger.info(
            "Poster prompt built. title=%s prompt_length=%d",
            validated.title,
            len(prompt_result.final_prompt),
        )

        provider_request = PosterProviderRequest(
            prompt=prompt_result.final_prompt,
            size=validated.size,
            format=validated.format,
            reference_image_urls=validated.reference_image_urls,
        )

        try:
            provider_result = self._image_provider.generate_image(provider_request)
        except PosterProviderError:
            logger.exception(
                "Poster provider failed. title=%s provider=%s",
                validated.title,
                getattr(self._image_provider, "provider_name", "unknown"),
            )
            raise
        except Exception as exc:
            logger.exception(
                "Poster provider failed unexpectedly. title=%s provider=%s",
                validated.title,
                getattr(self._image_provider, "provider_name", "unknown"),
            )
            raise PosterProviderError(
                "포스터 이미지를 생성하지 못했습니다.",
                provider=getattr(self._image_provider, "provider_name", None),
                cause=exc,
            ) from exc

        logger.info(
            "Poster image generated. title=%s provider=%s model=%s width=%s height=%s",
            validated.title,
            provider_result.provider,
            provider_result.model,
            provider_result.width,
            provider_result.height,
        )

        key_hint = f"{validated.title}.{validated.format}"

        try:
            storage_ref = self._storage_adapter.store_generated_file(
                content=provider_result.image_bytes,
                content_type=provider_result.content_type,
                key_hint=key_hint,
            )
        except Exception as exc:
            logger.exception(
                "Poster storage failed. title=%s provider=%s key_hint=%s",
                validated.title,
                provider_result.provider,
                key_hint,
            )
            raise PosterStorageError(
                "생성된 포스터 파일을 저장하지 못했습니다.",
                cause=exc,
            ) from exc

        logger.info(
            "Poster image stored. title=%s storage_key=%s",
            validated.title,
            storage_ref.key,
        )

        return PosterGenerateResponse(
            image_url=self._resolve_image_url(storage_ref),
            storage_key=storage_ref.key,
            prompt_used=prompt_result.final_prompt,
            revised_prompt=provider_result.revised_prompt,
            provider=provider_result.provider,
            model=provider_result.model,
            width=provider_result.width,
            height=provider_result.height,
            stored_name=Path(storage_ref.key).name,
        )

    def _validate_request(self, request: PosterGenerateRequest) -> PosterGenerateRequest:
        title = request.title.strip()
        if not title:
            raise ValueError("title must not be blank")
        return request.model_copy(update={"title": title})

    def _resolve_image_url(self, storage_ref: StorageReference) -> str:
        if self._image_url_resolver is not None:
            return self._image_url_resolver(storage_ref)
        return storage_ref.key


def _build_provider() -> PosterImageProvider:
    provider_name = (settings.poster_provider or "stub").strip().lower()
    if provider_name == "openai":
        return OpenAIPosterImageProvider(
            model=settings.poster_openai_model,
            timeout_seconds=settings.poster_timeout_seconds,
        )
    if provider_name == "bedrock":
        return BedrockPosterImageProvider(
            model=settings.poster_bedrock_model,
            timeout_seconds=settings.poster_timeout_seconds,
        )
    return StubPosterImageProvider()


@lru_cache(maxsize=1)
def get_poster_service() -> PosterService:
    return PosterService(
        image_provider=_build_provider(),
        storage_adapter=PosterObjectStorageAdapter(base_dir=Path.cwd()),
        image_url_resolver=lambda reference: resolve_public_url(reference.key),
    )
