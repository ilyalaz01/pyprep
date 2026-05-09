"""/api/auth/* — register, login, refresh.

Hard Rule 2: each handler ≤10 LOC of logic. Pydantic in/out. SDK exceptions
propagate; the centralized error handler (errors.py) maps them to HTTP.
"""

from __future__ import annotations

import datetime as dt
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr

from pyprep.api.deps import bearer_scheme, get_auth_service, get_settings
from pyprep.sdk.auth import AuthService, InvalidTokenError
from pyprep.sdk.shared.config import Settings

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    created_at: dt.datetime


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"  # noqa: S105 — OAuth scheme literal, not a secret
    expires_at: dt.datetime


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    response_model=UserResponse,
    summary="Register a new account (disabled in single-user deployments)",
)
def register(
    body: RegisterRequest,
    settings: Settings = Depends(get_settings),
    auth: AuthService = Depends(get_auth_service),
) -> UserResponse:
    if settings.single_user:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    user = auth.register(body.email, body.password)
    return UserResponse(id=user.id, email=user.email, created_at=user.created_at)


@router.post("/login", response_model=AccessTokenResponse)
def login(
    body: LoginRequest, auth: AuthService = Depends(get_auth_service)
) -> AccessTokenResponse:
    tok = auth.login(body.email, body.password)
    return AccessTokenResponse(access_token=tok.token, expires_at=tok.expires_at)


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    auth: AuthService = Depends(get_auth_service),
) -> AccessTokenResponse:
    if creds is None or creds.scheme.lower() != "bearer":
        raise InvalidTokenError()
    tok = auth.refresh_token(creds.credentials)
    return AccessTokenResponse(access_token=tok.token, expires_at=tok.expires_at)
