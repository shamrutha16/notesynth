"use client";

import { useState } from "react";
import { MCQ, formatTimestamp } from "@/lib/api";

interface Props {
  mcqs: MCQ[];
}

export default function MCQsView({ mcqs }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState<number | null>(null);

  const allAnswered = mcqs.every((item) => answers[item.id]);

  const submit = () => {
    setScore(mcqs.filter((item) => answers[item.id] === item.correct_answer).length);
  };

  const reset = () => {
    setAnswers({});
    setScore(null);
  };

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="section-kicker">MCQs</div>
          <h2 style={{ marginTop: 12, fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(1.5rem, 2.5vw, 2rem)", textTransform: "uppercase", lineHeight: 1.15 }}>
            Pop quiz, hot shot.
          </h2>
          <p style={{ marginTop: 10, color: "var(--ink-soft)", fontSize: "1rem" }}>
            {mcqs.length} auto-generated practice questions with explanations.
          </p>
        </div>

        {score !== null ? (
          <div className="metric-card" style={{ background: "var(--pink)", minWidth: 180 }}>
            <h3 style={{ fontSize: "2rem" }}>
              {score}/{mcqs.length}
            </h3>
            <p>{Math.round((score / mcqs.length) * 100)}% score</p>
          </div>
        ) : null}
      </div>

      <div className="quiz-stack">
        {mcqs.map((mcq, index) => {
          const selected = answers[mcq.id];
          const answered = Boolean(selected);

          return (
            <article key={mcq.id} className="quiz-card" style={{ background: answered ? "rgba(245, 139, 192, 0.12)" : "rgba(255,255,255,0.8)" }}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div className="chip-button" style={{ cursor: "default", background: "var(--yellow)" }}>
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 800, lineHeight: 1.45 }}>{mcq.question}</h3>

                  <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                    {mcq.options.map((option) => {
                      const isSelected = selected === option.id;
                      const isCorrect = option.id === mcq.correct_answer;
                      const background = answered
                        ? isCorrect
                          ? "rgba(141, 226, 184, 0.5)"
                          : isSelected
                            ? "rgba(255, 211, 211, 0.8)"
                            : "#fff"
                        : "#fff";

                      return (
                        <button
                          key={option.id}
                          type="button"
                          className="note-card"
                          disabled={answered}
                          onClick={() => setAnswers((prev) => ({ ...prev, [mcq.id]: option.id }))}
                          style={{
                            textAlign: "left",
                            cursor: answered ? "default" : "pointer",
                            background,
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                          }}
                        >
                          <span className="chip-button" style={{ cursor: "default", background: isSelected ? "var(--yellow)" : "var(--panel)" }}>
                            {option.id}
                          </span>
                          <span style={{ color: "var(--ink-soft)", lineHeight: 1.5 }}>{option.text}</span>
                        </button>
                      );
                    })}
                  </div>

                  {answered ? (
                    <div className="summary-card" style={{ marginTop: 16, background: "rgba(255,255,255,0.82)" }}>
                      <strong>Why this answer works</strong>
                      <p style={{ marginTop: 10, color: "var(--ink-soft)", lineHeight: 1.6 }}>{mcq.explanation}</p>
                      {mcq.source_timestamps.length > 0 ? (
                        <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 10 }}>
                          {mcq.source_timestamps.map((timestamp, timestampIndex) => (
                            <span key={timestampIndex} className="timestamp-badge">
                              {formatTimestamp(timestamp.start)} - {formatTimestamp(timestamp.end)}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
        {score === null ? (
          <button className="cta-button" disabled={!allAnswered} onClick={submit} style={{ opacity: allAnswered ? 1 : 0.6 }}>
            Submit quiz
          </button>
        ) : (
          <button className="ghost-button" onClick={reset}>
            Retake quiz
          </button>
        )}
      </div>
    </div>
  );
}
