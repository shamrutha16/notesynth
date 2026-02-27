import logging
import threading
from typing import List, Optional
from models.schemas import JobStatus, OutputType
from core.jobstore import update_job_status, save_output, save_transcript, save_chunks
from core.transcription import transcribe_audio
from core.chunking import semantic_chunk_segments
from core.vectorstore import embed_and_store_chunks
from core.generation import generate_all_outputs

logger = logging.getLogger(__name__)


def process_audio_job(job_id: str, audio_path: str, output_types: Optional[List[OutputType]] = None):
    if output_types is None:
        output_types = list(OutputType)
    try:
        update_job_status(job_id, JobStatus.TRANSCRIBING, 10, "Transcribing audio with Whisper...")
        segments, duration = transcribe_audio(audio_path)
        if not segments:
            raise ValueError("Transcription produced no segments")

        save_transcript(job_id, {"segments": [s.dict() for s in segments], "duration": duration})
        update_job_status(job_id, JobStatus.TRANSCRIBING, 30,
            f"Transcription complete: {len(segments)} segments",
            transcript_available=True, duration_seconds=duration)

        chunks = semantic_chunk_segments(segments)
        save_chunks(job_id, [c.dict() for c in chunks])
        update_job_status(job_id, JobStatus.EMBEDDING, 45,
            f"Created {len(chunks)} chunks, embedding...", chunk_count=len(chunks))

        embed_and_store_chunks(job_id, chunks)
        update_job_status(job_id, JobStatus.GENERATING, 60, "Generating study materials with AI...")

        all_chunks_dict = [{"text": c.text, "start_time": c.start_time, "end_time": c.end_time} for c in chunks]
        outputs = generate_all_outputs(job_id, output_types, all_chunks_dict)

        available = {}
        total = len(outputs)
        for i, (ot_str, output) in enumerate(outputs.items()):
            save_output(job_id, ot_str, output)
            available[ot_str] = True
            progress = 60 + int((i + 1) / max(total, 1) * 35)
            update_job_status(job_id, JobStatus.GENERATING, progress,
                f"Generated {ot_str} ({i+1}/{total})", outputs=available)

        update_job_status(job_id, JobStatus.COMPLETED, 100, "All study materials ready!", outputs=available)
        logger.info(f"Job {job_id} completed")

    except Exception as e:
        logger.error(f"Job {job_id} failed: {e}", exc_info=True)
        update_job_status(job_id, JobStatus.FAILED, 0, f"Processing failed: {str(e)}", error=str(e))


def start_processing_background(job_id: str, audio_path: str, output_types=None):
    t = threading.Thread(target=process_audio_job, args=(job_id, audio_path, output_types), daemon=True)
    t.start()
    return t
