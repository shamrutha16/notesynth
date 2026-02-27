import json
import logging
import uuid
from typing import List, Dict, Optional
from models.schemas import GeneratedOutput, OutputType, StudyNote, Flashcard, MCQ, MCQOption, QAPair
from core.config import settings
from core.vectorstore import retrieve_relevant_chunks

logger = logging.getLogger(__name__)


def fmt_ts(s: float) -> str:
    return f"{int(s//60):02d}:{int(s%60):02d}"


def format_chunks(chunks: List[Dict]) -> str:
    return "\n\n".join(
        f"[CHUNK {i+1} | {fmt_ts(c['start_time'])}-{fmt_ts(c['end_time'])}]\n{c['text']}"
        for i, c in enumerate(chunks)
    )


def call_llm(system: str, user: str) -> str:
    if settings.llm_provider == "anthropic" and settings.anthropic_api_key:
        return _anthropic(system, user)
    elif settings.openai_api_key:
        return _openai(system, user)
    return _mock()


def _openai(system: str, user: str) -> str:
    from openai import OpenAI
    client = OpenAI(api_key=settings.openai_api_key)
    r = client.chat.completions.create(
        model=settings.llm_model,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        temperature=settings.llm_temperature,
        max_tokens=4096,
        response_format={"type": "json_object"},
    )
    return r.choices[0].message.content


def _anthropic(system: str, user: str) -> str:
    import anthropic
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    msg = client.messages.create(
        model="claude-3-5-sonnet-20241022", max_tokens=4096,
        system=system, messages=[{"role": "user", "content": user}],
        temperature=settings.llm_temperature,
    )
    return msg.content[0].text


def _mock() -> str:
    return json.dumps({
        "notes": [{"title": "Mock Notes", "content": "No API key configured. Add OPENAI_API_KEY to .env", "timestamps": [{"start": 0, "end": 10}], "subsection": "Setup"}],
        "summary": "No API key configured. Add OPENAI_API_KEY to your .env file to generate real content. [00:00-00:10]",
        "flashcards": [{"front": "What is NoteSynth?", "back": "An AI tool that converts lectures to study materials", "difficulty": "easy", "timestamps": [{"start": 0, "end": 10}]}],
        "mcqs": [{"question": "What do you need to use NoteSynth?", "options": {"A": "An API key", "B": "A printer", "C": "A calculator", "D": "A phone"}, "correct_answer": "A", "explanation": "You need an OpenAI API key in your .env file.", "timestamps": [{"start": 0, "end": 10}]}],
        "qa_pairs": [{"question": "How do I set up NoteSynth?", "answer": "Add your OPENAI_API_KEY to the .env file and restart Docker.", "timestamps": [{"start": 0, "end": 10}]}],
    })


NOTES_PROMPT = """You are an expert academic note-taker. Create comprehensive study notes from lecture transcripts.
RULES:
1. Every fact MUST cite source timestamp [MM:SS-MM:SS]
2. Use Markdown with **bold** key terms
3. Organize with clear headings
4. Never fabricate information
Return JSON: {"notes": [{"title": "...", "subsection": "...", "content": "markdown with [MM:SS-MM:SS] citations", "timestamps": [{"start": 0.0, "end": 60.0}]}]}"""

SUMMARY_PROMPT = """You are an expert summarizer. Create a comprehensive lecture summary.
RULES:
1. Every paragraph MUST cite timestamp [MM:SS-MM:SS]
2. Bold important concepts
3. Cover all major topics
Return JSON: {"summary": "markdown summary with [MM:SS-MM:SS] citations", "timestamps": [{"start": 0.0, "end": 60.0}]}"""

FLASHCARDS_PROMPT = """You are an expert flashcard creator. Create 8-15 study flashcards.
RULES:
1. Each card MUST cite source timestamp
2. Front: clear question or term
3. Back: concise accurate answer
4. Vary difficulty (easy/medium/hard)
Return JSON: {"flashcards": [{"front": "...", "back": "...", "difficulty": "medium", "timestamps": [{"start": 0.0, "end": 30.0}]}]}"""

MCQS_PROMPT = """You are an expert exam question writer. Create 8-12 multiple choice questions.
RULES:
1. Each MCQ MUST cite source timestamp
2. 4 options (A/B/C/D), one correct
3. Include detailed explanation
4. Test understanding not just recall
Return JSON: {"mcqs": [{"question": "...", "options": {"A": "...", "B": "...", "C": "...", "D": "..."}, "correct_answer": "B", "explanation": "...", "timestamps": [{"start": 0.0, "end": 30.0}]}]}"""

