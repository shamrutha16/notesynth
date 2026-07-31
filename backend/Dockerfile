# ── Google Cloud Run & HF Compatible Dockerfile ─────────────────────────────
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 user
USER user

ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HF_HOME=/home/user/.cache/huggingface \
    TRANSFORMERS_CACHE=/home/user/.cache/huggingface \
    CHROMA_PERSIST_DIR=/home/user/app/chroma_db \
    UPLOAD_DIR=/home/user/app/uploads \
    PORT=8080

WORKDIR /home/user/app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

COPY --chown=user . .

RUN mkdir -p uploads/jobs chroma_db /home/user/.cache/huggingface

EXPOSE 8080

# Shell form ensures ${PORT:-8080} environment variable injected by Cloud Run is used
CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1"
