"use client";

import { useState } from "react";
import { QAPair, formatTimestamp } from "@/lib/api";

interface Props {
  pairs: QAPair[];
}

export default function QAView({ pairs }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.3rem", marginBottom: "4px" }}>
          Questions & Answers
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          {pairs.length} study questions with detailed answers
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {pairs.map((pair, i) => {
          const isOpen = expanded.has(pair.id);

          return (
            <div
              key={pair.id}
              style={{
                borderRadius: "12px",
                border: `1px solid ${isOpen ? "rgba(167, 139, 250, 0.3)" : "var(--border-subtle)"}`,
                background: isOpen ? "rgba(167, 139, 250, 0.04)" : "var(--bg-elevated)",
                overflow: "hidden",
                transition: "all 0.2s ease",
              }}
            >
              {/* Question */}
              <button
                onClick={() => toggle(pair.id)}
                style={{
                  width: "100%",
                  padding: "1.25rem 1.5rem",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "8px",
                    background: "rgba(167, 139, 250, 0.15)",
                    border: "1px solid rgba(167, 139, 250, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    color: "#a78bfa",
                    flexShrink: 0,
                    marginTop: "1px",
                  }}
                >
                  Q{i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontWeight: 600,
                      fontSize: "0.92rem",
                      lineHeight: 1.5,
                      color: "var(--text-primary)",
                    }}
                  >
                    {pair.question}
                  </p>
                </div>
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "1rem",
                    flexShrink: 0,
                    marginTop: "2px",
                    transform: isOpen ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s ease",
                    display: "inline-block",
                  }}
                >
                  ▼
                </span>
              </button>

              {/* Answer */}
              {isOpen && (
                <div
                  style={{
                    padding: "0 1.5rem 1.25rem 1.5rem",
                    paddingLeft: "calc(1.5rem + 28px + 14px)",
                    borderTop: "1px solid var(--border-subtle)",
                    animation: "fade-up 0.2s ease",
                  }}
                >
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.88rem",
                      lineHeight: 1.75,
                      paddingTop: "1rem",
                    }}
                  >
                    {pair.answer}
                  </p>

                  {pair.source_timestamps.length > 0 && (
                    <div
                      style={{
                        marginTop: "0.75rem",
                        display: "flex",
                        gap: "6px",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-display)", fontWeight: 600 }}>
                        Sources:
                      </span>
                      {pair.source_timestamps.map((ts, j) => (
                        <span key={j} className="timestamp-badge">
                          🕐 {formatTimestamp(ts.start)}–{formatTimestamp(ts.end)}
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

      <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "center" }}>
        <button
          onClick={() => setExpanded(expanded.size === pairs.length ? new Set() : new Set(pairs.map(p => p.id)))}
          style={{
            padding: "8px 20px",
            borderRadius: "8px",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-medium)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "0.82rem",
          }}
        >
          {expanded.size === pairs.length ? "Collapse All" : "Expand All"}
        </button>
      </div>
    </div>
  );
}
