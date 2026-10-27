"""Whole-lecture, validated, grounded generation of study materials.

Pipeline (replaces the old "top-8 chunks per output type" approach):

1. Build citation units from ALL chunks in time order (overlap text removed).
2. Short lecture  -> one section. Long lecture -> time-ordered sections of
   ~settings.section_tokens each ("map" step), processed in parallel.
3. Per section, ONE LLM call produces every requested output type, so cards,
   MCQs and Q&A share context and overlap less. The model cites chunk ids
   (e.g. "c0003"); timestamps are derived from those ids in code, so they can
   never be invented.
4. Every item is validated with Pydantic (MCQ must have options A-D, the key
   must be one of them, citations must point at chunks of that section, ...).
   Invalid items are dropped individually instead of losing the whole output.
5. Optional verifier pass drops flashcards / MCQs / Q&A that their cited
   chunks don't support.
6. "Reduce" step: section summaries are merged into one summary; cards, MCQs
   and Q&A are de-duplicated across sections and capped; MCQ answer positions
   are shuffled to remove the model's "B is always right" bias.

The output schema (GeneratedOutput) is unchanged, so the frontend needs no edits.
"""
import json
import logging
import random
import re
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence, Tuple

from pydantic import BaseModel, Field, ValidationError, field_validator, model_validator

from core.config import settings
from models.schemas import (
    MCQ, Flashcard, GeneratedOutput, MCQOption, OutputType, QAPair, StudyNote,
    TranscriptChunk, TranscriptSegment,
)

logger = logging.getLogger(__name__)

OPTION_KEYS = ("A", "B", "C", "D")
CHUNK_REF_RE = re.compile(r"\[\s*(c\d{4}(?:\s*[,;]\s*c\d{4})*)\s*\]")
RAW_TS_RE = re.compile(r"\[\d{1,3}:\d{2}\s*-\s*\d{1,3}:\d{2}\]")


class GenerationError(Exception):
    pass


# ----------------------------------------------------------------------------
# Citation units and sections
# ----------------------------------------------------------------------------

