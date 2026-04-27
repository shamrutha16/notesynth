"use client";

import { useEffect, useMemo, useState } from "react";
import { GeneratedOutput, Job, getOutput, getTranscript } from "@/lib/api";
import FlashcardsView from "./FlashcardsView";
import Icon from "./Icon";
import MCQsView from "./MCQsView";
import NotesView from "./NotesView";
import QAView from "./QAView";
import SummaryView from "./SummaryView";

interface Props {
  job: Job;
  onReset: () => void;
}

const TABS = [
  { key: "notes", label: "Notes", accent: "var(--yellow)", icon: "notes" as const },
  { key: "summary", label: "Summary", accent: "var(--mint)", icon: "spark" as const },
  { key: "flashcards", label: "Flashcards", accent: "var(--cyan)", icon: "cards" as const },
  { key: "mcqs", label: "MCQs", accent: "var(--pink)", icon: "quiz" as const },
  { key: "qa", label: "Q&A", accent: "var(--orange)", icon: "chat" as const },
] as const;

type TabKey = (typeof TABS)[number]["key"];

type TranscriptSegment = {
  id: string;
  start: number;
  end: number;
  text: string;
};

export default function ResultsDashboard({ job, onReset }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("notes");
  const [outputs, setOutputs] = useState<Record<string, GeneratedOutput | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [transcript, setTranscript] = useState<{ segments: TranscriptSegment[] } | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  useEffect(() => {
    TABS.forEach((tab) => {
      void fetchOutput(tab.key);
    });
    void fetchTranscript();
  }, [job.job_id]);

  const fetchOutput = async (type: string) => {
    if (outputs[type] !== undefined) return;
    setLoading((prev) => ({ ...prev, [type]: true }));
    try {
      const data = await getOutput(job.job_id, type);
      setOutputs((prev) => ({ ...prev, [type]: data }));
    } catch {
      setOutputs((prev) => ({ ...prev, [type]: null }));
    } finally {
      setLoading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const fetchTranscript = async () => {
    try {
      const data = await getTranscript(job.job_id);
      setTranscript(data);
    } catch {
      setTranscript(null);
    }
  };

  const currentOutput = outputs[activeTab];
  const isLoading = loading[activeTab];

  const counts = useMemo(
    () => ({
      notes: outputs.notes?.notes?.length ?? 0,
      summary: outputs.summary?.summary ? 1 : 0,
      flashcards: outputs.flashcards?.flashcards?.length ?? 0,
      mcqs: outputs.mcqs?.mcqs?.length ?? 0,
      qa: outputs.qa?.qa_pairs?.length ?? 0,
    }),
    [outputs],
  );

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <section className="results-layout">
      <aside className="results-summary">
        <div className="workspace-card" style={{ background: "rgba(248, 230, 111, 0.22)" }}>
          <div className="section-kicker">You learn</div>
          <h2 className="section-title" style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", maxWidth: "7ch", lineHeight: 0.98 }}>
            Everything in one study deck.
          </h2>
          <p className="section-description" style={{ fontSize: "1rem" }}>
            Your lecture is processed. The tabs on the right are still powered by the same output endpoints you already had.
          </p>
          <div className="hero-actions" style={{ marginTop: 24 }}>
            <button className="ghost-button" onClick={onReset}>
              <Icon name="refresh" size={18} />
              New lecture
            </button>
          </div>
        </div>

        <div className="metric-card" style={{ background: "var(--panel)" }}>
          <h3 style={{ fontSize: "2rem" }}>{job.filename}</h3>
          <p style={{ textTransform: "none", letterSpacing: 0, fontSize: "1rem", color: "var(--ink-soft)" }}>
            {job.chunk_count ?? "--"} chunks · {formatDuration(job.duration_seconds)}
          </p>
        </div>

        <div className="mini-stat-grid">
          <div className="metric-card" style={{ background: "var(--cyan)" }}>
            <h3 style={{ fontSize: "2rem" }}>{counts.flashcards}</h3>
            <p>Flashcards</p>
          </div>
          <div className="metric-card" style={{ background: "var(--pink)" }}>
            <h3 style={{ fontSize: "2rem" }}>{counts.mcqs}</h3>
            <p>MCQs</p>
          </div>
          <div className="metric-card" style={{ background: "var(--yellow)" }}>
            <h3 style={{ fontSize: "2rem" }}>{counts.notes}</h3>
            <p>Notes</p>
          </div>
          <div className="metric-card" style={{ background: "var(--mint)" }}>
            <h3 style={{ fontSize: "2rem" }}>{counts.qa}</h3>
            <p>Q&A</p>
          </div>
        </div>

        {transcript?.segments?.length ? (
          <div className="transcript-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <h4>Transcript</h4>
                <p style={{ marginTop: 8, color: "var(--ink-soft)" }}>{transcript.segments.length} timestamped segments</p>
              </div>
              <button className="chip-button" onClick={() => setTranscriptOpen((value) => !value)}>
                {transcriptOpen ? "Hide" : "Show"}
              </button>
            </div>
            {transcriptOpen && (
              <div style={{ display: "grid", gap: 12, marginTop: 18, maxHeight: 320, overflow: "auto" }}>
                {transcript.segments.map((segment) => (
                  <div key={segment.id} className="transcript-row">
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span className="timestamp-badge">{formatSeconds(segment.start)}</span>
                      <p style={{ color: "var(--ink-soft)", lineHeight: 1.55 }}>{segment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </aside>

      <div className="result-panel">
        <div className="results-tab-row" style={{ marginBottom: 18 }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`chip-button ${activeTab === tab.key ? "active" : ""}`}
              style={{ background: activeTab === tab.key ? tab.accent : "var(--panel)" }}
              onClick={() => {
                setActiveTab(tab.key);
                void fetchOutput(tab.key);
              }}
            >
              <Icon name={tab.icon} size={16} />
              {tab.label}
              <span
                style={{
                  display: "inline-grid",
                  placeItems: "center",
                  minWidth: 28,
                  height: 28,
                  padding: "0 8px",
                  borderRadius: 999,
                  border: "2px solid var(--line)",
                  background: "rgba(255,255,255,0.75)",
                }}
              >
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <LoadingState />
        ) : currentOutput ? (
          <>
            {activeTab === "notes" && currentOutput.notes && <NotesView notes={currentOutput.notes} />}
            {activeTab === "summary" && currentOutput.summary && (
              <SummaryView summary={currentOutput.summary} timestamps={currentOutput.summary_timestamps} />
            )}
            {activeTab === "flashcards" && currentOutput.flashcards && <FlashcardsView flashcards={currentOutput.flashcards} />}
            {activeTab === "mcqs" && currentOutput.mcqs && <MCQsView mcqs={currentOutput.mcqs} />}
            {activeTab === "qa" && currentOutput.qa_pairs && <QAView pairs={currentOutput.qa_pairs} />}
          </>
        ) : (
          <EmptyState type={activeTab} />
        )}
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="note-card" style={{ minHeight: 88 }} />
      <div className="note-card" style={{ minHeight: 160 }} />
      <div className="note-card" style={{ minHeight: 160 }} />
    </div>
  );
}

function EmptyState({ type }: { type: string }) {
  return (
    <div className="status-card" style={{ minHeight: 360 }}>
      <div className="status-ring" style={{ width: 90, height: 90, background: "var(--panel-soft)" }}>
        <Icon name="spark" size={28} />
      </div>
      <h3 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "2rem", textTransform: "uppercase" }}>
        {type} not ready yet
      </h3>
      <p style={{ maxWidth: 460, color: "var(--ink-soft)", lineHeight: 1.6 }}>
        This output did not come back for the current job. Try another upload or refresh the processing flow from the top.
      </p>
    </div>
  );
}

function formatSeconds(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
