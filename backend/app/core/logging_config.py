"""
Structured Logging Configuration

Provides JSON-formatted logging for production (machine-parsable)
and human-readable colored output for development.
"""

import logging
import logging.config
import json
from datetime import datetime, timezone

from app.core.config import settings


class JSONFormatter(logging.Formatter):
    """
    Outputs log records as single-line JSON objects.
    Ideal for log aggregation tools (Datadog, Grafana Loki, ELK).
    """

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Include exception info if present
        if record.exc_info and record.exc_info[0] is not None:
            log_entry["exception"] = self.formatException(record.exc_info)

        # Include extra fields if attached to the record
        for key in ("user_id", "request_id", "duration_ms", "status_code"):
            value = getattr(record, key, None)
            if value is not None:
                log_entry[key] = value

        return json.dumps(log_entry, default=str)


LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": JSONFormatter,
        },
        "standard": {
            "format": "%(asctime)s [%(levelname)-8s] %(name)s:%(funcName)s:%(lineno)d — %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stdout",
            "formatter": "standard" if settings.APP_ENV == "development" else "json",
        },
    },
    "root": {
        "level": "INFO",
        "handlers": ["console"],
    },
    "loggers": {
        "app": {
            "level": "DEBUG" if settings.DEBUG else "INFO",
            "handlers": ["console"],
            "propagate": False,
        },
        "uvicorn": {
            "level": "INFO",
            "handlers": ["console"],
            "propagate": False,
        },
        "sqlalchemy.engine": {
            "level": "WARNING",
            "handlers": ["console"],
            "propagate": False,
        },
    },
}


def setup_logging() -> None:
    """Initialize logging configuration. Call once at app startup."""
    logging.config.dictConfig(LOGGING_CONFIG)