@dataclass
class Unit:
    chunk_id: str
    start: float
    end: float
    text: str  # chunk text WITHOUT the overlap carried from the previous chunk

    @property
    def tokens(self) -> int:
        return max(1, len(self.text) // 4)


@dataclass
class Section:
    index: int
    units: List[Unit]
    ids: set = field(init=False)

    def __post_init__(self):
        self.ids = {u.chunk_id for u in self.units}

    @property
    def start(self) -> float:
        return self.units[0].start

    @property
    def end(self) -> float:
        return self.units[-1].end


def fmt_ts(s: float) -> str:
    return f"{int(s // 60):02d}:{int(s % 60):02d}"


def build_units(chunks: Sequence[TranscriptChunk], segments: Sequence[TranscriptSegment]) -> List[Unit]:
    seg_text = {s.id: s.text.strip() for s in segments}
    units = []
    for c in sorted(chunks, key=lambda c: c.start_time):
        own_ids = c.segment_ids[c.overlap_segments:] or c.segment_ids
        text = " ".join(seg_text[i] for i in own_ids if i in seg_text).strip() or c.text
        start = next((s.start for s in segments if s.id == own_ids[0]), c.start_time)
        units.append(Unit(chunk_id=c.chunk_id, start=start, end=c.end_time, text=text))
    return units


def build_sections(units: List[Unit]) -> List[Section]:
    total = sum(u.tokens for u in units)
    if total <= settings.single_pass_tokens:
        return [Section(0, list(units))] if units else []
    sections, current, tokens = [], [], 0
    for u in units:
        if current and tokens + u.tokens > settings.section_tokens:
            sections.append(Section(len(sections), current))
            current, tokens = [], 0
        current.append(u)
        tokens += u.tokens
    if current:
        # fold a tiny tail into the previous section
        if sections and tokens < settings.section_tokens // 3:
            sections[-1] = Section(sections[-1].index, sections[-1].units + current)
        else:
            sections.append(Section(len(sections), current))
    return sections


def format_section(section: Section) -> str:
    return "\n\n".join(
        f"[{u.chunk_id} | {fmt_ts(u.start)}-{fmt_ts(u.end)}]\n{u.text}" for u in section.units
    )


def timestamps_for(ids: Sequence[str], by_id: Dict[str, Unit]) -> List[Dict]:
    """Chunk ids -> merged [{start, end}] ranges, in time order."""
    spans = sorted((by_id[i].start, by_id[i].end) for i in dict.fromkeys(ids) if i in by_id)
    merged: List[List[float]] = []
    for s, e in spans:
        if merged and s <= merged[-1][1] + 1.0:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([s, e])
    return [{"start": round(s, 2), "end": round(e, 2)} for s, e in merged]


def render_citations(text: str, by_id: Dict[str, Unit]) -> str:
    """Replace inline [c0003] / [c0003, c0004] refs with [MM:SS-MM:SS] (the format
    the frontend renders). Drops timestamps the model typed itself (unverifiable)
    and refs to unknown chunks."""
    text = RAW_TS_RE.sub("", text)

    def repl(m: re.Match) -> str:
        ids = [i.strip() for i in re.split(r"[,;]", m.group(1))]
        ts = timestamps_for(ids, by_id)
        return " ".join(f"[{fmt_ts(t['start'])}-{fmt_ts(t['end'])}]" for t in ts)

    text = CHUNK_REF_RE.sub(repl, text)
    return re.sub(r"[ \t]{2,}", " ", text).strip()


# ----------------------------------------------------------------------------
# Validated LLM output models
# ----------------------------------------------------------------------------

class _Cited(BaseModel):
    chunks: List[str] = Field(min_length=1)

    @field_validator("chunks", mode="before")
    @classmethod
    def _norm_chunks(cls, v):
        if isinstance(v, str):
            v = re.split(r"[,;\s]+", v)
        return [str(x).strip().lower() for x in v if str(x).strip()]


class RawNote(_Cited):
    title: str = Field(min_length=1)
    subsection: Optional[str] = None
    content: str = Field(min_length=20)


class RawCard(_Cited):
    front: str = Field(min_length=3)
    back: str = Field(min_length=1)
    difficulty: str = "medium"

    @field_validator("difficulty", mode="before")
    @classmethod
    def _norm_difficulty(cls, v):
        v = str(v or "medium").strip().lower()
        return v if v in ("easy", "medium", "hard") else "medium"


class RawMCQ(_Cited):
    question: str = Field(min_length=5)
    options: Dict[str, str]
    correct_answer: str
    explanation: str = ""

    @field_validator("correct_answer", mode="before")
    @classmethod
    def _norm_key(cls, v):
        return str(v).strip().upper()[:1]

    @model_validator(mode="after")
    def _check_options(self):
        opts = {str(k).strip().upper(): str(t).strip() for k, t in self.options.items()}
        if set(opts) != set(OPTION_KEYS):
            raise ValueError(f"options must be exactly A-D, got {sorted(opts)}")
        if any(not t for t in opts.values()):
            raise ValueError("empty option text")
        if len({t.lower() for t in opts.values()}) < 4:
            raise ValueError("duplicate options")
        if any(re.search(r"\b(all|none) of the above\b", t, re.I) for t in opts.values()):
            raise ValueError("'all/none of the above' options are not allowed")
        if self.correct_answer not in opts:
            raise ValueError(f"correct_answer {self.correct_answer!r} not in options")
        self.options = opts
        return self


class RawQA(_Cited):
    question: str = Field(min_length=5)
    answer: str = Field(min_length=1)


class RawSummary(_Cited):
    summary: str = Field(min_length=20)


ITEM_MODELS = {"notes": RawNote, "flashcards": RawCard, "mcqs": RawMCQ, "qa_pairs": RawQA}


# ----------------------------------------------------------------------------
# LLM calls
# ----------------------------------------------------------------------------

def llm_available() -> bool:
    if settings.llm_provider == "anthropic":
        return bool(settings.anthropic_api_key)
    return bool(settings.openai_api_key)


def call_llm(system: str, user: str) -> str:
    if settings.llm_provider == "anthropic" and settings.anthropic_api_key:
        return _anthropic(system, user)
    if settings.openai_api_key:
        return _openai(system, user)
    raise GenerationError("No LLM API key configured (set OPENAI_API_KEY or ANTHROPIC_API_KEY)")


def _openai(system: str, user: str) -> str:
    from openai import OpenAI
    client = OpenAI(api_key=settings.openai_api_key, timeout=settings.llm_timeout_s, max_retries=2)
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
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key, timeout=settings.llm_timeout_s, max_retries=2)
    msg = client.messages.create(
        model=settings.anthropic_model, max_tokens=4096,
        system=system + "\nRespond with a single JSON object and nothing else.",
        messages=[{"role": "user", "content": user}],
        temperature=settings.llm_temperature,
    )
    return msg.content[0].text


