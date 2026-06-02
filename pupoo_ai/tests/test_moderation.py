import asyncio
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.append(str(Path(__file__).resolve().parents[2]))

fake_pymilvus = types.ModuleType("pymilvus")
fake_pymilvus.CollectionSchema = object
fake_pymilvus.DataType = types.SimpleNamespace(
    INT64="INT64",
    FLOAT_VECTOR="FLOAT_VECTOR",
    VARCHAR="VARCHAR",
)
fake_pymilvus.FieldSchema = object
fake_pymilvus.MilvusClient = object
sys.modules.setdefault("pymilvus", fake_pymilvus)

fake_pymilvus_exceptions = types.ModuleType("pymilvus.exceptions")
fake_pymilvus_exceptions.MilvusException = Exception
sys.modules.setdefault("pymilvus.exceptions", fake_pymilvus_exceptions)

fake_pymilvus_client = types.ModuleType("pymilvus.milvus_client")
fake_pymilvus_client.IndexParams = object
sys.modules.setdefault("pymilvus.milvus_client", fake_pymilvus_client)

from pupoo_ai.app.api.routers.moderation import moderate, moderate_check  # noqa: E402
from pupoo_ai.app.core.auth import verify_internal_token  # noqa: E402
from pupoo_ai.app.core.config import settings  # noqa: E402
from pupoo_ai.app.core.exceptions import ApiException  # noqa: E402
from pupoo_ai.app.features.moderation.rag_service import moderate_with_rag  # noqa: E402
from pupoo_ai.app.features.moderation.schemas import ModerateRequest  # noqa: E402


class ModerationRouterTest(unittest.IsolatedAsyncioTestCase):
    async def test_blank_content_is_blocked(self):
        response = await moderate(ModerateRequest(content="   "))
        self.assertEqual(response.decision, "BLOCK")
        self.assertEqual(response.result, "BLOCK")
        self.assertEqual(response.action, "BLOCK")
        self.assertEqual(response.stack, "validation")

    async def test_timeout_is_blocked(self):
        async def fake_wait_for(awaitable, *args, **kwargs):
            if hasattr(awaitable, "close"):
                awaitable.close()
            raise asyncio.TimeoutError

        with patch(
            "pupoo_ai.app.api.routers.moderation.asyncio.wait_for",
            side_effect=fake_wait_for,
        ):
            response = await moderate(ModerateRequest(content="테스트"))

        self.assertEqual(response.decision, "BLOCK")
        self.assertEqual(response.result, "BLOCK")
        self.assertEqual(response.action, "BLOCK")
        self.assertEqual(response.stack, "timeout")

    async def test_success_response_contains_legacy_fields(self):
        with patch(
            "pupoo_ai.app.api.routers.moderation.moderate_with_rag",
            return_value=("ALLOW", 0.12, "정상 문장입니다.", "rag_watsonx", None, None),
        ):
            response = await moderate(
                ModerateRequest(content="정상 문장", board_type="POST")
            )

        self.assertEqual(response.decision, "ALLOW")
        self.assertEqual(response.result, "PASS")
        self.assertEqual(response.action, "PASS")
        self.assertEqual(response.score, 0.12)
        self.assertEqual(response.ai_score, 0.12)

    async def test_check_endpoint_supports_review_decision(self):
        with patch(
            "pupoo_ai.app.api.routers.moderation.moderate_with_rag",
            return_value=("REVIEW", 0.61, "운영자 검토가 필요합니다.", "rag_watsonx", None, None),
        ):
            response = await moderate_check(
                ModerateRequest(content="확인이 필요한 문장", board_type="FREE")
            )

        self.assertEqual(response.decision, "REVIEW")
        self.assertEqual(response.result, "PASS")
        self.assertEqual(response.action, "PASS")

    async def test_check_endpoint_supports_warn_decision(self):
        with patch(
            "pupoo_ai.app.api.routers.moderation.moderate_with_rag",
            return_value=("WARN", 0.33, "주의가 필요한 표현입니다.", "rag_watsonx", None, None),
        ):
            response = await moderate_check(
                ModerateRequest(content="주의 관찰 문장", board_type="FREE")
            )

        self.assertEqual(response.decision, "WARN")
        self.assertEqual(response.result, "PASS")
        self.assertEqual(response.action, "PASS")


