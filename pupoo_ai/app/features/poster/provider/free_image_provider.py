"""무료 포스터 이미지 provider.

- 배경 그림: Pollinations(무료, 키 불필요, Flux 기반)로 "텍스트 없는" 배경만 생성
- 텍스트: Pillow로 한글 제목/날짜/장소를 배경 위에 또렷하게 합성
무료 모델이 한글 글자를 깨뜨리는 문제를 피하면서, 무료로 완성도 있는 포스터를 만든다.
"""

from __future__ import annotations

import io
import logging
import re
import secrets
import urllib.parse

import httpx
from PIL import Image, ImageColor, ImageDraw, ImageFilter, ImageFont

from pupoo_ai.app.core.config import settings
from pupoo_ai.app.features.poster.dto.provider import (
    PosterProviderRequest,
    PosterProviderResult,
)
from pupoo_ai.app.features.poster.provider.provider_exceptions import PosterProviderError


def _has_korean(text: str) -> bool:
    return any("가" <= ch <= "힣" for ch in text)

logger = logging.getLogger(__name__)

_SIZE_TO_DIMENSIONS = {
    # 관리자 화면 포스터 칸(3:4)에 맞춘 세로 크기
    "PORTRAIT_1024": (1152, 1536),
    "SQUARE_1024": (1024, 1024),
    "LANDSCAPE_1024": (1536, 1024),
    "PORTRAIT_1536": (1536, 2048),
}

_FORMAT_TO_CONTENT_TYPE = {
    "png": "image/png",
    "jpeg": "image/jpeg",
    "webp": "image/webp",
}

_PIL_FORMAT = {"png": "PNG", "jpeg": "JPEG", "webp": "WEBP"}

# 한글 지원 폰트 후보(로컬 Windows 우선, 컨테이너/리눅스 폴백)
_FONT_BOLD_CANDIDATES = [
    r"C:\Windows\Fonts\malgunbd.ttf",
    r"C:\Windows\Fonts\malgun.ttf",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf",
]
_FONT_REGULAR_CANDIDATES = [
    r"C:\Windows\Fonts\malgun.ttf",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
]


def _load_font(size: int, *, bold: bool) -> ImageFont.FreeTypeFont:
    candidates = _FONT_BOLD_CANDIDATES if bold else _FONT_REGULAR_CANDIDATES
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def _safe_color(value: str | None, fallback: str) -> str:
    if value and value.strip():
        try:
            ImageColor.getrgb(value.strip())
            return value.strip()
        except ValueError:
            pass
    return fallback


def _wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    words = text.split()
    if not words:
        return []
    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        trial = f"{current} {word}"
        if draw.textlength(trial, font=font) <= max_width:
            current = trial
        else:
            lines.append(current)
            current = word
    lines.append(current)
    # 단어 하나가 너무 길면(공백 없는 긴 한글) 글자 단위로 다시 쪼갠다.
    wrapped: list[str] = []
    for line in lines:
        if draw.textlength(line, font=font) <= max_width:
            wrapped.append(line)
            continue
        buf = ""
        for ch in line:
            if draw.textlength(buf + ch, font=font) <= max_width:
                buf += ch
            else:
                if buf:
                    wrapped.append(buf)
                buf = ch
        if buf:
            wrapped.append(buf)
    return wrapped


