FROM python:3.14-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app \
    PORT=8000

RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --upgrade pip \
    && pip install -r requirements.txt \
    && useradd -ms /bin/bash appuser

COPY . .

RUN mkdir -p /app/pupoo_ai \
    && find /app -mindepth 1 -maxdepth 1 ! -name pupoo_ai -exec mv {} /app/pupoo_ai/ \; \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

CMD ["sh", "-c", "uvicorn pupoo_ai.app.main:app --host 0.0.0.0 --port ${PORT}"]