class ModerationAuthTest(unittest.IsolatedAsyncioTestCase):
    async def test_internal_token_mismatch_returns_403(self):
        with self.assertRaises(ApiException) as context:
            await verify_internal_token("wrong-token")

        self.assertEqual(context.exception.status_code, 403)

    async def test_internal_token_match_passes(self):
        with patch.object(settings, "internal_token", "test-internal-token"), patch.object(
            settings, "previous_internal_tokens", ""
        ):
            await verify_internal_token("test-internal-token")


class RagServiceTest(unittest.TestCase):
    def test_retrieval_failure_is_blocked(self):
        with patch(
            "pupoo_ai.app.features.moderation.rag_service.retrieve_policies",
            side_effect=RuntimeError("milvus down"),
        ):
            result = moderate_with_rag("문장", "POST", {"boardId": 1})

        self.assertEqual(result[0], "BLOCK")
        self.assertEqual(result[3], "rag_error")

    def test_empty_policy_result_is_blocked(self):
        with patch(
            "pupoo_ai.app.features.moderation.rag_service.retrieve_policies",
            return_value=[],
        ):
            result = moderate_with_rag("문장", "POST", {"boardId": 1})

        self.assertEqual(result[0], "BLOCK")
        self.assertEqual(result[3], "rag_empty")

    def test_seed_shortcut_returns_allow_without_llm(self):
        with patch(
            "pupoo_ai.app.features.moderation.rag_service.retrieve_policies",
            return_value=[
                {
                    "chunk_text": "정상 예시",
                    "policy_id": "SEED-ALLOW-001",
                    "category": "SEED_ALLOW",
                    "source": "moderation_seed_examples.json",
                    "score": 0.91,
                }
            ],
        ), patch(
            "pupoo_ai.app.features.moderation.rag_service.is_watsonx_configured",
            return_value=True,
        ), patch(
            "pupoo_ai.app.features.moderation.rag_service.moderate_with_llm",
        ) as mocked_llm:
            result = moderate_with_rag("오늘 산책이 즐거웠어요", "FREE", {"boardId": 1})

        mocked_llm.assert_not_called()
        self.assertEqual(result[0], "ALLOW")
        self.assertEqual(result[3], "seed_shortcut")

    def test_unconfigured_watsonx_is_blocked(self):
        with patch(
            "pupoo_ai.app.features.moderation.rag_service.retrieve_policies",
            return_value=[{"chunk_text": "정책", "policy_id": "P1", "category": "ban", "source": "doc"}],
        ), patch(
            "pupoo_ai.app.features.moderation.rag_service.is_watsonx_configured",
            return_value=False,
        ):
            result = moderate_with_rag("문장", "POST", {"boardId": 1})

        self.assertEqual(result[0], "BLOCK")
        self.assertEqual(result[3], "rag_watsonx_unconfigured")

    def test_llm_result_is_normalized(self):
        with patch(
            "pupoo_ai.app.features.moderation.rag_service.retrieve_policies",
            return_value=[{"chunk_text": "정책", "policy_id": "P1", "category": "ban", "source": "doc"}],
        ), patch(
            "pupoo_ai.app.features.moderation.rag_service.is_watsonx_configured",
            return_value=True,
        ), patch(
            "pupoo_ai.app.features.moderation.rag_service.moderate_with_llm",
            return_value=("PASS", 0.08, "정상", [], []),
        ):
            result = moderate_with_rag("문장", "POST", {"boardId": 1})

        self.assertEqual(result[0], "ALLOW")
        self.assertEqual(result[1], 0.08)
        self.assertEqual(result[3], "rag_watsonx")


if __name__ == "__main__":
    unittest.main()
