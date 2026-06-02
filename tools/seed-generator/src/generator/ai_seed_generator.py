"""AI seed generation orchestration."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from src.builders.ai_event_timeseries_builder import AiEventTimeseriesBuilder
from src.builders.ai_prediction_log_builder import AiPredictionLogBuilder
from src.builders.ai_program_timeseries_builder import AiProgramTimeseriesBuilder
from src.builders.ai_training_dataset_builder import AiTrainingDatasetBuilder
from src.generator.seed_generator import SeedBuildResult


@dataclass
class AiBuilderContext:
    """Shared context for AI builders."""

    config: dict[str, Any]
    rng: random.Random = field(default_factory=lambda: random.Random(20260314))
    now: datetime = field(default_factory=lambda: datetime(2026, 3, 14, 12, 0, 0))

    def table_target(self, table_name: str) -> dict[str, int]:
        ai_cfg = self.config.get("ai", {})
        scale = ai_cfg.get("scale_mode", ai_cfg.get("scale", "normal"))
        targets = ai_cfg.get("target_rows", {})
        if scale not in targets:
            raise ValueError(f"unknown ai.scale_mode: {scale}")
        table_range = targets[scale].get(table_name)
        if not table_range:
            raise ValueError(f"missing target rows config for {table_name} in scale {scale}")
        return table_range

    @property
    def interval_minutes(self) -> int:
        ai_cfg = self.config.get("ai", {})
        base_interval = int(ai_cfg.get("interval_minutes", ai_cfg.get("step_minutes", 5)))
        return max(1, base_interval)

    @property
    def training_window_minutes(self) -> int:
        ai_cfg = self.config.get("ai", {})
        return max(10, int(ai_cfg.get("training_window_minutes", 60)))

    @property
    def prediction_enabled(self) -> bool:
        return bool(self.config.get("ai", {}).get("prediction_enabled", True))

    @property
    def event_timeseries_enabled(self) -> bool:
        return bool(self.config.get("ai", {}).get("event_timeseries_enabled", True))

    @property
    def program_timeseries_enabled(self) -> bool:
        return bool(self.config.get("ai", {}).get("program_timeseries_enabled", True))


@dataclass
class AiSeedBuildResult:
    """AI seed build result object."""

    ai_event_congestion_timeseries: list[dict[str, Any]]
    ai_program_congestion_timeseries: list[dict[str, Any]]
    ai_training_dataset: list[dict[str, Any]]
    ai_prediction_logs: list[dict[str, Any]]

    def as_table_dict(self) -> dict[str, list[dict[str, Any]]]:
        return {
            "ai_event_congestion_timeseries": self.ai_event_congestion_timeseries,
            "ai_program_congestion_timeseries": self.ai_program_congestion_timeseries,
            "ai_training_dataset": self.ai_training_dataset,
            "ai_prediction_logs": self.ai_prediction_logs,
        }


class AiSeedGenerator:
    """Generate AI-only tables from operational seed result object."""

    def __init__(self, config: dict[str, Any]) -> None:
        self.config = config
        self.context = AiBuilderContext(config=config)

    def generate_result(self, operational_result: SeedBuildResult) -> AiSeedBuildResult:
        operational_data = operational_result.as_table_dict()

        event_ts = []
        if self.context.event_timeseries_enabled:
            event_ts = AiEventTimeseriesBuilder(self.context).build(operational_data)

        program_ts = []
        if self.context.program_timeseries_enabled:
            program_ts = AiProgramTimeseriesBuilder(self.context).build(operational_data)

        training_rows = AiTrainingDatasetBuilder(self.context).build(event_ts, program_ts)

        prediction_rows = []
        if self.context.prediction_enabled:
            prediction_rows = AiPredictionLogBuilder(self.context).build(
                training_rows=training_rows,
                event_rows=event_ts,
                program_rows=program_ts,
            )

        return AiSeedBuildResult(
            ai_event_congestion_timeseries=event_ts,
            ai_program_congestion_timeseries=program_ts,
            ai_training_dataset=training_rows,
            ai_prediction_logs=prediction_rows,
        )

    # Backward compatibility helper.
    def generate(self, operational_data: dict[str, list[Any]]) -> dict[str, list[dict[str, Any]]]:
        dummy_result = SeedBuildResult(
            users=operational_data.get("users", []),
            pets=operational_data.get("pet", []),
            boards=operational_data.get("boards", []),
            interests=operational_data.get("interests", []),
            events=operational_data.get("event", []),
            event_images=operational_data.get("event_images", []),
            booths=operational_data.get("booths", []),
            event_programs=operational_data.get("event_program", []),
            speakers=operational_data.get("speakers", []),
            program_speakers=operational_data.get("program_speakers", []),
            event_congestion_policies=operational_data.get("event_congestion_policy", []),
            event_interest_maps=operational_data.get("event_interest_map", []),
            event_applies=operational_data.get("event_apply", []),
            event_program_applies=operational_data.get("event_program_apply", []),
            qr_codes=operational_data.get("qr_codes", []),
            qr_logs=operational_data.get("qr_logs", []),
            booth_waits=operational_data.get("booth_waits", []),
            experience_waits=operational_data.get("experience_waits", []),
            congestions=operational_data.get("congestions", []),
            posts=operational_data.get("posts", []),
            post_comments=operational_data.get("post_comments", []),
            notices=operational_data.get("notices", []),
            reviews=operational_data.get("reviews", []),
            review_comments=operational_data.get("review_comments", []),
            galleries=operational_data.get("galleries", []),
            gallery_images=operational_data.get("gallery_images", []),
            gallery_likes=operational_data.get("gallery_likes", []),
            payments=operational_data.get("payments", []),
            refunds=operational_data.get("refunds", []),
            notifications=operational_data.get("notification", []),
            notification_sends=operational_data.get("notification_send", []),
            notification_inboxes=operational_data.get("notification_inbox", []),
            notification_settings=operational_data.get("notification_settings", []),
            user_interest_subscriptions=operational_data.get("user_interest_subscriptions", []),
            social_accounts=operational_data.get("social_account", []),
            content_reports=operational_data.get("content_reports", []),
        )
        return self.generate_result(dummy_result).as_table_dict()
