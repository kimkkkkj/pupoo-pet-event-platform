"""모더레이션 내부 API 요청/응답 스키마."""

from pydantic import BaseModel, Field


class ModerateRequest(BaseModel):
    content: str | None = Field(default=None, description="검사할 본문")
    text: str | None = Field(default=None, description="하위 호환 본문 필드")
    board_type: str | None = Field(default=None, description="게시판 구분")
    content_type: str | None = Field(default=None, description="하위 호환 게시글 구분")
    board_id: int | None = Field(default=None, description="게시판 ID")
    metadata: dict = Field(default_factory=dict, description="추가 메타데이터")


class ModerateResponse(BaseModel):
    decision: str = Field(default="ALLOW", description="ALLOW, WARN, REVIEW, BLOCK")
    result: str = Field(..., description="기존 호환용 PASS 또는 BLOCK")
    action: str = Field(..., description="기존 호환용 PASS 또는 BLOCK")
    reason: str | None = Field(default=None, description="판정 사유")
    score: float | None = Field(default=None, description="판정 점수")
    ai_score: float | None = Field(default=None, description="하위 호환 점수")
    stack: str = Field(default="rag_watsonx", description="처리 스택")
    flagged_phrases: list[str] | None = Field(default=None, description="입력에서 직접 확인한 문제 표현")
    inferred_phrases: list[str] | None = Field(default=None, description="정책 문맥으로 추론한 문제 표현")
