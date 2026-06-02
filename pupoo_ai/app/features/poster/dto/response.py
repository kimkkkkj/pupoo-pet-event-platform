from pydantic import BaseModel, ConfigDict, Field


class PosterGenerateResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    image_url: str = Field(..., serialization_alias="imageUrl")
    storage_key: str = Field(..., min_length=1, max_length=512, serialization_alias="storageKey")
    prompt_used: str = Field(..., min_length=1, serialization_alias="promptUsed")
    revised_prompt: str | None = Field(default=None, serialization_alias="revisedPrompt")
    provider: str = Field(..., min_length=1, max_length=64)
    model: str = Field(..., min_length=1, max_length=128)
    width: int = Field(..., ge=1, le=4096)
    height: int = Field(..., ge=1, le=4096)
    stored_name: str | None = Field(default=None, serialization_alias="storedName")
