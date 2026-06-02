"""공통 로거 유틸리티.

기능:
- 서비스명과 trace ID를 로그 포맷에 주입한다.
"""

import logging
from contextvars import ContextVar, Token

from pupoo_ai.app.core.config import settings

TRACE_ID_DEFAULT = "-"
_trace_id_context: ContextVar[str] = ContextVar("trace_id", default=TRACE_ID_DEFAULT)


class ServiceTraceFilter(logging.Filter):
    """각 로그 레코드에 서비스명과 trace ID를 주입한다."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.service = settings.service_name
        record.trace_id = _trace_id_context.get()
        return True


def set_trace_id(trace_id: str) -> Token:
    """현재 요청 컨텍스트에 trace ID를 저장한다."""
    return _trace_id_context.set(trace_id)


def reset_trace_id(token: Token) -> None:
    """요청 종료 후 trace ID 컨텍스트를 복원한다."""
    _trace_id_context.reset(token)


def get_trace_id() -> str:
    """현재 컨텍스트의 trace ID를 반환한다."""
    return _trace_id_context.get()


def get_logger(name: str) -> logging.Logger:
    """프로젝트 공통 포맷이 적용된 로거를 반환한다."""
    logger = logging.getLogger(name)
    if getattr(logger, "_pupoo_logger_configured", False):
        return logger

    handler = logging.StreamHandler()
    handler.setFormatter(
        logging.Formatter("[%(service)s] [%(trace_id)s] [%(levelname)s] %(message)s")
    )
    handler.addFilter(ServiceTraceFilter())

    logger.handlers.clear()
    logger.addHandler(handler)
    logger.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))
    logger.propagate = False
    logger._pupoo_logger_configured = True  # type: ignore[attr-defined]
    return logger
