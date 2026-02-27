import json
import logging
from typing import Optional, Dict
from datetime import datetime
from pathlib import Path
from models.schemas import ProcessingJob, JobStatus, GeneratedOutput
from core.config import settings

logger = logging.getLogger(__name__)
_jobs: Dict = {}
_outputs: Dict = {}
JOBS_DIR = Path(settings.upload_dir) / "jobs"
JOBS_DIR.mkdir(parents=True, exist_ok=True)


def create_job(job_id: str, filename: str) -> ProcessingJob:
    job = ProcessingJob(job_id=job_id, filename=filename)
    _save_job(job)
    return job


def _save_job(job: ProcessingJob):
    _jobs[job.job_id] = job.dict()
    try:
        with open(JOBS_DIR / f"{job.job_id}.json", "w") as f:
            json.dump(job.dict(), f, default=str)
    except Exception as e:
        logger.warning(f"Job persist error: {e}")


def get_job(job_id: str) -> Optional[ProcessingJob]:
    if job_id in _jobs:
        return ProcessingJob(**_jobs[job_id])
    p = JOBS_DIR / f"{job_id}.json"
    if p.exists():
        with open(p) as f:
            data = json.load(f)
        _jobs[job_id] = data
        return ProcessingJob(**data)
    return None


def update_job_status(job_id: str, status: JobStatus, progress: int, message: str, **kwargs):
    job = get_job(job_id)
    if not job:
        return
    job.status = status
    job.progress = progress
    job.message = message
    job.updated_at = datetime.utcnow()
    for k, v in kwargs.items():
        if hasattr(job, k):
            setattr(job, k, v)
    _save_job(job)


def save_output(job_id: str, output_type: str, output: GeneratedOutput):
    key = f"{job_id}_{output_type}"
    _outputs[key] = output.dict()
    try:
        with open(JOBS_DIR / f"{job_id}_{output_type}.json", "w") as f:
            json.dump(output.dict(), f, default=str)
    except Exception as e:
        logger.warning(f"Output persist error: {e}")


def get_output(job_id: str, output_type: str) -> Optional[Dict]:
    key = f"{job_id}_{output_type}"
    if key in _outputs:
        return _outputs[key]
    p = JOBS_DIR / f"{job_id}_{output_type}.json"
    if p.exists():
        with open(p) as f:
            data = json.load(f)
        _outputs[key] = data
        return data
    return None


def save_transcript(job_id: str, data: Dict):
    with open(JOBS_DIR / f"{job_id}_transcript.json", "w") as f:
        json.dump(data, f, default=str)


def get_transcript(job_id: str) -> Optional[Dict]:
    p = JOBS_DIR / f"{job_id}_transcript.json"
    if p.exists():
        with open(p) as f:
            return json.load(f)
    return None


def save_chunks(job_id: str, chunks: list):
    with open(JOBS_DIR / f"{job_id}_chunks.json", "w") as f:
        json.dump(chunks, f, default=str)


def get_chunks(job_id: str) -> Optional[list]:
    p = JOBS_DIR / f"{job_id}_chunks.json"
    if p.exists():
        with open(p) as f:
            return json.load(f)
    return None
