from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator


PosterSize = Literal[
    "PORTRAIT_1024",
    "SQUARE_1024",
    "LANDSCAPE_1024",
    "PORTRAIT_1536",
]

PosterFormat = Literal["png", "jpeg", "webp"]


class PosterGenerateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    title: str | None = Field(default=None, min_length=1, max_length=120)
    subtitle: str | None = Field(default=None, max_length=200)
    date_text: str | None = Field(default=None, max_length=80)
    location_text: str | None = Field(default=None, max_length=120)
    tone: str | None = Field(default=None, max_length=80)
    primary_color: str | None = Field(default=None, max_length=32)
    secondary_color: str | None = Field(default=None, max_length=32)
    required_copy: list[str] = Field(default_factory=list, max_length=10)
    reference_image_urls: list[HttpUrl] = Field(default_factory=list, max_length=5)
    size: PosterSize = Field(default="PORTRAIT_1024")
    format: PosterFormat = Field(default="png")
    event_id: int | None = Field(default=None, ge=1)
    campaign_id: int | None = Field(default=None, ge=1)
    language: str | None = Field(default="ko", max_length=12)
    style_keywords: list[str] = Field(default_factory=list, max_length=12)
    negative_keywords: list[str] = Field(default_factory=list, max_length=12)
    metadata: dict = Field(default_factory=dict)

    # Legacy backend compatibility
    event_name: str | None = Field(default=None, alias="eventName", max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    start_at: datetime | None = Field(default=None, alias="startAt")
    end_at: datetime | None = Field(default=None, alias="endAt")
    location: str | None = Field(default=None, max_length=255)
    extra_prompt: str | None = Field(default=None, alias="extraPrompt", max_length=1000)

    @model_validator(mode="after")
    def normalize_fields(self) -> "PosterGenerateRequest":
        self.title = (self.title or self.event_name or "").strip() or None
        self.subtitle = (self.subtitle or self.description or "").strip() or None
        self.location_text = (self.location_text or self.location or "").strip() or None
        self.tone = (self.tone or self.extra_prompt or "").strip() or None
        self.language = (self.language or "").strip() or "ko"
        self.required_copy = [item.strip() for item in self.required_copy if item and item.strip()]
        self.style_keywords = [item.strip() for item in self.style_keywords if item and item.strip()]
        self.negative_keywords = [item.strip() for item in self.negative_keywords if item and item.strip()]
        if not self.title:
            raise ValueError("title must not be blank")
        return self