def _extract_json(text: str) -> dict:
    text = (text or "").strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text)
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start < 0 or end <= start:
            raise
        data = json.loads(text[start:end + 1])
    if not isinstance(data, dict):
        raise ValueError("expected a JSON object")
    return data


def call_llm_json(system: str, user: str) -> dict:
    """Call the LLM and parse JSON; on a parse error retry once with the error shown."""
    raw = call_llm(system, user)
    try:
        return _extract_json(raw)
    except (ValueError, json.JSONDecodeError) as e:
        logger.warning(f"Invalid JSON from LLM ({e}); retrying once")
        raw = call_llm(system, f"{user}\n\nYour previous reply was not valid JSON ({e}). Return ONLY the JSON object.")
        return _extract_json(raw)


# ----------------------------------------------------------------------------
# Prompts
# ----------------------------------------------------------------------------

SECTION_SYSTEM = """You turn a section of a lecture transcript into study materials for university students.
The transcript is split into chunks, each labelled [chunk_id | MM:SS-MM:SS].

GROUNDING RULES (most important):
- Use ONLY information stated in the transcript. Never add outside facts, examples or formulas the lecturer did not give.
- Every item has a "chunks" list with the ids of the chunks that support it, e.g. ["c0003", "c0004"]. Only use ids that appear in this section.
- In markdown text (notes content, summary) cite inline with chunk ids in square brackets, e.g. "Gradient descent minimises loss [c0003]." Never write timestamps yourself.
- Transcripts come from speech recognition and may contain mis-heard words; silently correct obvious ASR errors in technical terms, but do not invent content.

Return ONE JSON object with exactly these keys:
{keys}"""

KEY_SPECS = {
    "summary": '"summary": {{"summary": "2-4 short markdown paragraphs covering EVERY topic in this section, **bold** key concepts, inline [chunk_id] citations", "chunks": ["..."]}}',
    "notes": '"notes": [{{"title": "topic heading", "subsection": "optional sub-heading", "content": "markdown notes: bullet points, **bold** key terms, definitions, steps, examples the lecturer gave, inline [chunk_id] citations", "chunks": ["..."]}}]  // one note per distinct topic, in lecture order, covering the whole section',
    "flashcards": '"flashcards": [{{"front": "question or term", "back": "concise answer (1-2 sentences)", "difficulty": "easy|medium|hard", "chunks": ["..."]}}]  // {n_cards} cards; one fact per card; mix of definitions, why/how, and comparisons',
    "mcqs": '"mcqs": [{{"question": "...", "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}}, "correct_answer": "A|B|C|D", "explanation": "why the key is right AND why the most tempting distractor is wrong", "chunks": ["..."]}}]  // {n_mcqs} questions; exactly one correct option; distractors must be plausible, similar in length and type to the answer, and clearly wrong according to the lecture; no "all/none of the above"; test understanding and application, not just word recall',
    "qa_pairs": '"qa_pairs": [{{"question": "...", "answer": "3-6 sentence answer using the lecture\'s explanation", "chunks": ["..."]}}]  // {n_qa} pairs ranging from recall to application',
}

TYPE_TO_KEY = {
    OutputType.SUMMARY: "summary",
    OutputType.NOTES: "notes",
    OutputType.FLASHCARDS: "flashcards",
    OutputType.MCQS: "mcqs",
    OutputType.QA: "qa_pairs",
}

REDUCE_SUMMARY_SYSTEM = """You merge per-section summaries of ONE lecture into a single coherent lecture summary.
Rules:
- Start with a 1-2 sentence overview of what the whole lecture is about, then cover every section's topics in lecture order.
- Keep the inline [chunk_id] citations from the section summaries next to the facts they support; do not invent new ids.
- **Bold** the key concepts. Use only information present in the section summaries.
Return JSON: {"summary": "markdown summary with inline [chunk_id] citations", "chunks": ["every chunk id you cited"]}"""

