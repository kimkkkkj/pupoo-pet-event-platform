from pydantic import BaseModel, Field


class MessageItem(BaseModel):
    role: str = Field(..., description="'user' 또는 'assistant'")
    content: str = Field(..., description="메시지 내용")


class NoticeDraftContext(BaseModel):
    notice_id: int | None = Field(default=None, alias="noticeId")
    title: str = ""
    content: str = ""
    pinned: bool = False
    scope: str = "ALL"
    event_id: int | None = Field(default=None, alias="eventId")
    status: str = "PUBLISHED"


class NotificationDraftContext(BaseModel):
    notification_id: int | None = Field(default=None, alias="notificationId")
    title: str = ""
    content: str = ""
    status: str = "DRAFT"
    notification_type: str = Field(default="EVENT", alias="notificationType")
    alert_mode: str = Field(default="event", alias="alertMode")
    event_id: int | None = Field(default=None, alias="eventId")
    event_name: str = Field(default="", alias="eventName")
    event_status: str = Field(default="", alias="eventStatus")
    alert_target_label: str = Field(default="", alias="alertTargetLabel")
    special_target_key: str = Field(default="", alias="specialTargetKey")
    target_type: str | None = Field(default=None, alias="targetType")
    target_id: int | None = Field(default=None, alias="targetId")
    channels: list[str] = Field(default_factory=list)
    recipient_scope: str | None = Field(default=None, alias="recipientScope")
    recipient_scopes: list[str] = Field(default_factory=list, alias="recipientScopes")


class ExecutionContext(BaseModel):
    supported: bool = False
    action: str | None = None
    execute_type: str | None = Field(default=None, alias="executeType")
    target_type: str | None = Field(default=None, alias="targetType")
    status: str | None = None
    reason: str | None = None
    requested_action: str | None = Field(default=None, alias="requestedAction")
    unsupported_actions: list[str] = Field(default_factory=list, alias="unsupportedActions")
    supported_execute_types: list[str] = Field(default_factory=list, alias="supportedExecuteTypes")


class ChatContext(BaseModel):
    current_page: str = Field(default="", alias="currentPage")
    route: str = ""
    role: str = Field(default="user", description="'admin' 또는 'user'")
    last_event_id: int | None = Field(default=None, alias="lastEventId")
    last_event_name: str = Field(default="", alias="lastEventName")
    last_topic: str = Field(default="", alias="lastTopic")
    last_notice_id: int | None = Field(default=None, alias="lastNoticeId")
    last_faq_id: int | None = Field(default=None, alias="lastFaqId")
    last_summary_type: str = Field(default="", alias="lastSummaryType")
    notice_draft: NoticeDraftContext | None = Field(default=None, alias="noticeDraft")
    notice_execution: ExecutionContext | None = Field(default=None, alias="noticeExecution")
    notification_draft: NotificationDraftContext | None = Field(default=None, alias="notificationDraft")
    notification_execution: ExecutionContext | None = Field(default=None, alias="notificationExecution")


class PendingConfirmation(BaseModel):
    type: str
    payload: dict = Field(default_factory=dict)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="사용자 입력 메시지")
    history: list[MessageItem] = Field(
        default_factory=list,
        max_length=20,
        description="이전 대화 이력",
    )
    context: ChatContext = Field(default_factory=ChatContext)
    confirmation: PendingConfirmation | None = None
