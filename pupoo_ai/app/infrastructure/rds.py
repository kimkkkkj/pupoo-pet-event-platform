"""RDS connection utilities."""

from __future__ import annotations

from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
import os
import re
from typing import Any
from urllib.parse import parse_qs, unquote, urlparse

import pymysql

from pupoo_ai.app.core.config import settings


@dataclass(frozen=True)
class DbConnectionConfig:
    host: str
    port: int
    user: str
    password: str
    database: str
    charset: str
    connect_timeout: int
    read_timeout: int
    write_timeout: int
    ssl_ca: str = ""


def _parse_db_url(db_url: str) -> dict[str, Any]:
    parsed = urlparse(db_url)
    if parsed.scheme not in {"mysql", "mysql+pymysql"}:
        raise ValueError("Unsupported DB URL scheme. Expected mysql:// or mysql+pymysql://")

    query = parse_qs(parsed.query)
    return {
        "host": parsed.hostname or "",
        "port": parsed.port or 3306,
        "user": unquote(parsed.username or ""),
        "password": unquote(parsed.password or ""),
        "database": parsed.path.lstrip("/"),
        "ssl_ca": query.get("ssl_ca", [""])[0],
    }


def _parse_jdbc_mysql_url(jdbc_url: str) -> dict[str, Any]:
    normalized = jdbc_url.strip()
    if normalized.startswith("jdbc:"):
        normalized = normalized[5:]
    if not normalized:
        return {}
    try:
        return _parse_db_url(normalized)
    except Exception:
        return {}


def _extract_default_from_placeholder(value: str) -> str:
    match = re.search(r"\$\{[^:}]+:(.+)}", value)
    if not match:
        return value.strip()
    return match.group(1).strip()


def _read_backend_datasource_defaults() -> dict[str, str]:
    # Local fallback: reuse backend datasource defaults when AI env is empty.
    candidate = (
        Path(__file__).resolve().parents[3]
        / "pupoo_backend"
        / "src"
        / "main"
        / "resources"
        / "application.properties"
    )
    if not candidate.exists():
        return {}

    defaults: dict[str, str] = {}
    try:
        for raw_line in candidate.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip()
            if key == "spring.datasource.url":
                defaults["url"] = _extract_default_from_placeholder(value)
            elif key == "spring.datasource.username":
                defaults["user"] = _extract_default_from_placeholder(value)
            elif key == "spring.datasource.password":
                defaults["password"] = _extract_default_from_placeholder(value)
    except Exception:
        return {}
    return defaults


def resolve_db_config() -> DbConnectionConfig:
    parsed_url: dict[str, Any] = {}
    if settings.db_url.strip():
        parsed_url = _parse_db_url(settings.db_url.strip())
    else:
        env_jdbc = os.getenv("SPRING_DATASOURCE_URL", "").strip()
        if env_jdbc:
            parsed_url = _parse_jdbc_mysql_url(env_jdbc)

    backend_defaults = _read_backend_datasource_defaults()
    backend_url_parsed = (
        _parse_jdbc_mysql_url(backend_defaults.get("url", ""))
        if backend_defaults.get("url")
        else {}
    )

    host = settings.db_host.strip() or parsed_url.get("host", "") or backend_url_parsed.get("host", "")
    port = settings.db_port or parsed_url.get("port", 3306) or backend_url_parsed.get("port", 3306)
    user = (
        settings.db_user.strip()
        or parsed_url.get("user", "")
        or os.getenv("SPRING_DATASOURCE_USERNAME", "").strip()
        or backend_defaults.get("user", "")
    )
    password = (
        settings.db_password
        or parsed_url.get("password", "")
        or os.getenv("SPRING_DATASOURCE_PASSWORD", "")
        or backend_defaults.get("password", "")
    )
    database = settings.db_name.strip() or parsed_url.get("database", "") or backend_url_parsed.get("database", "")
    ssl_ca = settings.db_ssl_ca.strip() or parsed_url.get("ssl_ca", "")

    if not all([host, user, database]):
        raise ValueError("Database configuration is incomplete.")

    return DbConnectionConfig(
        host=host,
        port=int(port),
        user=user,
        password=password,
        database=database,
        charset=settings.db_charset,
        connect_timeout=settings.db_connect_timeout,
        read_timeout=settings.db_read_timeout,
        write_timeout=settings.db_write_timeout,
        ssl_ca=ssl_ca,
    )


def is_rds_configured() -> bool:
    try:
        resolve_db_config()
        return True
    except Exception:
        return False


def create_connection() -> pymysql.connections.Connection:
    config = resolve_db_config()
    connection_kwargs: dict[str, Any] = {
        "host": config.host,
        "port": config.port,
        "user": config.user,
        "password": config.password,
        "database": config.database,
        "charset": config.charset,
        "connect_timeout": config.connect_timeout,
        "read_timeout": config.read_timeout,
        "write_timeout": config.write_timeout,
        "cursorclass": pymysql.cursors.DictCursor,
        "autocommit": True,
    }
    if config.ssl_ca:
        connection_kwargs["ssl"] = {"ca": config.ssl_ca}
    return pymysql.connect(**connection_kwargs)


@contextmanager
def db_connection():
    connection = create_connection()
    try:
        yield connection
    finally:
        connection.close()


def check_connection() -> dict[str, Any]:
    config = resolve_db_config()
    with db_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1 AS ok")
            row = cursor.fetchone() or {}

    return {
        "configured": True,
        "reachable": bool(row.get("ok")),
        "host": config.host,
        "port": config.port,
        "database": config.database,
        "user": config.user,
    }
