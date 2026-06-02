"""Execution orchestrators for operational/ai/all modes."""

from __future__ import annotations

from collections import Counter
from pathlib import Path
from typing import Any

from src.generator.ai_seed_generator import AiSeedBuildResult, AiSeedGenerator
from src.generator.seed_generator import OperationalSeedGenerator, SeedBuildResult
from src.utils.path_utils import ensure_parent_dir, resolve_path
from src.validators.ai_seed_validator import AiSeedValidator
from src.validators.seed_validator import SeedValidator
from src.writers.ai_sql_writer import AiSqlWriter
from src.writers.sql_writer import SqlWriter


class AllModeOrchestrator:
    """Orchestrate operational and AI seed generation in strict order."""

    def __init__(self, config: dict[str, Any], data_pool_loader: Any, base_dir: Path) -> None:
        self.config = config
        self.data_pool_loader = data_pool_loader
        self.base_dir = base_dir

    def run_operational(self) -> tuple[SeedBuildResult, list[str], Path]:
        op_result = OperationalSeedGenerator(
            config=self.config,
            data_pool_loader=self.data_pool_loader,
            mode="operational",
        ).generate_result()
        op_data = op_result.as_table_dict()
        op_summary = SeedValidator(self.config).validate(op_data)

        output_path = resolve_path(self.base_dir, self.config["output_path_operational"])
        ensure_parent_dir(output_path)
        SqlWriter().write(output_path, op_data)
        return op_result, op_summary, output_path

    def run_ai(self, operational_result: SeedBuildResult) -> tuple[AiSeedBuildResult, list[str], Path]:
        ai_result = AiSeedGenerator(self.config).generate_result(operational_result)
        ai_data = ai_result.as_table_dict()
        ai_summary = AiSeedValidator(self.config).validate(ai_data, operational_result.as_table_dict())

        output_path = resolve_path(self.base_dir, self.config["output_path_ai"])
        ensure_parent_dir(output_path)
        AiSqlWriter().write(output_path, ai_data)
        return ai_result, ai_summary, output_path

    @staticmethod
    def build_operational_summary(result: SeedBuildResult) -> list[str]:
        status_counter = Counter(row["status"] for row in result.events)
        return [
            f"users: {len(result.users)}",
            f"pets: {len(result.pets)}",
            f"event: {len(result.events)}",
            f"event status distribution: {dict(status_counter)}",
            f"event_apply: {len(result.event_applies)}",
            f"event_program_apply: {len(result.event_program_applies)}",
            f"qr_codes: {len(result.qr_codes)}",
            f"qr_logs: {len(result.qr_logs)}",
            f"payments: {len(result.payments)}",
            f"reviews: {len(result.reviews)}",
            f"galleries: {len(result.galleries)}",
        ]

    @staticmethod
    def build_ai_summary(result: AiSeedBuildResult) -> list[str]:
        data = result.as_table_dict()
        return [
            f"ai_event_congestion_timeseries: {len(data['ai_event_congestion_timeseries'])}",
            f"ai_program_congestion_timeseries: {len(data['ai_program_congestion_timeseries'])}",
            f"ai_training_dataset: {len(data['ai_training_dataset'])}",
            f"ai_prediction_logs: {len(data['ai_prediction_logs'])}",
        ]
