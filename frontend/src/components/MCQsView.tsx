"use client";

import { useState } from "react";
import { MCQ, MCQOption, formatTimestamp } from "@/lib/api";

interface Props {
  mcqs: MCQ[];
}

export default function MCQsView({ mcqs }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState<number | null>(null);

  const handleSelect = (mcqId: string, optionId: string) => {
    if (answers[mcqId]) return; // Already answered
    setAnswers(prev => ({ ...prev, [mcqId]: optionId }));
  };

  const handleSubmit = () => {
    const correct = mcqs.filter(q => answers[q.id] === q.correct_answer).length;
    setScore(correct);
  };

  const handleReset = () => {
    setAnswers({});
    setScore(null);
  };

  const allAnswered = mcqs.every(q => answers[q.id]);
  const answeredCount = Object.keys(answers).length;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "2rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.3rem", marginBottom: "4px" }}>
            Multiple Choice Quiz
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            {mcqs.length} questions · {answeredCount} answered
          </p>
        </div>

        {score !== null && (
          <div
            style={{
              padding: "12px 20px",
              borderRadius: "12px",
              background: score >= mcqs.length * 0.7
                ? "rgba(0, 212, 170, 0.1)"
                : "rgba(255, 181, 71, 0.1)",
              border: `1px solid ${score >= mcqs.length * 0.7 ? "rgba(0, 212, 170, 0.3)" : "rgba(255, 181, 71, 0.3)"}`,
              textAlign: "center",
            }}
          >
            <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.5rem", color: score >= mcqs.length * 0.7 ? "var(--accent-teal)" : "var(--accent-amber)" }}>
              {score}/{mcqs.length}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
              {Math.round((score / mcqs.length) * 100)}%
            </p>
          </div>
        )}
      </div>

      {/* Questions */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {mcqs.map((mcq, qi) => {
          const userAnswer = answers[mcq.id];
          const isAnswered = !!userAnswer;
          const isCorrect = userAnswer === mcq.correct_answer;

          return (
            <div
              key={mcq.id}
              style={{
                padding: "1.5rem",
                borderRadius: "14px",
                background: "var(--bg-elevated)",
                border: isAnswered
                  ? `1px solid ${isCorrect ? "rgba(0, 212, 170, 0.25)" : "rgba(255, 107, 138, 0.25)"}`
                  : "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ display: "flex", gap: "12px", marginBottom: "1rem" }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "8px",
                    background: isAnswered
                      ? isCorrect ? "rgba(0, 212, 170, 0.15)" : "rgba(255, 107, 138, 0.15)"
                      : "var(--bg-card)",
                    border: `1px solid ${isAnswered ? isCorrect ? "rgba(0, 212, 170, 0.3)" : "rgba(255, 107, 138, 0.3)" : "var(--border-medium)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    color: isAnswered ? isCorrect ? "var(--accent-teal)" : "var(--accent-rose)" : "var(--text-muted)",
                    flexShrink: 0,
                  }}
                >
                  {qi + 1}
                </div>
                <p style={{ fontWeight: 600, fontSize: "0.95rem", lineHeight: 1.5, color: "var(--text-primary)" }}>
                  {mcq.question}
                </p>
              </div>

              {/* Options */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingLeft: "40px" }}>
                {mcq.options.map((opt) => {
                  const isSelected = userAnswer === opt.id;
                  const isCorrectOpt = opt.id === mcq.correct_answer;
                  const showCorrect = isAnswered && isCorrectOpt;
                  const showIncorrect = isAnswered && isSelected && !isCorrectOpt;

                  return (
                    <div
                      key={opt.id}
                      className={`mcq-option ${showCorrect ? "correct" : ""} ${showIncorrect ? "incorrect" : ""} ${isAnswered ? "disabled" : ""}`}
                      onClick={() => handleSelect(mcq.id, opt.id)}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "6px",
                          border: `1px solid ${showCorrect ? "var(--accent-teal)" : showIncorrect ? "var(--accent-rose)" : isSelected ? "var(--accent-electric)" : "var(--border-medium)"}`,
                          background: showCorrect ? "var(--accent-teal)" : showIncorrect ? "var(--accent-rose)" : isSelected ? "var(--accent-electric)" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "var(--font-display)",
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          color: showCorrect || showIncorrect || isSelected ? "white" : "var(--text-muted)",
                          flexShrink: 0,
                        }}
                      >
                        {showCorrect ? "✓" : showIncorrect ? "✗" : opt.id}
                      </div>
                      <span style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                        {opt.text}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Explanation */}
              {isAnswered && (
                <div
                  style={{
                    marginTop: "1rem",
                    marginLeft: "40px",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    background: isCorrect ? "rgba(0, 212, 170, 0.05)" : "rgba(255, 107, 138, 0.05)",
                    border: `1px solid ${isCorrect ? "rgba(0, 212, 170, 0.15)" : "rgba(255, 107, 138, 0.15)"}`,
                  }}
                >
                  <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "6px" }}>
                    💡 {mcq.explanation}
                  </p>
                  {mcq.source_timestamps.length > 0 && (
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {mcq.source_timestamps.map((ts, i) => (
                        <span key={i} className="timestamp-badge">
                          🕐 {formatTimestamp(ts.start)}-{formatTimestamp(ts.end)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit / Reset */}
      <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "2rem" }}>
        {!score && (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered}
            style={{
              padding: "12px 32px",
              borderRadius: "10px",
              background: allAnswered ? "var(--accent-rose)" : "var(--bg-elevated)",
              border: `1px solid ${allAnswered ? "var(--accent-rose)" : "var(--border-medium)"}`,
              color: allAnswered ? "white" : "var(--text-muted)",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              cursor: allAnswered ? "pointer" : "not-allowed",
              fontSize: "0.95rem",
            }}
          >
            {allAnswered ? "Submit Quiz" : `Answer all questions (${answeredCount}/${mcqs.length})`}
          </button>
        )}
        {score !== null && (
          <button
            onClick={handleReset}
            style={{
              padding: "12px 32px",
              borderRadius: "10px",
              background: "var(--accent-electric)",
              border: "none",
              color: "white",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "0.95rem",
            }}
          >
            🔄 Retake Quiz
          </button>
        )}
      </div>
    </div>
  );
}
