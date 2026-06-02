from unittest.mock import patch

import pytest

from pupoo_ai.app.features.moderation.watsonx_client import moderate_with_llm


class _FakeLlm:
    def __init__(self, output: str):
        self._output = output

    def invoke(self, prompt: str) -> str:
        return self._output


def _run_llm_output(output: str):
    with patch(
        "pupoo_ai.app.features.moderation.watsonx_client.get_llm_for_moderation",
        return_value=_FakeLlm(output),
    ):
        return moderate_with_llm(
            "행복한 반려견 일상 글입니다.",
            [{"policy_id": "P-001", "chunk_text": "정책 안내"}],
        )


def test_watsonx_action_pass_and_score_parse():
    action, score, reason, flagged, inferred = _run_llm_output(
        "ACTION: PASS\nSCORE: 0.42\nREASON: 정상적인 일상 글입니다.\nFLAGGED: 없음\nINFERRED: 없음"
    )

    assert action == "PASS"
    assert score == 0.42
    assert reason == "정상적인 일상 글입니다."
    assert flagged is None
    assert inferred is None


def test_watsonx_action_block_parse():
    action, score, reason, flagged, inferred = _run_llm_output(
        "ACTION: BLOCK\nSCORE: 0.91\nREASON: 직접적인 위해 표현입니다.\nFLAGGED: 죽어라\nINFERRED: 위해 위협"
    )

    assert action == "BLOCK"
    assert score == 0.91
    assert reason == "직접적인 위해 표현입니다."
    assert flagged == ["죽어라"]
    assert inferred == ["위해 위협"]


@pytest.mark.parametrize(
    "output",
    [
        "SCORE: 0.35\nREASON: 행동 값이 없습니다.",
        "ACTION: MAYBE\nSCORE: 0.35\nREASON: 지원하지 않는 행동 값입니다.",
    ],
)
def test_watsonx_action_missing_or_invalid_is_blocked(output: str):
    action, score, reason, flagged, inferred = _run_llm_output(output)

    assert action == "BLOCK"
    assert score is None
    assert "해석하지 못해" in (reason or "")
    assert flagged is None
    assert inferred is None


def test_watsonx_score_missing_returns_none():
    action, score, reason, *_ = _run_llm_output(
        "ACTION: WARN\nREASON: 주의가 필요한 표현입니다.\nFLAGGED: 없음\nINFERRED: 없음"
    )

    assert action == "WARN"
    assert score is None
    assert reason == "주의가 필요한 표현입니다."


def test_watsonx_score_invalid_string_returns_none():
    action, score, reason, *_ = _run_llm_output(
        "ACTION: REVIEW\nSCORE: abc\nREASON: 운영자 검토가 필요합니다.\nFLAGGED: 없음\nINFERRED: 없음"
    )

    assert action == "REVIEW"
    assert score is None
    assert reason == "운영자 검토가 필요합니다."


def test_watsonx_score_out_of_range_is_clamped():
    action, score, reason, *_ = _run_llm_output(
        "ACTION: BLOCK\nSCORE: 1.75\nREASON: 명확한 금칙 표현입니다.\nFLAGGED: 죽여버리고 싶다\nINFERRED: 없음"
    )

    assert action == "BLOCK"
    assert score == 1.0
    assert reason == "명확한 금칙 표현입니다."


def test_watsonx_score_below_zero_is_clamped():
    action, score, reason, *_ = _run_llm_output(
        "ACTION: WARN\nSCORE: -0.45\nREASON: 경고 수준 표현입니다.\nFLAGGED: 없음\nINFERRED: 없음"
    )

    assert action == "WARN"
    assert score == 0.0
    assert reason == "경고 수준 표현입니다."
