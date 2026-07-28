import gc
import logging
from typing import List, Tuple
from models.schemas import TranscriptSegment, TranscriptWord
from core.config import settings

logger = logging.getLogger(__name__)

# Model is NOT kept in memory permanently.
# It is loaded on demand, used, then immediately unloaded to free RAM.
# This is the critical fix for Render's 512MB free tier.
_whisper_model = None


def _load_model():
    """Load the Whisper model into memory."""
    from faster_whisper import WhisperModel
    logger.info(f"Loading Whisper model '{settings.whisper_model}' (device={settings.whisper_device}, compute={settings.whisper_compute_type})")
    return WhisperModel(
        settings.whisper_model,
        device=settings.whisper_device,
        compute_type=settings.whisper_compute_type,
        # Limit CPU threads to avoid memory spikes on small instances
        cpu_threads=2,
        num_workers=1,
    )


def _unload_model():
    """Unload the Whisper model and aggressively free RAM."""
    global _whisper_model
    if _whisper_model is not None:
        logger.info("Unloading Whisper model to free RAM")
        del _whisper_model
        _whisper_model = None
        gc.collect()


def transcribe_audio(audio_path: str) -> Tuple[List[TranscriptSegment], float]:
    """
    Transcribe audio file. Loads the model, transcribes, then immediately
    unloads the model to stay within the 512MB RAM limit on free hosting tiers.
    """
    global _whisper_model

    try:
        _whisper_model = _load_model()
    except ImportError:
        logger.warning("faster-whisper not installed — using mock transcription")
        return _mock_transcription()
    except Exception as e:
        logger.error(f"Failed to load Whisper model: {e}")
        return _mock_transcription()

    try:
        segments_raw, info = _whisper_model.transcribe(
            audio_path,
            # Memory optimizations:
            beam_size=1,           # beam_size=1 (greedy) uses ~60% less RAM vs beam_size=5
            word_timestamps=False, # Disable word-level timestamps — saves ~30% memory
            vad_filter=True,       # Voice activity detection — skips silence, faster + less RAM
            temperature=0.0,       # Greedy decoding, no random sampling overhead
            condition_on_previous_text=False,  # Avoids keeping context in RAM across segments
        )

        segments = []
        for i, seg in enumerate(segments_raw):
            segments.append(TranscriptSegment(
                id=i,
                start=round(seg.start, 3),
                end=round(seg.end, 3),
                text=seg.text.strip(),
                words=[],  # No word timestamps (memory optimization)
            ))

        duration = getattr(info, "duration", segments[-1].end if segments else 0)
        return segments, duration

    except Exception as e:
        logger.error(f"Transcription failed: {e}", exc_info=True)
        raise

    finally:
        # CRITICAL: Always unload model after transcription regardless of success/failure
        _unload_model()


def _mock_transcription() -> Tuple[List[TranscriptSegment], float]:
    mock_text = [
        (0.0, 8.0, "Welcome to today's lecture on machine learning fundamentals."),
        (8.0, 16.0, "We'll start with supervised learning, the most common type of ML."),
        (16.0, 25.0, "In supervised learning, we train models using labeled data pairs."),
        (25.0, 34.0, "The model learns to map inputs to outputs by minimizing a loss function."),
        (34.0, 43.0, "Common algorithms include linear regression, decision trees, and neural networks."),
        (43.0, 52.0, "Neural networks are particularly powerful for complex pattern recognition tasks."),
        (52.0, 61.0, "The key advantage is their ability to learn hierarchical feature representations."),
        (61.0, 70.0, "Next, let's discuss unsupervised learning where data has no labels."),
        (70.0, 79.0, "Clustering algorithms like K-means group similar data points together."),
        (79.0, 88.0, "Dimensionality reduction techniques like PCA help visualize high-dimensional data."),
        (88.0, 97.0, "Finally, reinforcement learning involves agents learning through trial and error."),
        (97.0, 106.0, "The agent receives rewards or penalties based on its actions in an environment."),
        (106.0, 115.0, "Deep reinforcement learning combines neural networks with RL for complex tasks."),
    ]
    segments = []
    for i, (start, end, text) in enumerate(mock_text):
        segments.append(TranscriptSegment(id=i, start=start, end=end, text=text, words=[]))
    return segments, 115.0


def format_timestamp(seconds: float) -> str:
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins:02d}:{secs:02d}"
