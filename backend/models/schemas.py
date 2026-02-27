from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from enum import Enum
from datetime import datetime


class JobStatus(str, Enum):
    PENDING = "pending"
    TRANSCRIBING = "transcribing"
    EMBEDDING = "embedding"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class OutputType(str, Enum):
    NOTES = "notes"
    SUMMARY = "summary"
    FLASHCARDS = "flashcards"
    MCQS = "mcqs"
    QA = "qa"


class TranscriptWord(BaseModel):
    word: str
    start: float
    end: float
    probability: float = 1.0


class TranscriptSegment(BaseModel):
    id: int
    start: float
    end: float
    text: str
    words: List[TranscriptWord] = []


class TranscriptChunk(BaseModel):
    chunk_id: str
    text: str
    start_time: float
    end_time: float
    segment_ids: List[int]
    token_count: int


class Flashcard(BaseModel):
    id: str
    front: str
    back: str
    source_timestamps: List[Dict] = []
    difficulty: str = "medium"


class MCQOption(BaseModel):
    id: str
    text: str


class MCQ(BaseModel):
    id: str
    question: str
    options: List[MCQOption]
    correct_answer: str
    explanation: str
    source_timestamps: List[Dict] = []


class QAPair(BaseModel):
    id: str
    question: str
    answer: str
    source_timestamps: List[Dict] = []


class StudyNote(BaseModel):
    id: str
    title: str
    content: str
    source_timestamps: List[Dict] = []
    subsection: Optional[str] = None


class GeneratedOutput(BaseModel):
    output_type: OutputType
    job_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[List[StudyNote]] = None
    summary: Optional[str] = None
    summary_timestamps: Optional[List[Dict]] = None
    flashcards: Optional[List[Flashcard]] = None
    mcqs: Optional[List[MCQ]] = None
    qa_pairs: Optional[List[QAPair]] = None


class ProcessingJob(BaseModel):
    job_id: str
    filename: str
    status: JobStatus = JobStatus.PENDING
    progress: int = 0
    message: str = "Queued for processing"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    transcript_available: bool = False
    duration_seconds: Optional[float] = None
    chunk_count: Optional[int] = None
    outputs: Dict[str, bool] = Field(default_factory=dict)
    error: Optional[str] = None


class GenerateRequest(BaseModel):
    job_id: str
    output_types: List[OutputType] = Field(default_factory=lambda: list(OutputType))
