import json
import threading
from datetime import datetime
from pathlib import Path
from models.schemas import ProcessingJob, JobStatus

# ---------------------------------------------------------------------------
# In-memory job store — replaces Redis.
# Jobs live in process memory and reset on restart (fine for demos).
# All file-based outputs (transcript, chunks, outputs) are persisted to disk
# under uploads/jobs/{job_id}/ so they survive within a single run.
# ---------------------------------------------------------------------------

_store: dict[str, dict] = {}
_lock = threading.Lock()

UPLOAD_DIR = Path("./uploads")


# ── Job lifecycle ────────────────────────────────────────────────────────────

def create_job(job_id: str, filename: str) -> ProcessingJob:
    job = ProcessingJob(job_id=job_id, filename=filename, status=JobStatus.PENDING)
    with _lock:
        _store[job_id] = job.model_dump(mode="json")
    # Create the per-job output directory on disk
    (UPLOAD_DIR / "jobs" / job_id).mkdir(parents=True, exist_ok=True)
    return job


def get_job(job_id: str) -> ProcessingJob | None:
    with _lock:
        data = _store.get(job_id)
    return ProcessingJob(**data) if data else None


def update_job(job_id: str, **kwargs) -> None:
    """Low-level update — sets arbitrary fields directly."""
    with _lock:
        if job_id in _store:
            _store[job_id].update(kwargs)
            _store[job_id]["updated_at"] = datetime.utcnow().isoformat()


def update_job_status(
    job_id: str,
    status: JobStatus,
    progress: int,
    message: str,
    **kwargs,
) -> None:
    """
    Convenience wrapper used by processing.py.
    Updates status, progress, message, and any extra keyword fields
    (e.g. transcript_available=True, duration_seconds=..., outputs={...}).
    """
    with _lock:
        if job_id in _store:
            _store[job_id].update(
                status=status.value if isinstance(status, JobStatus) else status,
                progress=progress,
                message=message,
                updated_at=datetime.utcnow().isoformat(),
                **kwargs,
            )


# ── File-based persistence (outputs, transcript, chunks) ────────────────────

def _job_dir(job_id: str) -> Path:
    path = UPLOAD_DIR / "jobs" / job_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def save_transcript(job_id: str, data: dict) -> None:
    """Persist transcript JSON to disk."""
    path = _job_dir(job_id) / "transcript.json"
    path.write_text(json.dumps(data, default=str))


def get_transcript(job_id: str) -> dict | None:
    path = UPLOAD_DIR / "jobs" / job_id / "transcript.json"
    if path.exists():
        return json.loads(path.read_text())
    return None


def save_chunks(job_id: str, chunks: list) -> None:
    """Persist chunk list to disk."""
    path = _job_dir(job_id) / "chunks.json"
    path.write_text(json.dumps(chunks, default=str))


def get_chunks(job_id: str) -> list | None:
    path = UPLOAD_DIR / "jobs" / job_id / "chunks.json"
    if path.exists():
        return json.loads(path.read_text())
    return None


def save_output(job_id: str, output_type: str, data: dict) -> None:
    """Persist a generated output (notes / flashcards / etc.) to disk."""
    path = _job_dir(job_id) / f"{output_type}.json"
    path.write_text(json.dumps(data, default=str))


def get_output(job_id: str, output_type: str) -> dict | None:
    path = UPLOAD_DIR / "jobs" / job_id / f"{output_type}.json"
    if path.exists():
        return json.loads(path.read_text())
    return None
