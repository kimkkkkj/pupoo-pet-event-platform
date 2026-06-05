"""무료 포스터 이미지 provider.

- 배경 그림: Pollinations(무료, 키 불필요, Flux 기반)로 "텍스트 없는" 배경만 생성
- 텍스트: Pillow로 한글 제목/날짜/장소를 배경 위에 또렷하게 합성
무료 모델이 한글 글자를 깨뜨리는 문제를 피하면서, 무료로 완성도 있는 포스터를 만든다.
"""

from __future__ import annotations

import io
import logging
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
    "PORTRAIT_1024": (1024, 1536),
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
        background = self._fetch_background(request, width, height)
        composed = self._compose(background, request, width, height)

        fmt = request.format
        buffer = io.BytesIO()
        save_kwargs = {"quality": 92} if fmt in {"jpeg", "webp"} else {}
        composed.save(buffer, format=_PIL_FORMAT[fmt], **save_kwargs)

        return PosterProviderResult(
            image_bytes=buffer.getvalue(),
            content_type=_FORMAT_TO_CONTENT_TYPE[fmt],
            provider=self.provider_name,
            model=f"pollinations:{self._model}+pillow",
            revised_prompt=request.prompt,
            width=width,
            height=height,
            raw_metadata={"size": request.size, "format": fmt, "compose": "pillow_text_overlay"},
        )

    # --- 배경 생성 -------------------------------------------------
    def _translate_to_english(self, text: str) -> str:
        """한글 프롬프트를 영어 이미지 프롬프트로 번역(Groq 등 chatbot LLM 재사용). 실패 시 원문."""
        text = (text or "").strip()
        if not text or not _has_korean(text):
            return text
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

    def _background_prompt(self, request: PosterProviderRequest) -> str:
        # 사용자가 입력한 프롬프트(extraPrompt→tone)와 설명(description→subtitle)을 장면의 주연으로 사용한다.
        # 주의: 한글 제목은 모델이 깨진 글자로 그리므로 장면 묘사에는 넣지 않는다.
        direction = (request.tone or "").strip()
        desc = (request.overlay_subtitle or "").strip()
        colors = ", ".join(c for c in [request.primary_color, request.secondary_color] if c)

        scene_bits = [b for b in [direction, desc] if b]
        scene_raw = ", ".join(scene_bits)
        if scene_raw:
            scene = self._translate_to_english(scene_raw)
        else:
            scene = "cute happy dogs and cats at a warm festive pet event, pastel bokeh lights"

        parts = [
            f"A premium illustrated poster background. Scene: {scene}.",
            "Clean modern illustration, soft cinematic lighting, high detail, cohesive composition.",
        ]
        if colors:
            parts.append(f"Color palette: {colors}.")
        parts.append("Keep a wide calm uncluttered space in the lower third for later text.")
        parts.append(
            "CRITICAL: a pure decorative background only. "
            "Absolutely no text, no letters, no hangul, no words, no numbers, "
            "no signs, no banners, no posters, no flags, no labels, no logos, no watermark anywhere."
        )
        return " ".join(parts)

    def _fetch_background(self, request: PosterProviderRequest, width: int, height: int) -> Image.Image:
        # 토큰이 없으면(무키) AI 호출 없이 Pillow로 디자인 배경을 생성한다.
        if not self._token:
            return self._gradient_background(request, width, height)

        prompt = self._background_prompt(request)
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
        url = (
            f"{self._base_url}/{encoded}"
            f"?width={width}&height={height}&nologo=true&model={self._model}"
        )
        with httpx.Client(timeout=self._timeout, follow_redirects=True) as client:
            resp = client.get(url, headers={"Authorization": f"Bearer {self._token}"})
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
    def _compose(
        self,
        background: Image.Image,
        request: PosterProviderRequest,
        width: int,
        height: int,
    ) -> Image.Image:
        canvas = background.convert("RGBA")

        # 하단 가독성용 그라데이션 스크림(아래로 갈수록 어둡게)
        scrim = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        sdraw = ImageDraw.Draw(scrim)
        scrim_top = int(height * 0.50)
        for y in range(scrim_top, height):
            ratio = (y - scrim_top) / max(1, (height - scrim_top))
            alpha = int(20 + ratio * 205)
            sdraw.line([(0, y), (width, y)], fill=(8, 10, 20, alpha))
        canvas = Image.alpha_composite(canvas, scrim)

        draw = ImageDraw.Draw(canvas)
        margin = int(width * 0.075)
        max_text_w = width - margin * 2
        accent = _safe_color(request.primary_color, "#FEE500")

        title = (request.overlay_title or "").strip()
        date_text = (request.overlay_date or "").strip()
        location = (request.overlay_location or "").strip()

        title_font = _load_font(max(28, width // 9), bold=True)
        meta_font = _load_font(max(18, width // 24), bold=False)

        title_lines = _wrap(draw, title, title_font, max_text_w) if title else []

        def line_h(font: ImageFont.ImageFont) -> int:
            ascent, descent = font.getmetrics()
            return ascent + descent

        title_lh = int(line_h(title_font) * 1.12)
        meta_lh = int(line_h(meta_font) * 1.5)

        block_h = len(title_lines) * title_lh
        meta_items = [t for t in [date_text, location] if t]
        if meta_items:
            block_h += int(meta_lh * 0.4) + len(meta_items) * meta_lh

        # 하단에서 margin 띄우고 블록 배치
        y = height - margin - block_h

        # 제목 위 액센트 바
        if title_lines:
            bar_y = y - int(title_lh * 0.45)
            draw.rounded_rectangle(
                [margin, bar_y, margin + int(width * 0.16), bar_y + max(6, height // 220)],
                radius=4,
                fill=accent,
            )

        # 제목(그림자 + 흰 글씨)
        for line in title_lines:
            draw.text((margin + 2, y + 2), line, font=title_font, fill=(0, 0, 0, 160))
            draw.text((margin, y), line, font=title_font, fill="#FFFFFF")
            y += title_lh

        # 날짜/장소
        if meta_items:
            y += int(meta_lh * 0.4)
            for item in meta_items:
                draw.text((margin + 1, y + 1), item, font=meta_font, fill=(0, 0, 0, 150))
                draw.text((margin, y), item, font=meta_font, fill=(235, 238, 245))
                y += meta_lh

        return canvas.convert("RGB")