QA_PROMPT = """You are an expert study guide creator. Create 6-10 question-answer pairs.
RULES:
1. Each Q&A MUST cite source timestamp
2. Range from recall to application questions
3. Comprehensive detailed answers
Return JSON: {"qa_pairs": [{"question": "...", "answer": "...", "timestamps": [{"start": 0.0, "end": 60.0}]}]}"""


def generate_notes(job_id: str, chunks: List[Dict]) -> Optional[GeneratedOutput]:
    try:
        data = json.loads(call_llm(NOTES_PROMPT, f"Create notes from:\n\n{format_chunks(chunks)}"))
        notes = [StudyNote(id=str(uuid.uuid4()), title=n.get("title",""), content=n.get("content",""), subsection=n.get("subsection"), source_timestamps=n.get("timestamps",[])) for n in data.get("notes",[])]
        return GeneratedOutput(output_type=OutputType.NOTES, job_id=job_id, notes=notes)
    except Exception as e:
        logger.error(f"Notes error: {e}")
        return None


def generate_summary(job_id: str, chunks: List[Dict]) -> Optional[GeneratedOutput]:
    try:
        data = json.loads(call_llm(SUMMARY_PROMPT, f"Summarize:\n\n{format_chunks(chunks)}"))
        return GeneratedOutput(output_type=OutputType.SUMMARY, job_id=job_id, summary=data.get("summary",""), summary_timestamps=data.get("timestamps",[]))
    except Exception as e:
        logger.error(f"Summary error: {e}")
        return None


def generate_flashcards(job_id: str, chunks: List[Dict]) -> Optional[GeneratedOutput]:
    try:
        data = json.loads(call_llm(FLASHCARDS_PROMPT, f"Create flashcards from:\n\n{format_chunks(chunks)}"))
        cards = [Flashcard(id=str(uuid.uuid4()), front=f.get("front",""), back=f.get("back",""), difficulty=f.get("difficulty","medium"), source_timestamps=f.get("timestamps",[])) for f in data.get("flashcards",[])]
        return GeneratedOutput(output_type=OutputType.FLASHCARDS, job_id=job_id, flashcards=cards)
    except Exception as e:
        logger.error(f"Flashcards error: {e}")
        return None


def generate_mcqs(job_id: str, chunks: List[Dict]) -> Optional[GeneratedOutput]:
    try:
        data = json.loads(call_llm(MCQS_PROMPT, f"Create MCQs from:\n\n{format_chunks(chunks)}"))
        mcqs = []
        for q in data.get("mcqs",[]):
            opts = [MCQOption(id=k, text=v) for k, v in q.get("options",{}).items()]
            mcqs.append(MCQ(id=str(uuid.uuid4()), question=q.get("question",""), options=opts, correct_answer=q.get("correct_answer","A"), explanation=q.get("explanation",""), source_timestamps=q.get("timestamps",[])))
        return GeneratedOutput(output_type=OutputType.MCQS, job_id=job_id, mcqs=mcqs)
    except Exception as e:
        logger.error(f"MCQs error: {e}")
        return None


def generate_qa(job_id: str, chunks: List[Dict]) -> Optional[GeneratedOutput]:
    try:
        data = json.loads(call_llm(QA_PROMPT, f"Create Q&A from:\n\n{format_chunks(chunks)}"))
        pairs = [QAPair(id=str(uuid.uuid4()), question=p.get("question",""), answer=p.get("answer",""), source_timestamps=p.get("timestamps",[])) for p in data.get("qa_pairs",[])]
        return GeneratedOutput(output_type=OutputType.QA, job_id=job_id, qa_pairs=pairs)
    except Exception as e:
        logger.error(f"QA error: {e}")
        return None


def generate_all_outputs(job_id: str, output_types: List[OutputType], all_chunks: List[Dict]) -> Dict:
    results = {}
    queries = {
        OutputType.NOTES: "key concepts definitions and important points in this lecture",
        OutputType.SUMMARY: "overview of all topics covered in this lecture",
        OutputType.FLASHCARDS: "terms concepts and facts to memorize from this lecture",
        OutputType.MCQS: "knowledge from this lecture that could be tested in an exam",
        OutputType.QA: "important questions a student should answer after this lecture",
    }
    generators = {
        OutputType.NOTES: generate_notes,
        OutputType.SUMMARY: generate_summary,
        OutputType.FLASHCARDS: generate_flashcards,
        OutputType.MCQS: generate_mcqs,
        OutputType.QA: generate_qa,
    }
    for ot in output_types:
        chunks = retrieve_relevant_chunks(job_id, queries.get(ot, "lecture content"), top_k=settings.retrieval_top_k)
        if not chunks:
            chunks = all_chunks[:settings.retrieval_top_k]
        result = generators[ot](job_id, chunks)
        if result:
            results[ot.value] = result
    return results
