"""SQL file writer for seed result."""

from __future__ import annotations

from datetime import datetime, date
from pathlib import Path
from typing import Any


DELETE_ORDER = [
    "gallery_likes",
    "gallery_images",
    "galleries",
    "review_comments",
    "reviews",
    "post_comments",
    "posts",
    "content_reports",
    "qr_logs",
    "qr_codes",
    "booth_waits",
    "experience_waits",
    "congestions",
    "program_speakers",
    "speakers",
    "event_program_apply",
    "event_program",
    "booths",
    "event_apply",
    "event_images",
    "event_interest_map",
    "user_interest_subscriptions",
    "notification_inbox",
    "notification_send",
    "notification_settings",
    "notification",
    "refunds",
    "payments",
    "event_congestion_policy",
    "interests",
    "boards",
    "notices",
    "event",
    "pet",
    "social_account",
    "users",
]


INSERT_ORDER = [
    "users",
    "social_account",
    "pet",
    "boards",
    "interests",
    "event",
    "notices",
    "event_images",
    "booths",
    "event_program",
    "speakers",
    "program_speakers",
    "event_apply",
    "event_program_apply",
    "qr_codes",
    "qr_logs",
    "booth_waits",
    "experience_waits",
    "congestions",
    "posts",
    "post_comments",
    "reviews",
    "review_comments",
    "galleries",
    "gallery_images",
    "gallery_likes",
    "payments",
    "refunds",
    "notification",
    "notification_send",
    "notification_inbox",
    "notification_settings",
    "user_interest_subscriptions",
    "event_interest_map",
    "event_congestion_policy",
    "content_reports",
]


class SqlWriter:
    """Render seed dictionary into executable SQL file."""

    def write(self, output_path: Path, data: dict[str, list[Any]]) -> None:
        lines: list[str] = []
        lines.append("SET SQL_SAFE_UPDATES = 0;")
        lines.append("SET FOREIGN_KEY_CHECKS = 0;")
        lines.append("")
        lines.extend(self._build_delete_sql())
        lines.append("")
        lines.extend(self._build_insert_sql(data))
        lines.append("")
        lines.append("SET FOREIGN_KEY_CHECKS = 1;")

        output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    def _build_delete_sql(self) -> list[str]:
        return [f"DELETE FROM `{table}`;" for table in DELETE_ORDER]

    def _build_insert_sql(self, data: dict[str, list[Any]]) -> list[str]:
        result: list[str] = []
        for table in INSERT_ORDER:
            rows = data.get(table, [])
            if not rows:
                continue
            row_dicts = [self._to_row_dict(r) for r in rows]
            cols = list(row_dicts[0].keys())
            col_sql = ", ".join(f"`{c}`" for c in cols)
            result.append(f"INSERT INTO `{table}` ({col_sql}) VALUES")
            value_lines: list[str] = []
            for row in row_dicts:
                values = [self._to_sql_value(row[col]) for col in cols]
                value_lines.append(f"  ({', '.join(values)})")
            result.append(",\n".join(value_lines) + ";")
        return result

    @staticmethod
    def _to_row_dict(row: Any) -> dict[str, Any]:
        if hasattr(row, "as_dict"):
            return row.as_dict()
        if isinstance(row, dict):
            return row
        raise TypeError(f"지원하지 않는 row 타입: {type(row)!r}")

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

