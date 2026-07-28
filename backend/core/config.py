import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    llm_provider: str = os.getenv("LLM_PROVIDER", "openai")
    llm_model: str = os.getenv("LLM_MODEL", "gpt-4o")
    llm_temperature: float = float(os.getenv("LLM_TEMPERATURE", "0.2"))
    embedding_model: str = "text-embedding-3-small"
    whisper_model: str = os.getenv("WHISPER_MODEL", "tiny")
    whisper_device: str = os.getenv("WHISPER_DEVICE", "cpu")
    whisper_compute_type: str = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
    chunk_size: int = int(os.getenv("CHUNK_SIZE", "400"))
    chunk_overlap: int = int(os.getenv("CHUNK_OVERLAP", "80"))
    chroma_persist_dir: str = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    upload_dir: str = os.getenv("UPLOAD_DIR", "./uploads")
    max_file_size_mb: int = int(os.getenv("MAX_FILE_SIZE_MB", "500"))
    retrieval_top_k: int = int(os.getenv("RETRIEVAL_TOP_K", "8"))
    use_hyde: bool = os.getenv("USE_HYDE", "false").lower() == "true"

    class Config:
        env_file = ".env"

settings = Settings()
os.makedirs(settings.upload_dir, exist_ok=True)
os.makedirs(settings.chroma_persist_dir, exist_ok=True)
