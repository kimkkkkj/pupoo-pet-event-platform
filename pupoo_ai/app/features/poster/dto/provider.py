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


class PosterProviderResult(BaseModel):
    image_bytes: bytes = Field(...)
    content_type: str = Field(..., min_length=1)
    provider: str = Field(..., min_length=1, max_length=64)
    model: str = Field(..., min_length=1, max_length=128)
    revised_prompt: str | None = Field(default=None)
    width: int = Field(..., ge=1, le=4096)
    height: int = Field(..., ge=1, le=4096)
    raw_metadata: dict = Field(default_factory=dict)
