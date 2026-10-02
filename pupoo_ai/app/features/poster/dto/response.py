from pydantic import BaseModel, ConfigDict, Field


class PosterGenerateResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    image_url: str = Field(default="", serialization_alias="imageUrl")
    storage_key: str = Field(default="", max_length=512, serialization_alias="storageKey")
    prompt_used: str = Field(..., min_length=1, serialization_alias="promptUsed")
    revised_prompt: str | None = Field(default=None, serialization_alias="revisedPrompt")
    provider: str = Field(..., min_length=1, max_length=64)
    model: str = Field(..., min_length=1, max_length=128)
    width: int = Field(..., ge=1, le=4096)
    height: int = Field(..., ge=1, le=4096)
    stored_name: str | None = Field(default=None, serialization_alias="storedName")
    # poster_return_image 모드: 저장 대신 완성 이미지를 돌려준다.
    image_base64: str | None = Field(default=None, serialization_alias="imageBase64")
    content_type: str | None = Field(default=None, serialization_alias="contentType")
