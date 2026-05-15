# syntax=docker/dockerfile:1.7

# ─── Stage 1: Frontend build ───────────────────────────────────────────
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend

# pnpm via corepack (bundled with Node 22)
RUN corepack enable && corepack prepare pnpm@9 --activate

# Cache install layer
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build
COPY frontend/ ./
RUN pnpm build
# Result: /app/frontend/dist/

# ─── Stage 2: Python runtime ───────────────────────────────────────────
FROM python:3.11-slim AS runtime

# Non-root user (uid 1000 standard non-root)
RUN useradd -m -u 1000 -d /app pyprep
WORKDIR /app

# uv (Astral)
RUN pip install --no-cache-dir uv

# Python deps — cache layer (manifests before source)
COPY --chown=pyprep:pyprep pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Backend source + content + migrations
COPY --chown=pyprep:pyprep src/ ./src/
COPY --chown=pyprep:pyprep content/ ./content/
COPY --chown=pyprep:pyprep alembic/ ./alembic/
COPY --chown=pyprep:pyprep alembic.ini ./

# MIT compliance: ship LICENSE in image (image distributed via registry)
COPY --chown=pyprep:pyprep LICENSE ./

# Built frontend from stage 1
COPY --from=frontend-build --chown=pyprep:pyprep /app/frontend/dist ./frontend/dist

# SQLite data volume — persists across restarts
RUN mkdir -p /data && chown pyprep:pyprep /data
VOLUME /data

ENV PYPREP_DATABASE_URL=sqlite:////data/pyprep.db \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

USER pyprep
EXPOSE 8000

# Orchestrator performs external HTTP probe on /api/health.
# No Dockerfile HEALTHCHECK directive — keeps image portable across hosts
# (Fly.io / Render / Railway / K8s all use their own probe mechanism).

CMD ["uv", "run", "pyprep-api"]