VERIFY_SYSTEM = """You are a strict fact-checker for study materials generated from a lecture transcript.
For each numbered item, decide whether its claim is SUPPORTED by the transcript chunks given (paraphrase is fine; small ASR spelling errors are fine).
An item is UNSUPPORTED if it states something the transcript does not say, contradicts it, or (for MCQs) the keyed answer is not the one the transcript supports.
Return JSON: {"unsupported": [item numbers], "reasons": {"item number": "short reason"}}"""


def _counts(section: Section, n_sections: int) -> Dict[str, str]:
    if n_sections == 1:
        minutes = max(1.0, (section.end - section.start) / 60)
        scale = 1 if minutes < 25 else 2
        return {"n_cards": f"{8 * scale}-{15 * scale}", "n_mcqs": f"{8 * scale}-{12 * scale}", "n_qa": f"{6 * scale}-{10 * scale}"}
    return {"n_cards": "4-7", "n_mcqs": "3-5", "n_qa": "2-4"}


def _section_prompt(keys: List[str], section: Section, n_sections: int) -> Tuple[str, str]:
    counts = _counts(section, n_sections)
    spec = ",\n".join(KEY_SPECS[k] for k in keys).format(**counts).replace("{{", "{").replace("}}", "}")
    system = SECTION_SYSTEM.format(keys="{\n" + spec + "\n}")
    where = f"section {section.index + 1} of {n_sections} ({fmt_ts(section.start)}-{fmt_ts(section.end)})"
    user = f"Lecture transcript, {where}:\n\n{format_section(section)}"
    return system, user


# ----------------------------------------------------------------------------
# Map step: one section
# ----------------------------------------------------------------------------

@dataclass
class SectionResult:
    section: Section
    summary: Optional[RawSummary] = None
    items: Dict[str, list] = field(default_factory=lambda: {k: [] for k in ITEM_MODELS})
    dropped: int = 0
    error: Optional[str] = None


def _parse_section(data: dict, keys: List[str], section: Section) -> SectionResult:
    res = SectionResult(section=section)

    def grounded(item: _Cited) -> bool:
        item.chunks = [c for c in item.chunks if c in section.ids]
        return bool(item.chunks)

    if "summary" in keys:
        raw = data.get("summary")
        if isinstance(raw, str):  # tolerate {"summary": "..."} by reading its inline refs
            refs = [i.strip() for m in CHUNK_REF_RE.findall(raw) for i in re.split(r"[,;]", m)]
            raw = {"summary": raw, "chunks": refs}
        try:
            s = RawSummary.model_validate(raw or {})
            if grounded(s):
                res.summary = s
            else:
                res.dropped += 1
        except ValidationError as e:
            logger.warning(f"Section {section.index}: invalid summary: {e.errors()[0]['msg']}")
            res.dropped += 1

    for key in keys:
        if key == "summary":
            continue
        model = ITEM_MODELS[key]
        raw_items = data.get(key) or []
        if not isinstance(raw_items, list):
            raw_items = []
        for raw in raw_items:
            try:
                item = model.model_validate(raw)
            except ValidationError as e:
                logger.info(f"Section {section.index}: dropped invalid {key} item: {e.errors()[0]['msg']}")
                res.dropped += 1
                continue
            if grounded(item):
                res.items[key].append(item)
            else:
                res.dropped += 1
    return res


def _verify_section(res: SectionResult) -> None:
    """Drop flashcards / MCQs / Q&A not supported by their cited chunks."""
    checks: List[Tuple[str, int, str]] = []
    for i, c in enumerate(res.items["flashcards"]):
        checks.append(("flashcards", i, f"Flashcard. Q: {c.front} A: {c.back} [cites {', '.join(c.chunks)}]"))
    for i, q in enumerate(res.items["mcqs"]):
        checks.append(("mcqs", i, f"MCQ. {q.question} Keyed answer: {q.options[q.correct_answer]} "
                                  f"(other options: {'; '.join(t for k, t in q.options.items() if k != q.correct_answer)}) "
                                  f"[cites {', '.join(q.chunks)}]"))
    for i, p in enumerate(res.items["qa_pairs"]):
        checks.append(("qa_pairs", i, f"Q&A. Q: {p.question} A: {p.answer} [cites {', '.join(p.chunks)}]"))
    if not checks:
        return
    listing = "\n".join(f"{n + 1}. {text}" for n, (_, _, text) in enumerate(checks))
    try:
        data = call_llm_json(VERIFY_SYSTEM, f"Transcript chunks:\n\n{format_section(res.section)}\n\nItems:\n{listing}")
        bad = {int(x) for x in data.get("unsupported", []) if str(x).strip().isdigit()}
    except Exception as e:  # verifier is best-effort: keep items if it fails
        logger.warning(f"Section {res.section.index}: verifier failed ({e}); keeping items")
        return
    drop = {(checks[n - 1][0], checks[n - 1][1]) for n in bad if 1 <= n <= len(checks)}
    for key in ("flashcards", "mcqs", "qa_pairs"):
        before = len(res.items[key])
        res.items[key] = [it for i, it in enumerate(res.items[key]) if (key, i) not in drop]
        res.dropped += before - len(res.items[key])
    if drop:
        logger.info(f"Section {res.section.index}: verifier removed {len(drop)} unsupported items")


