from datetime import datetime

from pydantic import BaseModel, Field


class PosterPromptInput(BaseModel):
    title: str
    subtitle: str | None = None
    date_text: str | None = None
    location_text: str | None = None
    tone: str | None = None
    primary_color: str | None = None
    secondary_color: str | None = None
    required_copy: list[str] = Field(default_factory=list)
    reference_image_urls: list[str] = Field(default_factory=list)
    event_name: str | None = None
    description: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    location: str | None = None
    extra_prompt: str | None = None


class PosterPromptBuildResult(BaseModel):
    final_prompt: str = Field(...)
    debug_payload: dict = Field(default_factory=dict)


def _clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _clean_list(values: list[str] | None) -> list[str]:
    if not values:
        return []
    normalized: list[str] = []
    for value in values:
        item = (value or "").strip()
        if item:
            normalized.append(item)
    return normalized


def _format_date_range(
    start_at: datetime | None,
    end_at: datetime | None,
) -> str | None:
    if start_at is None:
        return None
    start_date = start_at.strftime("%Y.%m.%d")
    if end_at is None:
        return start_date
    end_date = end_at.strftime("%Y.%m.%d")
    return start_date if start_date == end_date else f"{start_date} ~ {end_date}"


def _build_legacy_prompt(data: PosterPromptInput) -> str:
    event_name = _clean_text(data.event_name) or _clean_text(data.title) or "행사 포스터"
    location = _clean_text(data.location) or _clean_text(data.location_text) or "장소 정보 없음"
    description = _clean_text(data.description) or _clean_text(data.subtitle) or "행사 분위기 중심의 배경"
    extra_prompt = _clean_text(data.extra_prompt) or _clean_text(data.tone) or "밝고 프리미엄한 무드"
    schedule = _format_date_range(data.start_at, data.end_at) or _clean_text(data.date_text) or "일정 정보 없음"

    return (
        "Create a premium background artwork layer for a Korean pet event.\n"
        "This image is background art only. All title, date, location, and typography will be added later in software.\n"
        "Use the following metadata only as mood reference. Never render these details as readable text.\n"
        f"Event title: {event_name}\n"
        f"Location: {location}\n"
        f"Schedule: {schedule}\n"
        f"Description: {description}\n"
        f"Creative direction: {extra_prompt}\n"
        "Use a vertical composition suitable for a website poster cover.\n"
        "Show pets or a festival atmosphere that matches the event theme.\n"
        "Keep the design modern, warm, energetic, and premium.\n"
        "Leave safe margins for later typography placement.\n"
        "Absolutely no text, letters, numbers, logos, watermarks, signage, labels, QR codes, UI, or poster mockup elements.\n"
        "Generate only the image background layer."
    )


def build_poster_prompt(data: PosterPromptInput) -> PosterPromptBuildResult:
    title = _clean_text(data.title) or ""
    subtitle = _clean_text(data.subtitle)
    date_text = _clean_text(data.date_text)
    location_text = _clean_text(data.location_text)
    tone = _clean_text(data.tone)
    primary_color = _clean_text(data.primary_color)
    secondary_color = _clean_text(data.secondary_color)
    required_copy = _clean_list(data.required_copy)
    reference_image_urls = _clean_list(data.reference_image_urls)

    if not title:
        raise ValueError("title must not be blank")

    if data.start_at and data.end_at and (
        _clean_text(data.event_name) or _clean_text(data.location)
    ):
        final_prompt = _build_legacy_prompt(data)
        debug_payload = {
            "mode": "legacy_background",
            "title": title,
            "event_name": _clean_text(data.event_name) or title,
            "description": _clean_text(data.description) or subtitle,
            "location": _clean_text(data.location) or location_text,
            "date_range": _format_date_range(data.start_at, data.end_at),
            "extra_prompt": _clean_text(data.extra_prompt) or tone,
            "reference_image_urls": reference_image_urls,
        }
        return PosterPromptBuildResult(
            final_prompt=final_prompt,
            debug_payload=debug_payload,
        )

    info_lines: list[str] = [f"- 메인 제목: {title}"]
    if subtitle:
        info_lines.append(f"- 보조 문구: {subtitle}")
    if date_text:
        info_lines.append(f"- 날짜 문구: {date_text}")
    if location_text:
        info_lines.append(f"- 장소 문구: {location_text}")

    design_lines: list[str] = [
        "- 용도: 한국어 행사 홍보 포스터",
        "- 전달 목표: 한눈에 읽히는 행사 포스터",
        "- 메인 제목이 가장 먼저 보이도록 구성",
        "- 날짜와 장소는 제목 다음 우선순위로 배치",
        "- 텍스트는 과하게 장식하지 말고 정보 전달 중심으로 구성",
        "- 실제 인쇄물처럼 안정적이고 읽기 쉽게 배치",
        "- 글자 깨짐, 문자 왜곡, 과장된 효과, 과도한 곡선 배치를 피하기",
        "- 정보 영역과 비주얼 영역의 대비를 분명하게 유지",
        "- 모바일 화면에서도 제목과 핵심 정보가 구분되도록 구성",
    ]

    if tone:
        design_lines.append(f"- 분위기: {tone}")
    if primary_color:
        design_lines.append(f"- 주요 색상: {primary_color}")
    if secondary_color:
        design_lines.append(f"- 보조 색상: {secondary_color}")

    copy_lines = [f"- 반드시 포함할 문구: {item}" for item in required_copy]
    reference_lines: list[str] = []
    if reference_image_urls:
        reference_lines.append(
            "- 참고 이미지는 분위기와 구도 참고용으로만 사용하고, 텍스트와 정보 배치는 새로 구성"
        )
        reference_lines.append(f"- 참고 이미지 개수: {len(reference_image_urls)}")

    final_prompt = "\n".join(
        [
            "한국어 행사 포스터 이미지를 생성해 주세요.",
            "",
            "[행사 정보]",
            *info_lines,
            "",
            "[디자인 지침]",
            *design_lines,
            "",
            "[텍스트 반영 지침]",
            "- 제목, 날짜, 장소, 필수 문구는 포스터 안에 실제 텍스트로 넣어 주세요.",
            "- 텍스트를 임의로 바꾸거나 빠뜨리지 마세요.",
            "- 문장을 지나치게 장식적으로 변형하지 마세요.",
            "- 한국어 문구는 가독성을 최우선으로 유지해 주세요.",
            "- 정보 텍스트는 배경에 묻히지 않도록 충분한 대비를 주세요.",
            *copy_lines,
            "",
            "[출력 방향]",
            "- 실제 행사 홍보물처럼 완성도 높은 포스터",
            "- 시선 집중 요소는 분명하되 정보 전달을 해치지 않을 것",
            "- 과한 글리치, 손상된 텍스트, 의미 없는 장식 문자는 피할 것",
            *reference_lines,
        ]
    ).strip()

    debug_payload = {
        "mode": "text_poster",
        "title": title,
        "subtitle": subtitle,
        "date_text": date_text,
        "location_text": location_text,
        "tone": tone,
        "primary_color": primary_color,
        "secondary_color": secondary_color,
        "required_copy": required_copy,
        "reference_image_urls": reference_image_urls,
    }

    return PosterPromptBuildResult(
        final_prompt=final_prompt,
        debug_payload=debug_payload,
    )
