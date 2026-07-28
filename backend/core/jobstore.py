import json
import threading
from pathlib import Path
from models.schemas import ProcessingJob, JobStatus

# In-memory job store — replaces Redis for Hugging Face Spaces deployment.
# Jobs live in process memory and reset on restart (fine for demos).
# For production: swap _store with a Supabase/Postgres-backed store.

_store: dict[str, dict] = {}
_lock = threading.Lock()

UPLOAD_DIR = Path("./uploads")


def create_job(job_id: str, filename: str) -> ProcessingJob:
    job = ProcessingJob(id=job_id, filename=filename, status=JobStatus.PENDING)
    with _lock:
        _store[job_id] = job.model_dump(mode="json")
    return job


def get_job(job_id: str) -> ProcessingJob | None:
    with _lock:
        data = _store.get(job_id)
    return ProcessingJob(**data) if data else None


def update_job(job_id: str, **kwargs) -> None:
    with _lock:
        if job_id in _store:
            _store[job_id].update(kwargs)


def get_output(job_id: str, output_type: str) -> dict | None:
    path = UPLOAD_DIR / "jobs" / job_id / f"{output_type}.json"
    if path.exists():
        return json.loads(path.read_text())
    return None


def get_transcript(job_id: str) -> dict | None:
    path = UPLOAD_DIR / "jobs" / job_id / "transcript.json"
    if path.exists():
        return json.loads(path.read_text())
    return None
