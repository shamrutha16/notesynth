"use client";

import { StudyNote, formatTimestamp } from "@/lib/api";

export function NotesView({ notes }: { notes: StudyNote[] }) {
  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.3rem", marginBottom: "4px" }}>
          Lecture Notes
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          {notes.length} sections · AI-generated with source citations
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {notes.map((note, i) => (
          <div
            key={note.id}
            style={{
              padding: "1.5rem",
              borderRadius: "14px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              position: "relative",
            }}
          >
            {/* Section number indicator */}
            <div
              style={{
                position: "absolute",
                top: "1.5rem",
                left: "-1px",
                width: "3px",
                height: "calc(100% - 3rem)",
                borderRadius: "0 2px 2px 0",
                background: "linear-gradient(180deg, var(--accent-electric), var(--accent-teal))",
              }}
            />

            <div style={{ paddingLeft: "1rem" }}>
              {note.subsection && (
                <div
                  style={{
                    display: "inline-block",
                    padding: "3px 10px",
                    borderRadius: "100px",
                    background: "rgba(108, 99, 255, 0.1)",
                    color: "var(--accent-electric)",
                    fontSize: "0.72rem",
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    marginBottom: "8px",
                    border: "1px solid rgba(108, 99, 255, 0.2)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {note.subsection}
                </div>
              )}

              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "1.05rem",
                  color: "var(--text-primary)",
                  marginBottom: "0.75rem",
                }}
              >
                {note.title}
              </h3>

              <div
                className="markdown-content"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(note.content) }}
              />

              {note.source_timestamps.length > 0 && (
                <div style={{ marginTop: "1rem", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {note.source_timestamps.map((ts, j) => (
                    <span key={j} className="timestamp-badge">
                      🕐 {formatTimestamp(ts.start)}–{formatTimestamp(ts.end)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderMarkdown(text: string): string {
  // Simple markdown rendering
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^\- (.*$)/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*<\/li>)/, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hul])/gm, '')
    .split('\n').map(line => {
      if (!line.startsWith('<')) return `<p>${line}</p>`;
      return line;
    }).join('\n');
}

export default NotesView;
