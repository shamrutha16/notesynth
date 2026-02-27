import uuid
import logging
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from core.config import settings
from core.jobstore import create_job, get_job, get_output, get_transcript
from models.schemas import ProcessingJob, OutputType, JobStatus
from tasks.processing import start_processing_background

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED = {".mp3", ".mp4", ".m4a", ".wav", ".webm", ".ogg", ".flac"}
MAX_SIZE = settings.max_file_size_mb * 1024 * 1024


@router.post("/upload", response_model=ProcessingJob)
async def upload_audio(file: UploadFile = File(...)):
    suffix = Path(file.filename or "audio.mp3").suffix.lower()
    if suffix not in ALLOWED:
        raise HTTPException(400, f"Unsupported format: {suffix}. Allowed: {', '.join(ALLOWED)}")
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(413, f"File too large. Max: {settings.max_file_size_mb}MB")
    job_id = str(uuid.uuid4())
    path = Path(settings.upload_dir) / f"{job_id}{suffix}"
    with open(path, "wb") as f:
        f.write(content)
    job = create_job(job_id, file.filename or "audio")
    start_processing_background(job_id, str(path))
    return job


@router.post("/record", response_model=ProcessingJob)
async def upload_recording(file: UploadFile = File(...)):
    job_id = str(uuid.uuid4())
    path = Path(settings.upload_dir) / f"{job_id}.webm"
    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)
    job = create_job(job_id, "recording.webm")
    start_processing_background(job_id, str(path))
    return job


@router.get("/jobs/{job_id}", response_model=ProcessingJob)
async def get_job_status(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@router.get("/jobs/{job_id}/transcript")
async def job_transcript(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if not job.transcript_available:
        raise HTTPException(202, "Transcript not ready yet")
    t = get_transcript(job_id)
    if not t:
        raise HTTPException(404, "Transcript not found")
    return t


@router.get("/jobs/{job_id}/output/{output_type}")
async def job_output(job_id: str, output_type: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job.status not in [JobStatus.COMPLETED, JobStatus.GENERATING]:
        raise HTTPException(202, f"Not ready. Status: {job.status}")
    try:
        OutputType(output_type)
    except ValueError:
        raise HTTPException(400, f"Invalid type. Valid: {[t.value for t in OutputType]}")
    out = get_output(job_id, output_type)
    if not out:
        raise HTTPException(202, f"'{output_type}' not generated yet")
    return out
