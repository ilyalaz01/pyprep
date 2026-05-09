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
        # Cache disabled (T3.5.5): cached loggers bind the active processor
        # chain at first `get_logger()` and ignore later `structlog.configure()`
        # calls — which defeats `structlog.testing.capture_logs()` when test
        # ordering binds a logger before the capture scope runs. The per-call
        # resolution cost is microseconds; the test reliability is worth it.
        cache_logger_on_first_use=False,
    )
