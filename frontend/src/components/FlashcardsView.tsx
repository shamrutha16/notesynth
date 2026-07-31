"use client";

import { useState } from "react";
import { Flashcard, formatTimestamp } from "@/lib/api";
import Icon from "./Icon";

interface Props {
  flashcards: Flashcard[];
}

export default function FlashcardsView({ flashcards }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"study" | "grid">("study");

  const current = flashcards[currentIndex];
  const progress = (known.size / flashcards.length) * 100;

  const handleMove = (direction: "next" | "prev") => {
    setFlipped(false);
    setTimeout(() => {
      setCurrentIndex((value) =>
        direction === "next"
          ? (value + 1) % flashcards.length
          : (value - 1 + flashcards.length) % flashcards.length,
      );
    }, 120);
  };

  const markKnown = (value: boolean) => {
    setKnown((prev) => {
      const next = new Set(prev);
      if (value) next.add(current.id);
      else next.delete(current.id);
      return next;
    });
    handleMove("next");
  };

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="section-kicker">Flashcards</div>
          <h2 style={{ marginTop: 12, fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(1.5rem, 2.5vw, 2rem)", textTransform: "uppercase", lineHeight: 1.15 }}>
            Flip. Learn. Repeat.
          </h2>
          <p style={{ marginTop: 10, color: "var(--ink-soft)", fontSize: "1rem" }}>
            {flashcards.length} cards, with {known.size} marked as mastered.
          </p>
        </div>

        <div className="tab-row">
          <button className={`chip-button ${mode === "study" ? "active" : ""}`} onClick={() => setMode("study")}>
            Study mode
          </button>
          <button className={`chip-button ${mode === "grid" ? "active" : ""}`} onClick={() => setMode("grid")}>
            Grid view
          </button>
        </div>
      </div>

      <div className="progress-shell" style={{ marginBottom: 20 }}>
        <div className="progress-bar" style={{ width: `${Math.max(progress, 6)}%` }} />
      </div>

      {mode === "study" ? (
        <>
          <button
            type="button"
            className="flashcard-card"
            onClick={() => setFlipped((value) => !value)}
            style={{
              width: "100%",
              minHeight: 360,
              background: flipped ? "rgba(105, 223, 240, 0.22)" : "rgba(248, 230, 111, 0.24)",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <span className="chip-button" style={{ cursor: "default" }}>
                {current.difficulty}
              </span>
              <span style={{ fontWeight: 700, color: "var(--ink-soft)" }}>
                {currentIndex + 1} / {flashcards.length}
              </span>
            </div>

            <div style={{ marginTop: 42 }}>
              <div style={{ fontSize: "0.88rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-soft)" }}>
                {flipped ? "Answer" : "Question"}
              </div>
              <p style={{ marginTop: 18, fontFamily: "Syne, sans-serif", fontSize: "clamp(2rem, 4vw, 3.1rem)", fontWeight: 800, lineHeight: 1.02 }}>
                {flipped ? current.back : current.front}
              </p>
            </div>

            {flipped && current.source_timestamps.length > 0 ? (
              <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 10 }}>
                {current.source_timestamps.map((timestamp, index) => (
                  <span key={index} className="timestamp-badge">
                    {formatTimestamp(timestamp.start)} - {formatTimestamp(timestamp.end)}
                  </span>
                ))}
              </div>
            ) : null}

            <div style={{ marginTop: 26, color: "var(--ink-soft)", fontWeight: 700 }}>
              {flipped ? "Tap again to hide the answer." : "Tap to reveal the answer."}
            </div>
          </button>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
            <div className="tab-row">
              <button className="ghost-button" onClick={() => handleMove("prev")}>
                Prev
              </button>
              <button className="ghost-button" onClick={() => handleMove("next")}>
                Next
              </button>
            </div>

            {flipped ? (
              <div className="tab-row">
                <button className="ghost-button" onClick={() => markKnown(false)}>
                  Still learning
                </button>
                <button className="cta-button" onClick={() => markKnown(true)}>
                  <Icon name="check" size={18} />
                  Got it
                </button>
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <div className="bento-grid" style={{ marginTop: 0 }}>
          {flashcards.map((card) => (
            <article key={card.id} className="bento-card span-4 accent-cyan">
              <div className="eyebrow-index">{card.difficulty}</div>
              <h3>{card.front}</h3>
              <p>{card.back}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
