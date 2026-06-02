import json

import boto3

from pupoo_ai.app.core.config import settings
from pupoo_ai.app.features.chatbot.prompts.system import SYSTEM_PROMPT


def get_bedrock_client():
    return boto3.client("bedrock-runtime", region_name=settings.aws_region)


async def invoke_bedrock(messages: list[dict], system_prompt: str = SYSTEM_PROMPT) -> str:
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


async def generate_structured_draft(prompt: str) -> str:
    return await invoke_bedrock(
        messages=[{"role": "user", "content": [{"text": prompt}]}],
        system_prompt="응답은 반드시 JSON 객체 하나만 반환합니다.",
    )
