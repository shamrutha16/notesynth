import gc
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

        # Free transcription data refs before chunking — model is already unloaded
        # inside transcribe_audio(), but segments list can still be large
        gc.collect()

        chunks = semantic_chunk_segments(segments)
        save_chunks(job_id, [c.dict() for c in chunks])
        update_job_status(job_id, JobStatus.EMBEDDING, 45,
            f"Created {len(chunks)} chunks, embedding...", chunk_count=len(chunks))

        embed_and_store_chunks(job_id, chunks)
        # Free chunk embeddings from RAM before generation phase
        gc.collect()
        update_job_status(job_id, JobStatus.GENERATING, 60, "Generating study materials with AI...")

        # Whole-lecture generation: every chunk is used (no top-k retrieval), so
        # long lectures are fully covered. The vector store is kept for Q&A chat.
        outputs, errors = generate_all_outputs(job_id, output_types, chunks, segments)
        if not outputs:
            first_error = next(iter(errors.values()), "unknown error")
            raise RuntimeError(f"No study materials could be generated: {first_error}")

        available = {}
        total = len(outputs)
        for i, (ot_str, output) in enumerate(outputs.items()):
            save_output(job_id, ot_str, output.model_dump(mode="json"))
            available[ot_str] = True
            progress = 60 + int((i + 1) / max(total, 1) * 35)
            update_job_status(job_id, JobStatus.GENERATING, progress,
                f"Generated {ot_str} ({i+1}/{total})", outputs=available)

        if errors:
            missing = ", ".join(sorted(errors))
            logger.warning(f"Job {job_id}: missing outputs {errors}")
            update_job_status(job_id, JobStatus.COMPLETED, 100,
                f"Study materials ready, but could not generate: {missing}", outputs=available,
                error="; ".join(f"{k}: {v}" for k, v in errors.items()))
        else:
            update_job_status(job_id, JobStatus.COMPLETED, 100, "All study materials ready!", outputs=available)
        logger.info(f"Job {job_id} completed")

    except Exception as e:
        logger.error(f"Job {job_id} failed: {e}", exc_info=True)
        update_job_status(job_id, JobStatus.FAILED, 0, f"Processing failed: {str(e)}", error=str(e))


def start_processing_background(job_id: str, audio_path: str, output_types=None):
    t = threading.Thread(target=process_audio_job, args=(job_id, audio_path, output_types), daemon=True)
    t.start()
    return t
