"use client";

import { useState } from "react";
import { Flashcard, formatTimestamp } from "@/lib/api";

const DIFFICULTY_COLORS = {
  easy: "var(--accent-teal)",
  medium: "var(--accent-amber)",
  hard: "var(--accent-rose)",
};

interface Props {
  flashcards: Flashcard[];
}

export default function FlashcardsView({ flashcards }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"study" | "grid">("study");

  const current = flashcards[currentIdx];
  const progress = (known.size / flashcards.length) * 100;

  const handleNext = () => {
    setFlipped(false);
    setTimeout(() => setCurrentIdx(i => (i + 1) % flashcards.length), 150);
  };

  const handlePrev = () => {
    setFlipped(false);
    setTimeout(() => setCurrentIdx(i => (i - 1 + flashcards.length) % flashcards.length), 150);
  };

  const handleKnow = (know: boolean) => {
    if (know) {
      setKnown(prev => new Set([...prev, current.id]));
    } else {
      setKnown(prev => { const n = new Set(prev); n.delete(current.id); return n; });
    }
    handleNext();
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.3rem", marginBottom: "4px" }}>
            Flashcards
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            {flashcards.length} cards · {known.size} mastered
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setMode("study")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: `1px solid ${mode === "study" ? "var(--accent-amber)" : "var(--border-subtle)"}`,
              background: mode === "study" ? "rgba(255, 181, 71, 0.1)" : "var(--bg-elevated)",
              color: mode === "study" ? "var(--accent-amber)" : "var(--text-secondary)",
              cursor: "pointer",
              fontFamily: "var(--font-display)",
              fontSize: "0.82rem",
              fontWeight: 600,
            }}
          >
            🃏 Study Mode
          </button>
          <button
            onClick={() => setMode("grid")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: `1px solid ${mode === "grid" ? "var(--accent-amber)" : "var(--border-subtle)"}`,
              background: mode === "grid" ? "rgba(255, 181, 71, 0.1)" : "var(--bg-elevated)",
              color: mode === "grid" ? "var(--accent-amber)" : "var(--text-secondary)",
              cursor: "pointer",
              fontFamily: "var(--font-display)",
              fontSize: "0.82rem",
              fontWeight: 600,
            }}
          >
            ⊞ Grid View
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: "2rem" }}>
        <div className="progress-track">
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, var(--accent-teal), #00f2c3)",
              borderRadius: "100px",
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>

      {mode === "study" ? (
        <div>
          {/* Flashcard */}
          <div
            style={{ height: 320, maxWidth: 600, margin: "0 auto 1.5rem", cursor: "pointer" }}
            className={`flashcard-scene ${flipped ? "flipped" : ""}`}
            onClick={() => setFlipped(!flipped)}
          >
            <div className="flashcard-inner">
              {/* Front */}
              <div
                className="flashcard-face"
                style={{
                  background: `linear-gradient(135deg, var(--bg-elevated), var(--bg-card))`,
                  border: "1px solid var(--border-medium)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "1rem",
                    left: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: "100px",
                      background: `${DIFFICULTY_COLORS[current.difficulty]}20`,
                      color: DIFFICULTY_COLORS[current.difficulty],
                      fontSize: "0.72rem",
                      fontFamily: "var(--font-display)",
                      fontWeight: 600,
                      border: `1px solid ${DIFFICULTY_COLORS[current.difficulty]}40`,
                    }}
                  >
                    {current.difficulty}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    {currentIdx + 1} / {flashcards.length}
                  </span>
                </div>

                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.75rem", fontFamily: "var(--font-display)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    QUESTION
                  </div>
                  <p style={{ fontSize: "1.15rem", fontWeight: 600, lineHeight: 1.5, color: "var(--text-primary)" }}>
                    {current.front}
                  </p>
                </div>

                <p
                  style={{
                    position: "absolute",
                    bottom: "1rem",
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  🖱️ Click to reveal answer
                </p>
              </div>

              {/* Back */}
              <div
                className="flashcard-face flashcard-back"
                style={{
                  background: `linear-gradient(135deg, rgba(108, 99, 255, 0.1), rgba(0, 212, 170, 0.05))`,
                  border: "1px solid rgba(108, 99, 255, 0.25)",
                }}
              >
                <div style={{ textAlign: "center", width: "100%" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--accent-teal)", marginBottom: "0.75rem", fontFamily: "var(--font-display)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    ANSWER
                  </div>
                  <p style={{ fontSize: "1.05rem", lineHeight: 1.6, color: "var(--text-primary)" }}>
                    {current.back}
                  </p>

                  {current.source_timestamps.length > 0 && (
                    <div style={{ marginTop: "1rem", display: "flex", justifyContent: "center", gap: "6px", flexWrap: "wrap" }}>
                      {current.source_timestamps.map((ts, i) => (
                        <span key={i} className="timestamp-badge">
                          🕐 {formatTimestamp(ts.start)}-{formatTimestamp(ts.end)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", justifyContent: "center", gap: "12px", alignItems: "center" }}>
            <button
              onClick={handlePrev}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-medium)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "1.1rem",
              }}
            >
              ←
            </button>

            {flipped && (
              <>
                <button
                  onClick={() => handleKnow(false)}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "10px",
                    background: "rgba(255, 107, 138, 0.1)",
                    border: "1px solid rgba(255, 107, 138, 0.3)",
                    color: "var(--accent-rose)",
                    cursor: "pointer",
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                  }}
                >
                  ✗ Still Learning
                </button>
                <button
                  onClick={() => handleKnow(true)}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "10px",
                    background: "rgba(0, 212, 170, 0.1)",
                    border: "1px solid rgba(0, 212, 170, 0.3)",
                    color: "var(--accent-teal)",
                    cursor: "pointer",
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                  }}
                >
                  ✓ Got It!
                </button>
              </>
            )}

            {!flipped && (
              <button
                onClick={() => setFlipped(true)}
                style={{
                  padding: "10px 24px",
                  borderRadius: "10px",
                  background: "var(--accent-electric)",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                }}
              >
                Reveal Answer
              </button>
            )}

            <button
              onClick={handleNext}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-medium)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "1.1rem",
              }}
            >
              →
            </button>
          </div>
        </div>
      ) : (
        /* Grid view */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1rem",
          }}
        >
          {flashcards.map((fc, i) => (
            <div
              key={fc.id}
              style={{
                padding: "1.25rem",
                borderRadius: "12px",
                background: "var(--bg-elevated)",
                border: `1px solid ${known.has(fc.id) ? "rgba(0, 212, 170, 0.25)" : "var(--border-subtle)"}`,
                opacity: known.has(fc.id) ? 0.7 : 1,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  #{i + 1}
                </span>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "100px",
                    fontSize: "0.7rem",
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    background: `${DIFFICULTY_COLORS[fc.difficulty]}15`,
                    color: DIFFICULTY_COLORS[fc.difficulty],
                    border: `1px solid ${DIFFICULTY_COLORS[fc.difficulty]}30`,
                  }}
                >
                  {fc.difficulty}
                </span>
              </div>
              <p style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.88rem", color: "var(--text-primary)" }}>
                {fc.front}
              </p>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", lineHeight: 1.5 }}>
                {fc.back}
              </p>
              {fc.source_timestamps.length > 0 && (
                <div style={{ marginTop: "0.75rem" }}>
                  <span className="timestamp-badge">
                    🕐 {formatTimestamp(fc.source_timestamps[0].start)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
