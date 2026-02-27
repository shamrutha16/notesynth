import uuid
import logging
from typing import List
from models.schemas import TranscriptSegment, TranscriptChunk
from core.config import settings

logger = logging.getLogger(__name__)


def estimate_tokens(text: str) -> int:
    return len(text) // 4


def semantic_chunk_segments(
    segments: List[TranscriptSegment],
    chunk_size: int = None,
    chunk_overlap: int = None,
) -> List[TranscriptChunk]:
    chunk_size = chunk_size or settings.chunk_size
    chunk_overlap = chunk_overlap or settings.chunk_overlap

    if not segments:
        return []

    chunks = []
    current_segments = []
    current_tokens = 0
    overlap_text = ""
    overlap_tokens = 0

    for seg in segments:
        seg_tokens = estimate_tokens(seg.text)

        if current_tokens + seg_tokens > chunk_size and current_segments:
            chunk = _build_chunk(current_segments, overlap_text)
            chunks.append(chunk)
            overlap_text, overlap_tokens = _compute_overlap(current_segments, chunk_overlap)
            current_segments = []
            current_tokens = overlap_tokens

        current_segments.append(seg)
        current_tokens += seg_tokens

    if current_segments:
        chunks.append(_build_chunk(current_segments, overlap_text))

    logger.info(f"Created {len(chunks)} chunks from {len(segments)} segments")
    return chunks


def _build_chunk(segments: List[TranscriptSegment], overlap_prefix: str) -> TranscriptChunk:
    full_text = " ".join(s.text for s in segments).strip()
    chunk_text = f"[Context: {overlap_prefix}] {full_text}" if overlap_prefix else full_text
    return TranscriptChunk(
        chunk_id=str(uuid.uuid4()),
        text=chunk_text,
        start_time=segments[0].start,
        end_time=segments[-1].end,
        segment_ids=[s.id for s in segments],
        token_count=estimate_tokens(chunk_text),
    )


def _compute_overlap(segments: List[TranscriptSegment], overlap_tokens: int):
    overlap_parts = []
    collected = 0
    for seg in reversed(segments):
        t = estimate_tokens(seg.text)
        if collected + t > overlap_tokens:
            break
        overlap_parts.insert(0, seg.text)
        collected += t
    return " ".join(overlap_parts).strip(), collected
