from typing import Protocol

from pupoo_ai.app.features.poster.dto.provider import PosterProviderRequest, PosterProviderResult


class PosterImageProvider(Protocol):
    provider_name: str

    def generate_image(
        self,
        request: PosterProviderRequest,
    ) -> PosterProviderResult:
        ...
