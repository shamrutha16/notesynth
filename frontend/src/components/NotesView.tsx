"use client";

import { StudyNote, formatTimestamp } from "@/lib/api";

export default function NotesView({ notes }: { notes: StudyNote[] }) {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="section-kicker">Notes</div>
        <h2 style={{ marginTop: 14, fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "2.4rem", textTransform: "uppercase" }}>
          Structured lecture notes
        </h2>
        <p style={{ marginTop: 10, color: "var(--ink-soft)", fontSize: "1rem" }}>
          {notes.length} sections with source ranges mapped back to the transcript.
        </p>
      </div>

      <div className="notes-stack">
        {notes.map((note, index) => (
          <article key={note.id} className="note-card" style={{ background: index % 2 === 0 ? "rgba(255,255,255,0.8)" : "rgba(248, 243, 234, 0.9)" }}>
            {note.subsection ? (
              <div className="chip-button" style={{ cursor: "default", display: "inline-flex", marginBottom: 16, background: "var(--yellow)" }}>
                {note.subsection}
              </div>
            ) : null}

            <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: "1.6rem", fontWeight: 800 }}>{note.title}</h3>

            <div
              className="markdown-content"
              style={{ marginTop: 14, display: "grid", gap: 10 }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(note.content) }}
            />

            {note.source_timestamps.length > 0 && (
              <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 10 }}>
                {note.source_timestamps.map((timestamp, timestampIndex) => (
                  <span key={timestampIndex} className="timestamp-badge">
                    {formatTimestamp(timestamp.start)} - {formatTimestamp(timestamp.end)}
                  </span>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/^- (.*)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*<\/li>)/g, "<ul>$1</ul>")
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("<h") || trimmed.startsWith("<ul")) return trimmed;
      return `<p>${trimmed.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("");
}
