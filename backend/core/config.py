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
    # --- Whole-lecture generation ---
    anthropic_model: str = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")
    llm_timeout_s: float = float(os.getenv("LLM_TIMEOUT_S", "120"))
    # Lectures up to this many transcript tokens go to the LLM in one pass;
    # longer ones are split into time-ordered sections of ~section_tokens each.
    single_pass_tokens: int = int(os.getenv("SINGLE_PASS_TOKENS", "6000"))
    section_tokens: int = int(os.getenv("SECTION_TOKENS", "2500"))
    llm_max_parallel: int = int(os.getenv("LLM_MAX_PARALLEL", "3"))
    # Second LLM pass that drops flashcards/MCQs/Q&A not supported by their cited chunks
    verify_outputs: bool = os.getenv("VERIFY_OUTPUTS", "true").lower() == "true"
    max_flashcards: int = int(os.getenv("MAX_FLASHCARDS", "40"))
    max_mcqs: int = int(os.getenv("MAX_MCQS", "30"))
    max_qa: int = int(os.getenv("MAX_QA", "20"))

    class Config:
        env_file = ".env"

settings = Settings()
os.makedirs(settings.upload_dir, exist_ok=True)
os.makedirs(settings.chroma_persist_dir, exist_ok=True)
