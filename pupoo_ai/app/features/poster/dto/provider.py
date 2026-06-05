from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


PosterFormat = Literal["png", "jpeg", "webp"]
PosterSize = Literal[
    "PORTRAIT_1024",
    "SQUARE_1024",
    "LANDSCAPE_1024",
    "PORTRAIT_1536",
]


class PosterProviderRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    size: PosterSize = Field(...)
    format: PosterFormat = Field(...)
    reference_image_urls: list[HttpUrl] = Field(default_factory=list)
    # 텍스트 합성용(자유 provider가 배경 위에 Pillow로 한글 텍스트를 얹는다).
    # 기존 provider(openai/bedrock/stub)는 무시한다.
    overlay_title: str | None = Field(default=None)
    overlay_subtitle: str | None = Field(default=None)
    overlay_date: str | None = Field(default=None)
    overlay_location: str | None = Field(default=None)
    tone: str | None = Field(default=None)
    primary_color: str | None = Field(default=None)
    secondary_color: str | None = Field(default=None)


class PosterProviderResult(BaseModel):
    image_bytes: bytes = Field(...)
    content_type: str = Field(..., min_length=1)
    provider: str = Field(..., min_length=1, max_length=64)
    model: str = Field(..., min_length=1, max_length=128)
    revised_prompt: str | None = Field(default=None)
    width: int = Field(..., ge=1, le=4096)
    height: int = Field(..., ge=1, le=4096)
    raw_metadata: dict = Field(default_factory=dict)
