"""AWS Bedrock 포스터 provider.

- 배경 그림: Bedrock 이미지 모델로 글자 없는 배경을 만든다.
  기본은 Stability Stable Image Core(us-west-2, 1장 약 $0.04). Nova Canvas는 AWS에서 레거시로 막혀 보조로만 둔다.
- 한글 제목/날짜/장소는 무료 provider와 같은 Pillow 포스터 틀로 얹는다(모델은 한글을 제대로 못 그린다).
- 챗봇과 같은 AWS 자격 증명을 쓰고, 모델이 있는 리전을 따로 둔다.
"""

from __future__ import annotations

import base64
import io
import json
import logging
import secrets
from functools import lru_cache

import boto3
from botocore.config import Config
from PIL import Image, ImageOps

from pupoo_ai.app.core.config import settings
from pupoo_ai.app.features.poster.dto.provider import PosterProviderRequest
from pupoo_ai.app.features.poster.provider.free_image_provider import (
    FreePosterImageProvider,
    _has_korean,
)
from pupoo_ai.app.features.poster.provider.provider_exceptions import (
    PosterProviderResponseError,
    PosterProviderUnavailableError,
)

logger = logging.getLogger(__name__)

_NEGATIVE = (
    "text, letters, words, typography, hangul, chinese characters, numbers, caption, signage, banner, "
    "logo, watermark, people, human, hands, deformed animals, extra limbs, blurry, low quality"
)


@lru_cache(maxsize=4)
def _client(region: str, timeout: float):
    return boto3.client(
        "bedrock-runtime",
        region_name=region,
        config=Config(read_timeout=timeout, connect_timeout=10, retries={"max_attempts": 1}),
    )


class BedrockPosterImageProvider(FreePosterImageProvider):
    provider_name = "bedrock"

    def __init__(
        self,
        *,
        model: str = "stability.stable-image-core-v1:1",
        region: str = "us-west-2",
        quality: str = "standard",
        timeout_seconds: float = 60.0,
    ) -> None:
        super().__init__(timeout_seconds=timeout_seconds)
        self._bedrock_model = model
        self._region = region
        self._quality = quality if quality in {"standard", "premium"} else "standard"

    @property
    def _is_stability(self) -> bool:
        return self._bedrock_model.startswith("stability.")

    def _model_label(self) -> str:
        return f"{self._bedrock_model}+pillow"

    def _scene_prompt(self, request: PosterProviderRequest, template: str) -> str:
        direction = (request.tone or "").strip()
        desc = (request.overlay_subtitle or "").strip()
        scene_raw = ", ".join(b for b in [direction, desc] if b)
        default_scene = "happy dogs and cats playing together at a sunny outdoor pet festival"
        scene = self._translate_to_english(scene_raw) if scene_raw else default_scene
        if _has_korean(scene):
            scene = default_scene
        colors = ", ".join(c for c in [request.primary_color, request.secondary_color] if c)
        parts = [
            "Festival poster artwork, adorable dogs and cats as the main subject.",
            f"{scene.rstrip('.')}.",
            "Polished modern illustration, vibrant yet soft colors, gentle cinematic light, rich detail, balanced composition.",
            self._space_hint(template),
        ]
        if colors:
            parts.append(f"Color palette {colors}.")
        # 모델 프롬프트 길이 제한(Nova 1024자)에 맞춘다.
        return " ".join(parts)[:1000]

    def _request_body(self, prompt: str) -> dict:
        seed = secrets.randbelow(4_294_967_294)
        if self._is_stability:
            # Stability는 3:4 비율이 없어 4:5로 만든 뒤 포스터 비율로 가운데를 잘라 쓴다.
            return {
                "prompt": prompt,
                "negative_prompt": _NEGATIVE,
                "aspect_ratio": "4:5",
                "output_format": "jpeg",
                "seed": seed,
            }
        # Nova Canvas: 768x1024(3:4)는 표준 요금 구간(1024x1024 이하)에 들어간다.
        return {
            "taskType": "TEXT_IMAGE",
            "textToImageParams": {"text": prompt, "negativeText": _NEGATIVE},
            "imageGenerationConfig": {
                "numberOfImages": 1,
                "width": 768,
                "height": 1024,
                "quality": self._quality,
                "cfgScale": 6.5,
                "seed": seed % 858_993_459,
            },
        }

    def _fetch_background(
        self, request: PosterProviderRequest, width: int, height: int, template: str = "band"
    ) -> Image.Image:
        body = self._request_body(self._scene_prompt(request, template))
        try:
            response = _client(self._region, self._timeout).invoke_model(
                modelId=self._bedrock_model,
                body=json.dumps(body),
                contentType="application/json",
                accept="application/json",
            )
            result = json.loads(response["body"].read())
        except Exception as exc:  # noqa: BLE001
            logger.warning("Bedrock image call failed. model=%s error=%s", self._bedrock_model, exc)
            raise PosterProviderUnavailableError(
                "Bedrock 이미지 모델 호출에 실패했어요. 모델 사용 권한과 리전을 확인해 주세요.",
                provider=self.provider_name,
            ) from exc

        images = result.get("images") or []
        # Stability는 finish_reasons에 필터링 사유를 담는다(None이면 정상).
        reasons = [r for r in (result.get("finish_reasons") or []) if r]
        if result.get("error") or not images or reasons:
            raise PosterProviderResponseError(
                f"이미지 모델이 그림을 돌려주지 않았어요: {result.get('error') or reasons or 'empty'}",
                provider=self.provider_name,
            )
        image = Image.open(io.BytesIO(base64.b64decode(images[0]))).convert("RGB")
        return ImageOps.fit(image, (width, height), Image.LANCZOS)


def build_bedrock_provider() -> BedrockPosterImageProvider:
    return BedrockPosterImageProvider(
        model=settings.poster_bedrock_model,
        region=settings.poster_bedrock_region or settings.aws_region,
        quality=settings.poster_bedrock_quality,
        timeout_seconds=settings.poster_timeout_seconds,
    )