def run_section(section: Section, keys: List[str], n_sections: int) -> SectionResult:
    try:
        system, user = _section_prompt(keys, section, n_sections)
        res = _parse_section(call_llm_json(system, user), keys, section)
        if settings.verify_outputs:
            _verify_section(res)
        return res
    except Exception as e:
        logger.error(f"Section {section.index} failed: {e}", exc_info=True)
        return SectionResult(section=section, error=str(e))


# ----------------------------------------------------------------------------
# Reduce step
# ----------------------------------------------------------------------------

def _tokens(text: str) -> set:
    return {w for w in re.findall(r"[a-z0-9]+", text.lower()) if len(w) > 2}


def dedup(items: list, text_of) -> list:
    kept, seen = [], []
    for it in items:
        t = _tokens(text_of(it))
        if not t:
            continue
        if any(len(t & s) / len(t | s) >= 0.6 for s in seen):
            continue
        kept.append(it)
        seen.append(t)
    return kept


def spread_cap(per_section: List[list], cap: int) -> list:
    """Round-robin across sections so a capped list still covers the whole lecture,
    then return in lecture order."""
    picked, queues = [], [list(enumerate(lst)) for lst in per_section]
    while len(picked) < cap and any(queues):
        for si, q in enumerate(queues):
            if q and len(picked) < cap:
                picked.append((si, *q.pop(0)))
    return [it for _, _, it in sorted(picked, key=lambda x: (x[0], x[1]))]


def shuffle_options(q: RawMCQ, seed: str) -> Tuple[List[MCQOption], str]:
    """Shuffle option order deterministically to remove answer-position bias."""
    texts = [q.options[k] for k in OPTION_KEYS]
    correct = q.options[q.correct_answer]
    rng = random.Random(seed)
    rng.shuffle(texts)
    opts = [MCQOption(id=k, text=t) for k, t in zip(OPTION_KEYS, texts)]
    return opts, OPTION_KEYS[texts.index(correct)]


def _merge_summary(results: List[SectionResult], by_id: Dict[str, Unit]) -> Tuple[Optional[str], List[Dict]]:
    parts = [r.summary for r in results if r.summary]
    if not parts:
        return None, []
    if len(parts) == 1:
        merged = parts[0]
    else:
        joined = "\n\n".join(
            f"### Section {r.section.index + 1} ({fmt_ts(r.section.start)}-{fmt_ts(r.section.end)})\n{r.summary.summary}"
            for r in results if r.summary
        )
        all_ids = [c for p in parts for c in p.chunks]
        try:
            merged = RawSummary.model_validate(call_llm_json(REDUCE_SUMMARY_SYSTEM, joined))
            merged.chunks = [c for c in merged.chunks if c in by_id] or all_ids
        except Exception as e:  # fall back to concatenated section summaries
            logger.warning(f"Summary reduce failed ({e}); concatenating section summaries")
            merged = RawSummary(summary="\n\n".join(p.summary for p in parts), chunks=all_ids)
    return render_citations(merged.summary, by_id), timestamps_for(merged.chunks, by_id)


# ----------------------------------------------------------------------------
# Public entry point
# ----------------------------------------------------------------------------

