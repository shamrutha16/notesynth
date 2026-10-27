"""Offline tests for chunking + whole-lecture generation (LLM is faked).

Run from backend/:  python -m pytest tests -q
"""
import json
import re

import pytest

from core import generation as gen
from core.chunking import semantic_chunk_segments
from core.config import settings
from models.schemas import OutputType, TranscriptSegment


def make_segments(minutes: int, words_per_seg: int = 30):
    segs, t = [], 0.0
    for i in range(minutes * 6):  # one segment every 10 s
        text = f"topic{i // 30} " + " ".join(f"word{i}_{j}" for j in range(words_per_seg))
        segs.append(TranscriptSegment(id=i, start=t, end=t + 10, text=text))
        t += 10
    return segs


class FakeLLM:
    def __init__(self, verifier_rejects=(1,)):
        self.calls = []
        self.verifier_rejects = list(verifier_rejects)

    def __call__(self, system, user):
        self.calls.append(system[:40])
        ids = re.findall(r"\[(c\d{4}) \|", user)
        if system.startswith("You are a strict fact-checker"):
            return json.dumps({"unsupported": self.verifier_rejects})
        if system.startswith("You merge per-section"):
            refs = re.findall(r"\[(c\d{4})\]", user)
            return json.dumps({"summary": "Overall the lecture covers several topics " +
                               " ".join(f"[{r}]" for r in refs), "chunks": refs})
        first = ids[0]
        return json.dumps({
            "summary": {"summary": f"This section explains **topic** in detail [{first}] [00:99-01:00].", "chunks": [first]},
            "notes": [{"title": f"Notes {first}", "content": f"- Key idea from the lecture [{first}]", "chunks": [first]}],
            "flashcards": [
                {"front": f"What is {first}?", "back": "A chunk", "difficulty": "EASY", "chunks": [first]},
                {"front": f"What is {first}?", "back": "dup", "chunks": [first]},          # duplicate
                {"front": "Invented fact?", "back": "x", "chunks": ["c9999"]},            # bad citation
            ],
            "mcqs": [
                {"question": f"Which chunk is {first}?", "options": {"A": "one", "B": "two", "C": "three", "D": "four"},
                 "correct_answer": "B", "explanation": "because", "chunks": [first]},
                {"question": "Broken key question?", "options": {"A": "a", "B": "b", "C": "c", "D": "d"},
                 "correct_answer": "E", "chunks": [first]},                                 # invalid key
                {"question": "All of above question?", "options": {"A": "a", "B": "b", "C": "c", "D": "All of the above"},
                 "correct_answer": "D", "chunks": [first]},                                 # banned option
            ],
            "qa_pairs": [{"question": f"Explain {first} please", "answer": "Because the lecture said so.", "chunks": [first]}],
        })


@pytest.fixture
def fake_llm(monkeypatch):
    fake = FakeLLM()
    monkeypatch.setattr(gen, "call_llm", fake)
    monkeypatch.setattr(gen, "llm_available", lambda: True)
    monkeypatch.setattr(settings, "llm_max_parallel", 1)
    return fake


def test_chunking_no_context_prefix_and_deterministic_ids():
    segs = make_segments(10)
    a = semantic_chunk_segments(segs)
    b = semantic_chunk_segments(segs)
    assert [c.chunk_id for c in a] == [c.chunk_id for c in b] == [f"c{i:04d}" for i in range(len(a))]
    assert all("[Context:" not in c.text for c in a)
    assert a[1].overlap_segments > 0
    # overlap segments really are the previous chunk's tail, so start_time is accurate
    assert a[1].segment_ids[0] in a[0].segment_ids


def test_chunking_zero_overlap_is_respected():
    chunks = semantic_chunk_segments(make_segments(5), chunk_overlap=0)
    assert all(c.overlap_segments == 0 for c in chunks)


def test_long_lecture_covers_all_chunks(fake_llm):
    segs = make_segments(60)
    chunks = semantic_chunk_segments(segs)
    outputs, errors = gen.generate_all_outputs("job1", list(OutputType), chunks, segs)
    assert not errors, errors
    units = gen.build_units(chunks, segs)
    sections = gen.build_sections(units)
    assert len(sections) > 1
    # every chunk was sent to the LLM exactly once across sections
    assert sorted(u.chunk_id for s in sections for u in s.units) == sorted(c.chunk_id for c in chunks)
    # notes span the whole lecture, not just the first 8 chunks
    last_note_end = max(t["end"] for n in outputs["notes"].notes for t in n.source_timestamps)
    assert last_note_end > 50 * 60


def test_validation_grounding_dedup_and_shuffle(fake_llm):
    segs = make_segments(60)
    chunks = semantic_chunk_segments(segs)
    outputs, _ = gen.generate_all_outputs("job1", list(OutputType), chunks, segs)
    n_sections = len(gen.build_sections(gen.build_units(chunks, segs)))

    cards = outputs["flashcards"].flashcards
    assert all(c.difficulty in ("easy", "medium", "hard") for c in cards)
    assert not any(c.front == "Invented fact?" for c in cards)              # bad citation dropped
    assert len({c.front for c in cards}) == len(cards)                       # duplicates removed
    # verifier rejected item 1 (the first flashcard) in every section
    assert not any(c.back == "A chunk" for c in cards)
    assert len(cards) == n_sections

    mcqs = outputs["mcqs"].mcqs
    assert mcqs and all(len(q.options) == 4 for q in mcqs)
    assert all(q.correct_answer in {o.id for o in q.options} for q in mcqs)
    assert not any("above" in o.text.lower() for q in mcqs for o in q.options)
    for q in mcqs:  # shuffling kept the right answer text
        assert next(o.text for o in q.options if o.id == q.correct_answer) == "two"
    assert len({q.correct_answer for q in mcqs}) > 1                         # answers not all in one position


def test_citations_rendered_from_chunk_ids(fake_llm):
    segs = make_segments(5)
    chunks = semantic_chunk_segments(segs)
    outputs, _ = gen.generate_all_outputs("job1", [OutputType.SUMMARY, OutputType.NOTES], chunks, segs)
    summary = outputs["summary"].summary
    assert re.search(r"\[\d{2}:\d{2}-\d{2}:\d{2}\]", summary)
    assert "c0000" not in summary and "00:99" not in summary                 # ids rendered, invented ts removed
    assert outputs["summary"].summary_timestamps


def test_no_api_key_reports_errors_instead_of_mock(monkeypatch):
    monkeypatch.setattr(gen, "llm_available", lambda: False)
    segs = make_segments(5)
    outputs, errors = gen.generate_all_outputs("job1", list(OutputType), semantic_chunk_segments(segs), segs)
    assert outputs == {} and set(errors) == {ot.value for ot in OutputType}


def test_invalid_json_retried_once(monkeypatch):
    replies = iter(["not json at all", '```json\n{"ok": 1}\n```'])
    monkeypatch.setattr(gen, "call_llm", lambda s, u: next(replies))
    assert gen.call_llm_json("sys", "user") == {"ok": 1}
