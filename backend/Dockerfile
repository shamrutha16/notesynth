# ── Stage 1: system deps as root ──────────────────────────────────────────────
FROM python:3.11-slim

# Install ALL system dependencies as root before switching users.
# chromadb  → libgomp1 (OpenMP), libssl (via openssl)
# faster-whisper → ffmpeg, libsndfile1
# general   → curl (health checks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create the non-root user that HF Spaces expects (uid 1000)
RUN useradd -m -u 1000 user

# Switch to user BEFORE pip install so packages land in the right place
USER user

# Environment — set BEFORE any RUN that needs them
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    # Hugging Face cache for Whisper model weights
    HF_HOME=/home/user/.cache/huggingface \
    # Whisper will also look here
    TRANSFORMERS_CACHE=/home/user/.cache/huggingface \
    # ChromaDB — keep data in a predictable location
    CHROMA_PERSIST_DIR=/home/user/app/chroma_db \
    UPLOAD_DIR=/home/user/app/uploads

WORKDIR /home/user/app

# ── Install Python dependencies ────────────────────────────────────────────────
# Copy only requirements first — Docker layer caching means this only
# re-runs when requirements.txt changes, not on every code edit.
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ── Copy application code ──────────────────────────────────────────────────────
COPY --chown=user . .

# Create writable runtime directories
RUN mkdir -p uploads/jobs chroma_db /home/user/.cache/huggingface

# ── Hugging Face Spaces requires port 7860 ─────────────────────────────────────
EXPOSE 7860

# Start uvicorn — single worker is fine for a demo/free-tier Space
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
