"""structlog JSON-output configuration (closes NOTES N013).

Called once at app construction. The processor chain emits a single JSON
line per event with timestamp, level, logger name, event, and any bound
context keys. Level is `Settings.log_level`.
"""

from __future__ import annotations

import logging

import structlog

from pyprep.sdk.shared.config import LogLevel


def configure_logging(level: LogLevel) -> None:
    logging.basicConfig(format="%(message)s", level=getattr(logging, level), force=True)
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(getattr(logging, level)),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
