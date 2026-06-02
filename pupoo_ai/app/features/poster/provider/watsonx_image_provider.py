from __future__ import annotations

from pupoo_ai.app.features.poster.dto.provider import PosterProviderRequest, PosterProviderResult
from pupoo_ai.app.features.poster.provider.provider_exceptions import (
    PosterProviderResponseError,
    PosterProviderUnavailableError,
)


class WatsonxPosterImageProvider:
    provider_name = "watsonx"

    def __init__(
        self,
        *,
        model: str,
        timeout_seconds: float = 20.0,
    ) -> None:
        self._model = model
        self._timeout_seconds = timeout_seconds

    def generate_image(self, request: PosterProviderRequest) -> PosterProviderResult:
        if not request.prompt.strip():
            raise PosterProviderResponseError(
                "이미지 생성 프롬프트가 비어 있어요.",
                provider=self.provider_name,
            )

        raise PosterProviderUnavailableError(
            "watsonx 이미지 생성 연동이 아직 연결되지 않았어요.",
            provider=self.provider_name,
        )
