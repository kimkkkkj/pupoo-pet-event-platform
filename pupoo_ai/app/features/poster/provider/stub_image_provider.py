from __future__ import annotations

from pupoo_ai.app.features.poster.dto.provider import PosterProviderRequest, PosterProviderResult


_SIZE_TO_DIMENSIONS = {
    "PORTRAIT_1024": (1024, 1536),
    "SQUARE_1024": (1024, 1024),
    "LANDSCAPE_1024": (1536, 1024),
    "PORTRAIT_1536": (1536, 2048),
}

_FORMAT_TO_CONTENT_TYPE = {
    "png": "image/png",
    "jpeg": "image/jpeg",
    "webp": "image/webp",
}


class StubPosterImageProvider:
    provider_name = "stub"

    def __init__(self, model: str = "stub-poster-model") -> None:
        self._model = model

    def generate_image(self, request: PosterProviderRequest) -> PosterProviderResult:
        width, height = _SIZE_TO_DIMENSIONS[request.size]
        content_type = _FORMAT_TO_CONTENT_TYPE[request.format]
        fake_image_bytes = f"stub:{request.prompt}".encode("utf-8")

        return PosterProviderResult(
            image_bytes=fake_image_bytes,
            content_type=content_type,
            provider=self.provider_name,
            model=self._model,
            revised_prompt=request.prompt,
            width=width,
            height=height,
            raw_metadata={
                "size": request.size,
                "format": request.format,
                "referenceImageCount": len(request.reference_image_urls),
            },
        )
