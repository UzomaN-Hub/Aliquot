# Aliquot API image. Same Python as laptop and CI (STACK.md: python:3.13-slim).
# Build from apps/api:  docker build -t aliquot-api .
FROM python:3.13-slim

# uv binary, pinned to the same version as the laptop and CI.
COPY --from=ghcr.io/astral-sh/uv:0.13.9 /uv /uvx /bin/

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

WORKDIR /app

# 1) Dependencies only. This layer is cached until uv.lock changes,
#    so code-only changes rebuild in seconds.
COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --locked --no-dev --no-install-project

# 2) Application code.
COPY app ./app

ENV PATH="/app/.venv/bin:$PATH"

# Never run as root inside the container.
RUN useradd --system --no-create-home --uid 10001 appuser
USER appuser

EXPOSE 8000

# Render sets $PORT; default 8000 locally.
CMD ["sh", "-c", "exec fastapi run --host 0.0.0.0 --port ${PORT:-8000}"]
