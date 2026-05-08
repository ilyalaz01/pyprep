"""Settings — pydantic-settings model loaded from env / .env / kwargs.

Single source of runtime configuration. Read once at app start and
passed to constructors; never read os.environ directly from inside
services (Hard Rule 5).
"""

from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

LogLevel = Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="PYPREP_",
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    secret_key: str = Field(min_length=32)
    database_url: str = "sqlite:///./pyprep.db"
    single_user: bool = False
    single_user_email: str = "owner@local"
    daily_new_card_cap: int = 15
    jwt_ttl_days: int = 7
    password_min_length: int = Field(default=8, ge=4, le=128)
    log_level: LogLevel = "INFO"
    content_root: Path = Path("content")
