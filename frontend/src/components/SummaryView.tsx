"use client";

import { formatTimestamp } from "@/lib/api";

interface Props {
  summary: string;
  timestamps?: Array<{ start: number; end: number }>;
}

export default function SummaryView({ summary, timestamps }: Props) {
  // Render inline timestamps like [MM:SS-MM:SS] as badges
  const renderWithTimestamps = (text: string) => {
    const parts = text.split(/(\[\d{2}:\d{2}-\d{2}:\d{2}\])/g);
    return parts.map((part, i) => {
      if (/^\[\d{2}:\d{2}-\d{2}:\d{2}\]$/.test(part)) {
        const ts = part.replace(/[\[\]]/g, "");
        return (
          <span key={i} className="timestamp-badge" style={{ margin: "0 2px" }}>
            🕐 {ts}
          </span>
        );
      }
      // Handle bold
      const boldParts = part.split(/(\*\*.*?\*\*)/g);
      return (
        <span key={i}>
          {boldParts.map((bp, j) => {
            if (bp.startsWith("**") && bp.endsWith("**")) {
              return <strong key={j} style={{ color: "var(--text-primary)", fontWeight: 600 }}>{bp.slice(2, -2)}</strong>;
            }
            return bp;
          })}
        </span>
      );
    });
  };

  const paragraphs = summary.split(/\n\n+/).filter(p => p.trim());

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.3rem", marginBottom: "4px" }}>
          Lecture Summary
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Comprehensive overview with source citations
        </p>
      </div>

      {/* Summary card */}
      <div
        style={{
          padding: "2rem",
          borderRadius: "16px",
          background: "linear-gradient(135deg, rgba(108, 99, 255, 0.05), rgba(0, 212, 170, 0.03))",
          border: "1px solid rgba(108, 99, 255, 0.1)",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {paragraphs.map((para, i) => {
            // Check if it's a heading
            if (para.startsWith("##")) {
              return (
                <h3
                  key={i}
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "1rem",
                    color: "var(--accent-teal)",
                    marginTop: i > 0 ? "0.5rem" : 0,
                  }}
                >
                  {para.replace(/^#+\s/, "")}
                </h3>
              );
            }
            if (para.startsWith("#")) {
              return (
                <h2
                  key={i}
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "1.2rem",
                    color: "var(--text-primary)",
                  }}
                >
                  {para.replace(/^#+\s/, "")}
                </h2>
              );
            }

            return (
              <p
                key={i}
                style={{
                  color: "var(--text-secondary)",
                  lineHeight: 1.8,
                  fontSize: "0.95rem",
                }}
              >
                {renderWithTimestamps(para)}
              </p>
            );
          })}
        </div>
      </div>

      {/* Timestamp coverage */}
      {timestamps && timestamps.length > 0 && (
        <div
          style={{
            padding: "1rem 1.25rem",
            borderRadius: "10px",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-display)", fontWeight: 600 }}>
            📍 Source Coverage:
          </span>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {timestamps.map((ts, i) => (
              <span key={i} className="timestamp-badge">
                {formatTimestamp(ts.start)}–{formatTimestamp(ts.end)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
