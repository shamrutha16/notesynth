import logging
from typing import List, Tuple
from models.schemas import TranscriptSegment, TranscriptWord
from core.config import settings

logger = logging.getLogger(__name__)
_whisper_model = None


def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        try:
            from faster_whisper import WhisperModel
            logger.info(f"Loading Whisper model: {settings.whisper_model}")
            _whisper_model = WhisperModel(
                settings.whisper_model,
                device=settings.whisper_device,
                compute_type=settings.whisper_compute_type,
            )
        except ImportError:
            logger.warning("faster-whisper not installed, using mock transcription")
            return None
    return _whisper_model


def transcribe_audio(audio_path: str) -> Tuple[List[TranscriptSegment], float]:
    model = get_whisper_model()
    if model is None:
        return _mock_transcription()

    segments_raw, info = model.transcribe(
        audio_path,
        word_timestamps=True,
        vad_filter=True,
        beam_size=5,
        temperature=0.0,
    )

    segments = []
    for i, seg in enumerate(segments_raw):
        words = []
        if seg.words:
            for w in seg.words:
                words.append(TranscriptWord(
                    word=w.word,
                    start=round(w.start, 3),
                    end=round(w.end, 3),
                    probability=round(w.probability, 4),
                ))
        segments.append(TranscriptSegment(
            id=i, start=round(seg.start, 3), end=round(seg.end, 3),
            text=seg.text.strip(), words=words,
        ))

    duration = getattr(info, 'duration', segments[-1].end if segments else 0)
    return segments, duration


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
        words_list = text.split()
        word_dur = (end - start) / len(words_list)
        words = [
            TranscriptWord(
                word=w,
                start=round(start + j * word_dur, 3),
                end=round(start + (j + 1) * word_dur, 3),
                probability=0.95,
            )
            for j, w in enumerate(words_list)
        ]
        segments.append(TranscriptSegment(id=i, start=start, end=end, text=text, words=words))
    return segments, 115.0


def format_timestamp(seconds: float) -> str:
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins:02d}:{secs:02d}"
