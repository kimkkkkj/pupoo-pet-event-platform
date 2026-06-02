"""Seed generator CLI entrypoint."""

from __future__ import annotations

import argparse
import traceback
from pathlib import Path

from src.generator.orchestrator import AllModeOrchestrator
from src.loaders.config_loader import load_config
from src.loaders.data_pool_loader import DataPoolLoader
from src.utils.path_utils import resolve_path


def _default_config_path() -> Path:
    return Path(__file__).resolve().parent / "config" / "seed_config.yaml"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Pupoo seed SQL generator")
    parser.add_argument("--config", type=str, default=str(_default_config_path()))
    parser.add_argument("--mode", type=str, choices=["operational", "ai", "all"], default=None)
    parser.add_argument("--output", type=str, default=None, help="override operational output path")
    parser.add_argument("--ai-output", type=str, default=None, help="override ai output path")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    phase = "init"

    try:
        phase = "config load"
        print("[1/4] config load")
        config = load_config(args.config)
        selected_mode = args.mode or str(config.get("mode_default", "all"))

        if args.output:
            config["output_path_operational"] = args.output
        if args.ai_output:
            config["output_path_ai"] = args.ai_output

        base_dir = Path(__file__).resolve().parent
        schema_path = resolve_path(base_dir, config["schema_path"])
        if not schema_path.exists():
            raise FileNotFoundError(f"schema file not found: {schema_path}")

        phase = "data_pool load"
        print("[2/4] data_pool load")
        data_pool_loader = DataPoolLoader()
        data_pool_loader.load_named_pool(base_dir / "data_pool")

        orchestrator = AllModeOrchestrator(config=config, data_pool_loader=data_pool_loader, base_dir=base_dir)

        if selected_mode == "operational":
            phase = "operational flow"
            print("[3/4] operational generation")
            op_result, op_validator_summary, op_output_path = orchestrator.run_operational()

            print(f"- mode: {selected_mode}")
            print(f"- operational output: {op_output_path}")
            print("- operational summary:")
            for line in orchestrator.build_operational_summary(op_result):
                print(f"  {line}")
            print("- operational validator:")
            for line in op_validator_summary:
                print(f"  {line}")
            print("--mode operational completed successfully")
            return 0

        if selected_mode == "ai":
            phase = "ai-only policy check"
            raise RuntimeError(
                "AI seed generation requires operational seed context. "
                "Run with --mode all or provide an operational dataset source."
            )

        # selected_mode == "all"
        phase = "all flow - operational"
        print("[3/4] operational generation")
        op_result, op_validator_summary, op_output_path = orchestrator.run_operational()

        print(f"- operational output: {op_output_path}")
        print("- operational summary:")
        for line in orchestrator.build_operational_summary(op_result):
            print(f"  {line}")
        print("- operational validator:")
        for line in op_validator_summary:
            print(f"  {line}")

        phase = "all flow - ai"
        print("[4/4] ai generation")
        ai_result, ai_validator_summary, ai_output_path = orchestrator.run_ai(op_result)

        print(f"- ai output: {ai_output_path}")
        print("- ai summary:")
        for line in orchestrator.build_ai_summary(ai_result):
            print(f"  {line}")
        print("- ai validator:")
        for line in ai_validator_summary:
            print(f"  {line}")

        print("--mode all completed successfully")
        return 0

    except Exception as exc:  # pragma: no cover
        print("[ERROR] seed generation failed")
        print(f"- phase: {phase}")
        print(f"- reason: {exc}")
        print("- traceback:")
        print(traceback.format_exc())
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
