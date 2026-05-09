"""Settings — pydantic-settings model loaded from env / .env / kwargs.

Single source of runtime configuration. Read once at app start and
passed to constructors; never read os.environ directly from inside
services (Hard Rule 5).
"""

from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, field_validator, model_validator
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
    single_user_email: str = "owner@local.dev"  # EmailStr-compatible (T2.5.1)
    single_user_password: SecretStr | None = None  # required when single_user=True
    daily_new_card_cap: int = 15
    jwt_ttl_days: int = 7
    password_min_length: int = Field(default=8, ge=4, le=128)
    log_level: LogLevel = "INFO"
    content_root: Path = Path("content")

    # API layer (T3.1). Comma-separated env (`PYPREP_CORS_ORIGINS=a,b,c`) is
    # split via the validator below — easier than pydantic-settings JSON or
    # `__`-delim list parsing for a small, human-edited list.
    cors_origins: list[str] = ["http://localhost:5173"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors(cls, v: object) -> object:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    @model_validator(mode="after")
    def _check_single_user_password(self) -> Settings:
        if self.single_user and self.single_user_password is None:
            raise ValueError(
                "PYPREP_SINGLE_USER_PASSWORD must be set when PYPREP_SINGLE_USER=true"
            )
        return self