def generate_all_outputs(
    job_id: str,
    output_types: List[OutputType],
    chunks: Sequence[TranscriptChunk],
    segments: Sequence[TranscriptSegment],
) -> Tuple[Dict[str, GeneratedOutput], Dict[str, str]]:
    """Returns (outputs by type, errors by type). Never silently drops a type:
    any requested type that could not be produced appears in errors."""
    output_types = list(dict.fromkeys(output_types))
    errors: Dict[str, str] = {}
    if not llm_available():
        return {}, {ot.value: "No LLM API key configured (set OPENAI_API_KEY or ANTHROPIC_API_KEY)" for ot in output_types}

    units = build_units(chunks, segments)
    by_id = {u.chunk_id: u for u in units}
    sections = build_sections(units)
    if not sections:
        return {}, {ot.value: "Transcript is empty" for ot in output_types}

    keys = [TYPE_TO_KEY[ot] for ot in output_types]
    logger.info(f"Job {job_id}: generating {keys} over {len(sections)} section(s), {len(units)} chunks")
    with ThreadPoolExecutor(max_workers=max(1, settings.llm_max_parallel)) as pool:
        results = list(pool.map(lambda s: run_section(s, keys, len(sections)), sections))

    failed = [r for r in results if r.error]
    if len(failed) == len(results):
        msg = f"LLM generation failed: {failed[0].error}"
        return {}, {ot.value: msg for ot in output_types}
    if failed:
        logger.warning(f"Job {job_id}: {len(failed)}/{len(results)} sections failed; outputs cover the rest")
    dropped = sum(r.dropped for r in results)
    if dropped:
        logger.info(f"Job {job_id}: dropped {dropped} invalid/unsupported items")

    outputs: Dict[str, GeneratedOutput] = {}
    per = lambda key: [r.items[key] for r in results]  # noqa: E731

    for ot in output_types:
        if ot == OutputType.SUMMARY:
            text, ts = _merge_summary(results, by_id)
            if text:
                outputs[ot.value] = GeneratedOutput(output_type=ot, job_id=job_id, summary=text, summary_timestamps=ts)

        elif ot == OutputType.NOTES:
            notes = [
                StudyNote(id=f"note-{r.section.index}-{i}", title=n.title.strip(), subsection=n.subsection,
                          content=render_citations(n.content, by_id), source_timestamps=timestamps_for(n.chunks, by_id))
                for r in results for i, n in enumerate(r.items["notes"])
            ]
            if notes:
                outputs[ot.value] = GeneratedOutput(output_type=ot, job_id=job_id, notes=notes)

        elif ot == OutputType.FLASHCARDS:
            cards = spread_cap([dedup(lst, lambda c: c.front) for lst in per("flashcards")], settings.max_flashcards)
            cards = dedup(cards, lambda c: c.front)
            if cards:
                outputs[ot.value] = GeneratedOutput(output_type=ot, job_id=job_id, flashcards=[
                    Flashcard(id=f"card-{i}", front=c.front.strip(), back=c.back.strip(), difficulty=c.difficulty,
                              source_timestamps=timestamps_for(c.chunks, by_id))
                    for i, c in enumerate(cards)])

        elif ot == OutputType.MCQS:
            qs = spread_cap([dedup(lst, lambda q: q.question) for lst in per("mcqs")], settings.max_mcqs)
            qs = dedup(qs, lambda q: q.question)
            mcqs = []
            for i, q in enumerate(qs):
                opts, key = shuffle_options(q, f"{job_id}:{q.question}")
                mcqs.append(MCQ(id=f"mcq-{i}", question=q.question.strip(), options=opts, correct_answer=key,
                                explanation=q.explanation.strip(), source_timestamps=timestamps_for(q.chunks, by_id)))
            if mcqs:
                outputs[ot.value] = GeneratedOutput(output_type=ot, job_id=job_id, mcqs=mcqs)

        elif ot == OutputType.QA:
            pairs = spread_cap([dedup(lst, lambda p: p.question) for lst in per("qa_pairs")], settings.max_qa)
            pairs = dedup(pairs, lambda p: p.question)
            if pairs:
                outputs[ot.value] = GeneratedOutput(output_type=ot, job_id=job_id, qa_pairs=[
                    QAPair(id=f"qa-{i}", question=p.question.strip(), answer=p.answer.strip(),
                           source_timestamps=timestamps_for(p.chunks, by_id))
                    for i, p in enumerate(pairs)])

        if ot.value not in outputs:
            errors[ot.value] = "The model returned no valid, transcript-supported items"

    return outputs, errors
