"use client";

import { useState } from "react";
import { QAPair, formatTimestamp } from "@/lib/api";
import Icon from "./Icon";

interface Props {
  pairs: QAPair[];
}

export default function QAView({ pairs }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="section-kicker">Q&amp;A</div>
        <h2 style={{ marginTop: 14, fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "2.4rem", textTransform: "uppercase" }}>
          Ask the lecture anything.
        </h2>
        <p style={{ marginTop: 10, color: "var(--ink-soft)", fontSize: "1rem" }}>
          Every answer stays tied to source timestamps so the model does not get to freestyle.
        </p>
      </div>

      <div className="qa-stack">
        {pairs.map((pair, index) => {
          const open = expanded.has(pair.id);
          return (
            <article key={pair.id} className="qa-card" style={{ background: open ? "rgba(105, 223, 240, 0.2)" : "rgba(255,255,255,0.8)" }}>
              <button
                type="button"
                onClick={() => toggle(pair.id)}
                style={{ width: "100%", background: "transparent", border: "none", textAlign: "left", cursor: "pointer" }}
              >
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div className="chip-button" style={{ cursor: "default", background: "var(--cyan)" }}>
                    Q{index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: "1.18rem", fontWeight: 800, lineHeight: 1.5 }}>{pair.question}</h3>
                    <p style={{ marginTop: 10, color: "var(--ink-soft)", fontWeight: 700 }}>
                      {open ? "Hide answer" : "Show answer"}
                    </p>
                  </div>
                  <div className="icon-button" style={{ width: 42, height: 42 }}>
                    <Icon name={open ? "close" : "chat"} size={16} />
                  </div>
                </div>
              </button>

              {open ? (
                <div className="summary-card" style={{ marginTop: 18, background: "rgba(255,255,255,0.82)" }}>
                  <p style={{ color: "var(--ink-soft)", lineHeight: 1.7 }}>{pair.answer}</p>
                  {pair.source_timestamps.length > 0 ? (
                    <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {pair.source_timestamps.map((timestamp, timestampIndex) => (
                        <span key={timestampIndex} className="timestamp-badge">
                          {formatTimestamp(timestamp.start)} - {formatTimestamp(timestamp.end)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
