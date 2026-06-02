"""SQL writer for AI-only seed output."""

from __future__ import annotations

from datetime import date, datetime
from pathlib import Path
from typing import Any


TABLE_ORDER = [
    "ai_event_congestion_timeseries",
    "ai_program_congestion_timeseries",
    "ai_training_dataset",
    "ai_prediction_logs",
]

DELETE_ORDER = [
    "ai_prediction_logs",
    "ai_training_dataset",
    "ai_program_congestion_timeseries",
    "ai_event_congestion_timeseries",
]

# Use DB-managed AUTO_INCREMENT ids for safer import on shared/active DB.
AUTO_INCREMENT_ID_COLUMNS: dict[str, str] = {
    "ai_event_congestion_timeseries": "event_timeseries_id",
    "ai_program_congestion_timeseries": "program_timeseries_id",
    "ai_training_dataset": "training_dataset_id",
    "ai_prediction_logs": "prediction_log_id",
}

# Upsert tables that already have natural unique keys in schema.
UPSERT_TABLES = {
    "ai_event_congestion_timeseries",
    "ai_program_congestion_timeseries",
    "ai_training_dataset",
}

# Large single INSERT can exceed server packet/timeout on remote DB.
TABLE_BATCH_SIZE: dict[str, int] = {
    "ai_event_congestion_timeseries": 5000,
    "ai_program_congestion_timeseries": 5000,
    "ai_training_dataset": 500,
    "ai_prediction_logs": 2000,
}


class AiSqlWriter:
    """Render AI seed dictionary into executable SQL file."""

    def write(self, output_path: Path, data: dict[str, list[Any]]) -> None:
        lines: list[str] = [
            "SET SQL_SAFE_UPDATES = 0;",
            "SET FOREIGN_KEY_CHECKS = 0;",
            "",
        ]
        for table in DELETE_ORDER:
            lines.append(f"DELETE FROM {table};")
        lines.append("")
        lines.extend(self._build_insert_sql(data))
        lines.append("")
        lines.append("SET FOREIGN_KEY_CHECKS = 1;")

        output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    def _build_insert_sql(self, data: dict[str, list[Any]]) -> list[str]:
        result: list[str] = []
        for table in TABLE_ORDER:
            rows = data.get(table, [])
            if not rows:
                continue
            row_dicts = [self._to_row_dict(row) for row in rows]
            columns = self._resolve_insert_columns(table, row_dicts[0])
            if not columns:
                raise ValueError(f"no insertable columns for table: {table}")
            column_sql = ", ".join(f"`{col}`" for col in columns)
            batch_size = TABLE_BATCH_SIZE.get(table, 2000)
            for start in range(0, len(row_dicts), batch_size):
                batch = row_dicts[start : start + batch_size]
                result.append(f"INSERT INTO {table} ({column_sql}) VALUES")
                values_sql: list[str] = []
                for row in batch:
                    values = ", ".join(self._to_sql_value(row[col]) for col in columns)
                    values_sql.append(f"  ({values})")
                body_sql = ",\n".join(values_sql)
                if table in UPSERT_TABLES:
                    update_sql = ", ".join(f"`{col}`=VALUES(`{col}`)" for col in columns)
                    result.append(f"{body_sql}\nON DUPLICATE KEY UPDATE {update_sql};")
                else:
                    result.append(body_sql + ";")
        return result

    @staticmethod
    def _resolve_insert_columns(table: str, sample_row: dict[str, Any]) -> list[str]:
        columns = list(sample_row.keys())
        auto_id_col = AUTO_INCREMENT_ID_COLUMNS.get(table)
        if auto_id_col and auto_id_col in columns:
            columns.remove(auto_id_col)
        return columns

    @staticmethod
    def _to_row_dict(row: Any) -> dict[str, Any]:
        if hasattr(row, "as_dict"):
            return row.as_dict()
        if isinstance(row, dict):
            return row
        raise TypeError(f"unsupported row type: {type(row)!r}")

    def _to_sql_value(self, value: Any) -> str:
        if value is None:
            return "NULL"
        if isinstance(value, bool):
            return "1" if value else "0"
        if isinstance(value, (int, float)):
            return str(value)
        if isinstance(value, datetime):
            return f"'{value.strftime('%Y-%m-%d %H:%M:%S')}'"
        if isinstance(value, date):
            return f"'{value.strftime('%Y-%m-%d')}'"
        escaped = str(value).replace("\\", "\\\\").replace("'", "''")
        return f"'{escaped}'"
