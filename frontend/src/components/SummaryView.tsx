"use client";

import { formatTimestamp } from "@/lib/api";

interface Props {
  summary: string;
  timestamps?: Array<{ start: number; end: number }>;
}

export default function SummaryView({ summary, timestamps }: Props) {
  const paragraphs = summary.split(/\n\n+/).filter((value) => value.trim());

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="section-kicker">Summary</div>
        <h2 style={{ marginTop: 14, fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "2.4rem", textTransform: "uppercase" }}>
          TL;DR for your brain
        </h2>
        <p style={{ marginTop: 10, color: "var(--ink-soft)", fontSize: "1rem" }}>
          A quick lecture recap with the important pieces left intact.
        </p>
      </div>

      <div className="summary-card" style={{ background: "rgba(141, 226, 184, 0.18)" }}>
        <div style={{ display: "grid", gap: 16 }}>
          {paragraphs.map((paragraph, index) => {
            if (paragraph.startsWith("##")) {
              return (
                <h3 key={index} style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "1.4rem", textTransform: "uppercase" }}>
                  {paragraph.replace(/^#+\s*/, "")}
                </h3>
              );
            }

            return (
              <p key={index} style={{ color: "var(--ink-soft)", lineHeight: 1.7, fontSize: "1rem" }}>
                {renderWithTimestamps(paragraph)}
              </p>
            );
          })}
        </div>
      </div>

      {timestamps?.length ? (
        <div className="note-card" style={{ marginTop: 18 }}>
          <strong style={{ display: "block", marginBottom: 12 }}>Source coverage</strong>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {timestamps.map((timestamp, index) => (
              <span key={index} className="timestamp-badge">
                {formatTimestamp(timestamp.start)} - {formatTimestamp(timestamp.end)}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function renderWithTimestamps(text: string) {
  const parts = text.split(/(\[\d{2}:\d{2}-\d{2}:\d{2}\])/g);
  return parts.map((part, index) => {
    if (/^\[\d{2}:\d{2}-\d{2}:\d{2}\]$/.test(part)) {
      return (
        <span key={index} className="timestamp-badge" style={{ marginInline: 4 }}>
          {part.replace(/[\[\]]/g, "")}
        </span>
      );
    }

    const boldParts = part.split(/(\*\*.*?\*\*)/g);
    return (
      <span key={index}>
        {boldParts.map((chunk, chunkIndex) =>
          chunk.startsWith("**") && chunk.endsWith("**") ? (
            <strong key={chunkIndex}>{chunk.slice(2, -2)}</strong>
          ) : (
            chunk
          ),
        )}
      </span>
    );
  });
}
