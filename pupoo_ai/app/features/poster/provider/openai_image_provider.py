from __future__ import annotations

import base64
import io
import os

from openai import APITimeoutError, OpenAI, OpenAIError
from PIL import Image

from pupoo_ai.app.core.config import settings
from pupoo_ai.app.features.poster.dto.provider import PosterProviderRequest, PosterProviderResult
from pupoo_ai.app.features.poster.provider.provider_exceptions import (
    PosterProviderResponseError,
    PosterProviderTimeoutError,
    PosterProviderUnavailableError,
)


_SIZE_TO_OPENAI = {
    "PORTRAIT_1024": "1024x1792",
    "PORTRAIT_1536": "1024x1792",
    "SQUARE_1024": "1024x1024",
    "LANDSCAPE_1024": "1792x1024",
}


class OpenAIPosterImageProvider:
    provider_name = "openai"

    def __init__(self, *, model: str, timeout_seconds: float = 20.0) -> None:
        api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
        if not api_key:
            raise PosterProviderUnavailableError(
                "OpenAI API 키가 설정되지 않았어요.",
                provider=self.provider_name,
            )

        base_url = (settings.poster_openai_base_url or "").strip() or None
        client_kwargs = {"api_key": api_key, "timeout": timeout_seconds}
        if base_url:
            client_kwargs["base_url"] = base_url

        self._client = OpenAI(**client_kwargs)
        self._model = model

    def generate_image(self, request: PosterProviderRequest) -> PosterProviderResult:
        if not request.prompt.strip():
            raise PosterProviderResponseError(
                "이미지 생성 프롬프트가 비어 있어요.",
                provider=self.provider_name,
            )

        try:
            response = self._client.images.generate(
                model=self._model,
                prompt=request.prompt,
                size=_SIZE_TO_OPENAI[request.size],
                quality="standard",
                n=1,
                response_format="b64_json",
            )
        except APITimeoutError as exc:
            raise PosterProviderTimeoutError(
                "포스터 이미지 생성 시간이 초과되었어요.",
                provider=self.provider_name,
                cause=exc,
            ) from exc
        except OpenAIError as exc:
            raise PosterProviderUnavailableError(
                "OpenAI 이미지 생성 호출에 실패했어요.",
                provider=self.provider_name,
                cause=exc,
            ) from exc

        if not response or not response.data:
            raise PosterProviderResponseError(
                "OpenAI 이미지 생성 응답이 비어 있어요.",
                provider=self.provider_name,
            )

        item = response.data[0]
        if getattr(item, "b64_json", None):
            raw_bytes = base64.b64decode(item.b64_json)
        else:
            raise PosterProviderResponseError(
                "OpenAI 이미지 데이터가 비어 있어요.",
                provider=self.provider_name,
            )

        normalized_bytes, width, height = self._normalize_image(raw_bytes)

        return PosterProviderResult(
            image_bytes=normalized_bytes,
            content_type="image/png",
            provider=self.provider_name,
            model=self._model,
            revised_prompt=getattr(item, "revised_prompt", None),
            width=width,
            height=height,
            raw_metadata={"size": request.size, "openai_size": _SIZE_TO_OPENAI[request.size]},
        )

    def _normalize_image(self, image_bytes: bytes) -> tuple[bytes, int, int]:
        source = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
        target_width = settings.poster_default_width
        target_height = settings.poster_default_height

        scale = max(target_width / source.width, target_height / source.height)
        draw_width = int(round(source.width * scale))
        draw_height = int(round(source.height * scale))
        offset_x = (target_width - draw_width) // 2
        vertical_overflow = max(0, draw_height - target_height)
        offset_y = -(vertical_overflow // 4)

        resized = source.resize((draw_width, draw_height), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (target_width, target_height), (8, 12, 20, 255))
        canvas.alpha_composite(resized, (offset_x, offset_y))

        output = io.BytesIO()
        canvas.save(output, format="PNG")
        return output.getvalue(), target_width, target_height