class FreePosterImageProvider:
    provider_name = "free"

    def __init__(
        self,
        *,
        model: str = "flux",
        base_url: str = "https://image.pollinations.ai/prompt",
        timeout_seconds: float = 60.0,
        token: str = "",
    ) -> None:
        self._model = model
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout_seconds
        self._token = (token or "").strip()

    def generate_image(self, request: PosterProviderRequest) -> PosterProviderResult:
        width, height = _SIZE_TO_DIMENSIONS[request.size]
        template = secrets.choice(["band", "top"])
        background = self._fetch_background(request, width, height, template)
        composed = self._compose(background, request, width, height, template)

        fmt = request.format
        buffer = io.BytesIO()
        save_kwargs = {"quality": 92} if fmt in {"jpeg", "webp"} else {}
        composed.save(buffer, format=_PIL_FORMAT[fmt], **save_kwargs)

        return PosterProviderResult(
            image_bytes=buffer.getvalue(),
            content_type=_FORMAT_TO_CONTENT_TYPE[fmt],
            provider=self.provider_name,
            model=self._model_label(),
            revised_prompt=request.prompt,
            width=width,
            height=height,
            raw_metadata={"size": request.size, "format": fmt, "compose": "pillow_text_overlay", "template": template},
        )

    def _model_label(self) -> str:
        return f"pollinations:{self._model}+pillow"

    @staticmethod
    def _space_hint(template: str) -> str:
        if template == "top":
            return "Keep the upper third calm and simple, like open sky or soft blur, with the animals in the lower two thirds."
        return "Keep the lower third calm and simple, like soft grass or blur, with the animals in the upper two thirds."

    # --- 배경 생성 -------------------------------------------------
    def _translate_to_english(self, text: str) -> str:
        """한글 프롬프트를 영어 이미지 프롬프트로 번역(Groq 등 chatbot LLM 재사용). 실패 시 원문."""
        text = (text or "").strip()
        if not text or not _has_korean(text):
            return text
        if (settings.chatbot_provider or "").strip().lower() == "bedrock":
            return self._translate_with_bedrock(text)
        api_key = settings.chatbot_api_key
        if not api_key:
            return text
        try:
            from openai import OpenAI

            client = OpenAI(api_key=api_key, base_url=settings.chatbot_base_url or None)
            resp = client.chat.completions.create(
                model=settings.chatbot_model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Translate the user's Korean image-generation prompt into a concise, vivid "
                            "English image prompt. Keep the described subject and mood. "
                            "Output only the English prompt, no quotes, no explanation."
                        ),
                    },
                    {"role": "user", "content": text},
                ],
                temperature=0,
                max_tokens=200,
            )
            translated = (resp.choices[0].message.content or "").strip()
            return translated or text
        except Exception as exc:  # noqa: BLE001
            logger.warning("poster prompt translation failed, using original: %s", exc)
            return text

    def _translate_with_bedrock(self, text: str) -> str:
        """챗봇과 같은 Bedrock 모델(Nova Micro)로 번역한다. 실패하면 원문을 쓴다."""
        try:
            import json

            from pupoo_ai.app.features.chatbot.service.bedrock_client import get_bedrock_client

            body = json.dumps(
                {
                    "system": [
                        {
                            "text": (
                                "Translate the user's Korean image-generation prompt into a concise, vivid "
                                "English image prompt. Keep the described subject and mood. "
                                "Output only the English prompt, no quotes, no explanation."
                            )
                        }
                    ],
                    "messages": [{"role": "user", "content": [{"text": text}]}],
                    "inferenceConfig": {"maxTokens": 200, "temperature": 0},
                }
            )
            response = get_bedrock_client().invoke_model(
                modelId=settings.bedrock_model_id,
                body=body,
                contentType="application/json",
                accept="application/json",
            )
            result = json.loads(response["body"].read())
            translated = result["output"]["message"]["content"][0]["text"].strip()
            return translated or text
        except Exception as exc:  # noqa: BLE001
            logger.warning("poster prompt translation (bedrock) failed, using original: %s", exc)
            return text

    def _background_prompt(self, request: PosterProviderRequest, template: str = "band") -> str:
        # 사용자가 입력한 프롬프트(extraPrompt→tone)와 설명(description→subtitle)을 장면의 주연으로 사용한다.
        # 주의: 한글 제목은 모델이 깨진 글자로 그리므로 장면 묘사에는 넣지 않는다.
        direction = (request.tone or "").strip()
        desc = (request.overlay_subtitle or "").strip()
        colors = ", ".join(c for c in [request.primary_color, request.secondary_color] if c)

        default_scene = "cute happy dogs and cats at a warm festive outdoor pet event, pastel bokeh lights"
        scene_bits = [b for b in [direction, desc] if b]
        scene_raw = ", ".join(scene_bits)
        scene = self._translate_to_english(scene_raw) if scene_raw else default_scene
        # 번역에 실패해 한글이 남으면 모델이 엉뚱한 장면(사람 등)을 그리므로 기본 장면을 쓴다.
        if _has_korean(scene):
            scene = default_scene

        parts = [
            # 어떤 분위기를 입력해도 주인공은 반려동물이 되도록 문장 앞에 고정한다.
            "A premium illustrated poster background for a pet festival, featuring adorable dogs and cats as the main subject.",
            f"Scene and mood: {scene}.",
            "Clean modern illustration, soft cinematic lighting, high detail, cohesive composition.",
        ]
        if colors:
            parts.append(f"Color palette: {colors}.")
        parts.append(self._space_hint(template))
        parts.append(
            "CRITICAL: a pure decorative background only. "
            "Absolutely no text, no letters, no hangul, no words, no numbers, "
            "no signs, no banners, no posters, no flags, no labels, no logos, no watermark anywhere."
        )
        return " ".join(parts)

    def _fetch_background(
        self, request: PosterProviderRequest, width: int, height: int, template: str = "band"
    ) -> Image.Image:
        # 토큰이 없어도 Pollinations 무료(익명) 호출을 시도하고, 실패하면 Pillow 그라데이션 배경을 쓴다.
        # 익명 호출은 이미지 구석에 pollinations 로고가 붙는다(토큰이 있으면 로고 없이 받는다).
        prompt = self._background_prompt(request, template)
        try:
            if self._token.startswith("hf_"):
                image = self._fetch_huggingface(prompt, width, height)
            else:
                image = self._fetch_pollinations(prompt, width, height)
        except Exception as exc:  # noqa: BLE001
            logger.warning("AI background failed, fallback to gradient: %s", exc)
            return self._gradient_background(request, width, height)

        if image.size != (width, height):
            image = image.resize((width, height), Image.LANCZOS)
        return image

    @staticmethod
    def _gen_dims(width: int, height: int, cap: int = 1024) -> tuple[int, int]:
        """생성 해상도를 cap 이내, 16의 배수로 맞춘다(FLUX 권장)."""
        if width >= height:
            gw = cap
            gh = max(256, round(cap * height / width))
        else:
            gh = cap
            gw = max(256, round(cap * width / height))
        gw = max(256, (gw // 16) * 16)
        gh = max(256, (gh // 16) * 16)
        return gw, gh

    def _fetch_huggingface(self, prompt: str, width: int, height: int) -> Image.Image:
        model = self._model if "/" in self._model else "black-forest-labs/FLUX.1-schnell"
        # 신 라우터 엔드포인트(레거시 api-inference.huggingface.co 는 폐기됨)
        url = f"https://router.huggingface.co/hf-inference/models/{model}"
        gw, gh = self._gen_dims(width, height)
        headers = {
            "Authorization": f"Bearer {self._token}",
            "Accept": "image/png",
            "x-wait-for-model": "true",
        }
        payload = {"inputs": prompt, "parameters": {"width": gw, "height": gh}}
        with httpx.Client(timeout=self._timeout) as client:
            resp = client.post(url, headers=headers, json=payload)
        resp.raise_for_status()
        return Image.open(io.BytesIO(resp.content)).convert("RGB")

    def _fetch_pollinations(self, prompt: str, width: int, height: int) -> Image.Image:
        encoded = urllib.parse.quote(prompt, safe="")
        gw, gh = self._gen_dims(width, height)
        url = (
            f"{self._base_url}/{encoded}"
            f"?width={gw}&height={gh}&nologo=true&model={self._model}&seed={secrets.randbelow(1_000_000)}"
        )
        headers = {"Authorization": f"Bearer {self._token}"} if self._token else {}
        with httpx.Client(timeout=self._timeout, follow_redirects=True) as client:
            resp = client.get(url, headers=headers)
        resp.raise_for_status()
        return Image.open(io.BytesIO(resp.content)).convert("RGB")

    def _gradient_background(
        self, request: PosterProviderRequest, width: int, height: int
    ) -> Image.Image:
        top = ImageColor.getrgb(_safe_color(request.primary_color, "#7AB33E"))
        bottom = ImageColor.getrgb(_safe_color(request.secondary_color, "#1E2A44"))

        base = Image.new("RGB", (width, height))
        draw = ImageDraw.Draw(base)
        for y in range(height):
            t = y / max(1, height - 1)
            # ease-in-out 으로 부드럽게
            e = t * t * (3 - 2 * t)
            r = int(top[0] + (bottom[0] - top[0]) * e)
            g = int(top[1] + (bottom[1] - top[1]) * e)
            b = int(top[2] + (bottom[2] - top[2]) * e)
            draw.line([(0, y), (width, y)], fill=(r, g, b))

        # 소프트 블롭(흐린 원)으로 깊이감
        overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        blobs = [
            (int(width * 0.78), int(height * 0.18), int(width * 0.42), (255, 255, 255, 46)),
            (int(width * 0.16), int(height * 0.30), int(width * 0.30), (255, 255, 255, 30)),
            (int(width * 0.62), int(height * 0.46), int(width * 0.36), (0, 0, 0, 40)),
        ]
        for cx, cy, rad, color in blobs:
            od.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=color)
        overlay = overlay.filter(ImageFilter.GaussianBlur(max(8, width // 18)))
        return Image.alpha_composite(base.convert("RGBA"), overlay).convert("RGB")

    # --- 텍스트 합성 -----------------------------------------------
    # 포스터 틀 두 가지: "band"는 아래쪽에 제목과 정보, "top"은 위쪽 큰 제목과 아래 흰 정보 띠.
    # AI 배경은 틀에 맞춰 글자가 놓일 자리를 비워 두도록 요청한다(_space_hint).
    def _compose(
        self,
        background: Image.Image,
        request: PosterProviderRequest,
        width: int,
        height: int,
        template: str = "band",
    ) -> Image.Image:
        if template == "top":
            return self._compose_top(background, request, width, height)
        return self._compose_band(background, request, width, height)

    @staticmethod
    def _line_h(font: ImageFont.ImageFont) -> int:
        ascent, descent = font.getmetrics()
        return ascent + descent

    def _fit_title(
        self, draw: ImageDraw.ImageDraw, title: str, max_width: int, start: int, minimum: int
    ) -> tuple[ImageFont.ImageFont, list[str]]:
        """제목이 두 줄 안에 들어가도록 글자 크기를 줄여 가며 맞춘다."""
        size = start
        while True:
            font = _load_font(size, bold=True)
            lines = _wrap(draw, title, font, max_width)
            if len(lines) <= 2 or size <= minimum:
                return font, lines
            size -= max(2, size // 14)

    @staticmethod
    def _scrim(width: int, height: int, *, from_y: int, to_y: int, max_alpha: int) -> Image.Image:
        """from_y(투명) → to_y(max_alpha) 방향으로 짙어지는 어두운 막."""
        layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        step = 1 if to_y >= from_y else -1
        span = max(1, abs(to_y - from_y))
        for y in range(from_y, to_y + step, step):
            ratio = abs(y - from_y) / span
            eased = ratio * ratio * (3 - 2 * ratio)
            d.line([(0, y), (width, y)], fill=(10, 12, 22, int(max_alpha * eased)))
        # to_y 너머는 가장 짙은 색으로 채운다.
        if step > 0 and to_y < height:
            d.rectangle([0, to_y, width, height], fill=(10, 12, 22, max_alpha))
        if step < 0 and to_y > 0:
            d.rectangle([0, 0, width, to_y], fill=(10, 12, 22, max_alpha))
        return layer

    @staticmethod
    def _compact_date(text: str) -> str:
        """"2026.04.11 ~ 2026.04.12" → "2026.04.11 – 04.12" (같은 해면 뒤쪽 연도를 뺀다)."""
        m = re.fullmatch(r"\s*(\d{4})\.(\d{2}\.\d{2})\s*~\s*(\d{4})\.(\d{2}\.\d{2})\s*", text or "")
        if not m:
            return (text or "").strip()
        y1, d1, y2, d2 = m.groups()
        return f"{y1}.{d1} – {d2}" if y1 == y2 else f"{y1}.{d1} – {y2}.{d2}"

    @staticmethod
    def _fit_line(draw: ImageDraw.ImageDraw, text: str, max_width: int, size: int, *, bold: bool = True):
        """한 줄에 들어갈 때까지 글자 크기를 줄인다."""
        while size > 12:
            font = _load_font(size, bold=bold)
            if draw.textlength(text, font=font) <= max_width:
                return font
            size -= 2
        return _load_font(size, bold=bold)

    def _compose_band(
        self, background: Image.Image, request: PosterProviderRequest, width: int, height: int
    ) -> Image.Image:
        canvas = Image.alpha_composite(
            background.convert("RGBA"),
            self._scrim(width, height, from_y=int(height * 0.42), to_y=int(height * 0.86), max_alpha=225),
        )
        draw = ImageDraw.Draw(canvas)
        margin = int(width * 0.08)
        max_w = width - margin * 2
        accent = _safe_color(request.primary_color, "#FFD84D")

        title = (request.overlay_title or "").strip()
        date_text = self._compact_date(request.overlay_date or "")
        location = (request.overlay_location or "").strip()

        title_font, title_lines = self._fit_title(draw, title, max_w, width // 9, width // 14)
        title_lh = int(self._line_h(title_font) * 1.08)
        label_font = _load_font(max(14, width // 44), bold=True)
        value_font = _load_font(max(18, width // 28), bold=True)
        eyebrow_font = _load_font(max(14, width // 40), bold=True)

        info_h = self._line_h(label_font) + int(self._line_h(value_font) * 1.2)
        eyebrow_h = int(self._line_h(eyebrow_font) * 1.9)
        gap = int(height * 0.028)
        block_h = eyebrow_h + gap + len(title_lines) * title_lh + gap + 2 + gap + info_h
        y = height - margin - block_h

        # 위: 강조색 알약 ("PET FESTIVAL")
        eyebrow = "PET FESTIVAL"
        ew = int(draw.textlength(eyebrow, font=eyebrow_font)) + eyebrow_h
        draw.rounded_rectangle([margin, y, margin + ew, y + eyebrow_h], radius=eyebrow_h // 2, fill=accent)
        draw.text(
            (margin + eyebrow_h // 2, y + eyebrow_h // 2), eyebrow, font=eyebrow_font, fill="#111318", anchor="lm"
        )
        y += eyebrow_h + gap

        for line in title_lines:
            draw.text((margin + 3, y + 3), line, font=title_font, fill=(0, 0, 0, 120))
            draw.text((margin, y), line, font=title_font, fill="#FFFFFF")
            y += title_lh
        y += gap

        draw.line([(margin, y), (width - margin, y)], fill=(255, 255, 255, 90), width=2)
        y += 2 + gap

        # 아래: DATE | PLACE 두 칸
        col_w = max_w // 2
        for i, (label, value) in enumerate([("DATE", date_text), ("PLACE", location)]):
            if not value:
                continue
            x = margin + i * col_w
            draw.text((x, y), label, font=label_font, fill=accent)
            vy = y + self._line_h(label_font) + int(self._line_h(value_font) * 0.12)
            font = self._fit_line(draw, value, col_w - int(width * 0.03), value_font.size)
            draw.text((x, vy), value, font=font, fill=(240, 242, 248))

        return canvas.convert("RGB")

    def _compose_top(
        self, background: Image.Image, request: PosterProviderRequest, width: int, height: int
    ) -> Image.Image:
        strip_h = int(height * 0.13)
        canvas = Image.alpha_composite(
            background.convert("RGBA"),
            self._scrim(width, height, from_y=int(height * 0.46), to_y=int(height * 0.04), max_alpha=205),
        )
        draw = ImageDraw.Draw(canvas)
        margin = int(width * 0.08)
        max_w = width - margin * 2
        accent = _safe_color(request.primary_color, "#FFD84D")

        title = (request.overlay_title or "").strip()
        date_text = self._compact_date(request.overlay_date or "")
        location = (request.overlay_location or "").strip()

        # 위: 작은 강조 문구 + 큰 제목
        eyebrow_font = _load_font(max(14, width // 38), bold=True)
        y = margin
        draw.text((margin, y), "PET FESTIVAL", font=eyebrow_font, fill=accent)
        y += int(self._line_h(eyebrow_font) * 1.5)

        title_font, title_lines = self._fit_title(draw, title, max_w, width // 8, width // 13)
        title_lh = int(self._line_h(title_font) * 1.06)
        for line in title_lines:
            draw.text((margin + 3, y + 3), line, font=title_font, fill=(0, 0, 0, 120))
            draw.text((margin, y), line, font=title_font, fill="#FFFFFF")
            y += title_lh

        # 아래: 흰 정보 띠 (날짜 | 장소)
        top = height - strip_h
        draw.rectangle([0, top, width, height], fill="#FFFFFF")
        draw.rectangle([0, top, int(width * 0.018), height], fill=accent)
        value_font = _load_font(max(18, width // 26), bold=True)
        cy = top + strip_h // 2
        items = [v for v in [date_text, location] if v]
        if len(items) == 2:
            half = width // 2
            for i, value in enumerate(items):
                x0 = margin if i == 0 else half + int(width * 0.03)
                limit = (half - margin - int(width * 0.03)) if i == 0 else (width - margin - x0)
                font = self._fit_line(draw, value, limit, value_font.size)
                draw.text((x0, cy), value, font=font, fill="#14171C", anchor="lm")
            draw.line([(half, cy - strip_h // 4), (half, cy + strip_h // 4)], fill="#D5D9E0", width=2)
        elif items:
            draw.text((margin, cy), items[0], font=value_font, fill="#14171C", anchor="lm")

        return canvas.convert("RGB")
