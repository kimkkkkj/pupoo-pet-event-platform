import json

import boto3

from pupoo_ai.app.core.config import settings
from pupoo_ai.app.features.chatbot.prompts.system import SYSTEM_PROMPT

# OpenAI 호환 provider로 간주하는 값들 (Gemini/Groq/OpenAI 등 동일 인터페이스).
_OPENAI_COMPATIBLE_PROVIDERS = {"openai", "openai-compatible", "gemini", "groq"}


def get_bedrock_client():
    return boto3.client("bedrock-runtime", region_name=settings.aws_region)


def _to_openai_messages(messages: list[dict], system_prompt: str) -> list[dict]:
    """Bedrock 형식 메시지([{role, content:[{text}]}])를 OpenAI 형식으로 변환한다."""
    converted: list[dict] = [{"role": "system", "content": system_prompt}]
    for message in messages:
        content = message.get("content")
        if isinstance(content, list):
            text = " ".join(
                part.get("text", "")
                for part in content
                if isinstance(part, dict)
            ).strip()
        else:
            text = str(content or "")
        converted.append({"role": message.get("role", "user"), "content": text})
    return converted


async def _invoke_openai_compatible(messages: list[dict], system_prompt: str) -> str:
    """OpenAI 호환 엔드포인트(Gemini/Groq 등) 호출. base_url/api_key/model은 설정값 사용."""
    from openai import AsyncOpenAI

    client = AsyncOpenAI(
        api_key=settings.chatbot_api_key or "missing",
        base_url=settings.chatbot_base_url or None,
    )
    response = await client.chat.completions.create(
        model=settings.chatbot_model,
        messages=_to_openai_messages(messages, system_prompt),
        temperature=0.7,
        max_tokens=1024,
    )
    return response.choices[0].message.content or ""


async def _invoke_bedrock(messages: list[dict], system_prompt: str) -> str:
    body = json.dumps(
        {
            "messages": messages,
            "system": [{"text": system_prompt}],
            "inferenceConfig": {
                "maxTokens": 1024,
                "temperature": 0.7,
            },
        }
    )

    response = get_bedrock_client().invoke_model(
        modelId=settings.bedrock_model_id,
        body=body,
        contentType="application/json",
        accept="application/json",
    )

    result = json.loads(response["body"].read())
    return result["output"]["message"]["content"][0]["text"]


async def invoke_bedrock(messages: list[dict], system_prompt: str = SYSTEM_PROMPT) -> str:
    """설정된 provider에 따라 챗봇 LLM을 호출한다. (함수명은 호환을 위해 유지)"""
    provider = (settings.chatbot_provider or "bedrock").strip().lower()
    if provider in _OPENAI_COMPATIBLE_PROVIDERS:
        return await _invoke_openai_compatible(messages, system_prompt)
    return await _invoke_bedrock(messages, system_prompt)


async def generate_structured_draft(prompt: str) -> str:
    return await invoke_bedrock(
        messages=[{"role": "user", "content": [{"text": prompt}]}],
        system_prompt="응답은 반드시 JSON 객체 하나만 반환합니다.",
    )
