import logging
from typing import List
from models.schemas import TranscriptSegment, TranscriptChunk
from core.config import settings

logger = logging.getLogger(__name__)


def estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


def semantic_chunk_segments(
    segments: List[TranscriptSegment],
    chunk_size: int = None,
    chunk_overlap: int = None,
) -> List[TranscriptChunk]:
    """Pack time-ordered Whisper segments into ~chunk_size-token chunks.

    Overlap is done by carrying whole trailing segments into the next chunk as
    real segments (not as an injected "[Context: ...]" prefix), so each chunk's
    start_time is accurate and the overlap can be skipped at generation time
    via ``overlap_segments``. Chunk ids are deterministic ("c0000", "c0001", ...)
    so re-processing a job upserts instead of duplicating vectors.
    """
    chunk_size = settings.chunk_size if chunk_size is None else chunk_size
    chunk_overlap = settings.chunk_overlap if chunk_overlap is None else chunk_overlap

    segments = sorted((s for s in segments if s.text and s.text.strip()), key=lambda s: s.start)
    if not segments:
        return []

    chunks: List[TranscriptChunk] = []
    current: List[TranscriptSegment] = []
    current_tokens = 0
    carried = 0  # how many leading segments of `current` are overlap from the previous chunk

    for seg in segments:
        seg_tokens = estimate_tokens(seg.text)
        if current and current_tokens + seg_tokens > chunk_size and len(current) > carried:
            chunks.append(_build_chunk(len(chunks), current, carried))
            tail = _overlap_tail(current, chunk_overlap)
            current = list(tail)
            carried = len(tail)
            current_tokens = sum(estimate_tokens(s.text) for s in current)
        current.append(seg)
        current_tokens += seg_tokens

    if current and len(current) > carried:
        chunks.append(_build_chunk(len(chunks), current, carried))

    logger.info(f"Created {len(chunks)} chunks from {len(segments)} segments")
    return chunks


def _build_chunk(index: int, segments: List[TranscriptSegment], carried: int) -> TranscriptChunk:
    text = " ".join(s.text.strip() for s in segments).strip()
    return TranscriptChunk(
        chunk_id=f"c{index:04d}",
        text=text,
        start_time=segments[0].start,
        end_time=segments[-1].end,
        segment_ids=[s.id for s in segments],
        token_count=estimate_tokens(text),
        overlap_segments=carried,
    )


def _overlap_tail(segments: List[TranscriptSegment], overlap_tokens: int) -> List[TranscriptSegment]:
    if overlap_tokens <= 0:
        return []
    tail: List[TranscriptSegment] = []
    collected = 0
    for seg in reversed(segments):
        t = estimate_tokens(seg.text)
        if collected + t > overlap_tokens:
            break
        tail.insert(0, seg)
        collected += t
    # never carry the whole chunk forward
    return tail if len(tail) < len(segments) else tail[1:]
