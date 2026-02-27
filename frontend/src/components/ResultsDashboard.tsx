"use client";

import { useState, useEffect } from "react";
import { Job, getOutput, getTranscript, GeneratedOutput, formatTimestamp } from "@/lib/api";
import FlashcardsView from "./FlashcardsView";
import MCQsView from "./MCQsView";
import NotesView from "./NotesView";
import SummaryView from "./SummaryView";
import QAView from "./QAView";

interface Props {
  job: Job;
  onReset: () => void;
}

const TABS = [
  { key: "notes", label: "📝 Notes", color: "var(--accent-electric)" },
  { key: "summary", label: "📋 Summary", color: "var(--accent-teal)" },
  { key: "flashcards", label: "🃏 Flashcards", color: "var(--accent-amber)" },
  { key: "mcqs", label: "✏️ MCQs", color: "var(--accent-rose)" },
  { key: "qa", label: "💬 Q&A", color: "#a78bfa" },
] as const;

type TabKey = typeof TABS[number]["key"];

export default function ResultsDashboard({ job, onReset }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("notes");
  const [outputs, setOutputs] = useState<Record<string, GeneratedOutput | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [transcript, setTranscript] = useState<any>(null);

  // Load outputs
  useEffect(() => {
    TABS.forEach(tab => {
      fetchOutput(tab.key);
    });
    fetchTranscript();
  }, [job.job_id]);

  const fetchOutput = async (type: string) => {
    if (outputs[type] !== undefined) return;
    setLoading(prev => ({ ...prev, [type]: true }));
    try {
      const data = await getOutput(job.job_id, type);
      setOutputs(prev => ({ ...prev, [type]: data }));
    } catch (e) {
      setOutputs(prev => ({ ...prev, [type]: null }));
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const fetchTranscript = async () => {
    try {
      const t = await getTranscript(job.job_id);
      setTranscript(t);
    } catch {}
  };

  const currentOutput = outputs[activeTab];
  const isLoading = loading[activeTab];

  const tabColor = TABS.find(t => t.key === activeTab)?.color || "var(--accent-electric)";

  const formatDuration = (s?: number) => {
    if (!s) return "--";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}m ${sec}s`;
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem" }}>
      {/* Job summary header */}
      <div
        className="glass-card fade-up"
        style={{
          padding: "1.25rem 1.5rem",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "12px",
              background: "rgba(0, 212, 170, 0.1)",
              border: "1px solid rgba(0, 212, 170, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.25rem",
            }}
          >
            🎓
          </div>
          <div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "1rem",
                color: "var(--text-primary)",
              }}
            >
              {job.filename}
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
              {job.chunk_count && `${job.chunk_count} chunks`}
              {job.duration_seconds && ` · ${formatDuration(job.duration_seconds)}`}
              {transcript?.segments && ` · ${transcript.segments.length} segments`}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              padding: "6px 14px",
              borderRadius: "100px",
              background: "rgba(0, 212, 170, 0.1)",
              border: "1px solid rgba(0, 212, 170, 0.25)",
              color: "var(--accent-teal)",
              fontSize: "0.78rem",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--accent-teal)",
              }}
            />
            Completed
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "1.5rem",
          overflowX: "auto",
          paddingBottom: "4px",
        }}
      >
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); fetchOutput(tab.key); }}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              fontFamily: "var(--font-display)",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              border: activeTab === tab.key ? `1px solid ${tab.color}` : "1px solid var(--border-subtle)",
              background: activeTab === tab.key
                ? `${tab.color}1a`
                : "var(--bg-elevated)",
              color: activeTab === tab.key ? tab.color : "var(--text-secondary)",
              boxShadow: activeTab === tab.key ? `0 4px 20px ${tab.color}30` : "none",
              transition: "all 0.2s ease",
            }}
          >
            {tab.label}
            {outputs[tab.key] && (
              <span
                style={{
                  marginLeft: "8px",
                  padding: "2px 7px",
                  borderRadius: "100px",
                  background: activeTab === tab.key ? `${tab.color}30` : "var(--bg-card)",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                }}
              >
                {getCount(outputs[tab.key], tab.key)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div
        className="glass-card"
        style={{ padding: "2rem", minHeight: "500px" }}
      >
        {isLoading ? (
          <LoadingSkeleton />
        ) : currentOutput ? (
          <div key={activeTab}>
            {activeTab === "notes" && currentOutput.notes && (
              <NotesView notes={currentOutput.notes} />
            )}
            {activeTab === "summary" && currentOutput.summary && (
              <SummaryView summary={currentOutput.summary} timestamps={currentOutput.summary_timestamps} />
            )}
            {activeTab === "flashcards" && currentOutput.flashcards && (
              <FlashcardsView flashcards={currentOutput.flashcards} />
            )}
            {activeTab === "mcqs" && currentOutput.mcqs && (
              <MCQsView mcqs={currentOutput.mcqs} />
            )}
            {activeTab === "qa" && currentOutput.qa_pairs && (
              <QAView pairs={currentOutput.qa_pairs} />
            )}
          </div>
        ) : (
          <EmptyState type={activeTab} />
        )}
      </div>

      {/* Transcript panel (collapsible) */}
      {transcript?.segments && (
        <TranscriptPanel segments={transcript.segments} />
      )}
    </div>
  );
}

function getCount(output: GeneratedOutput | null, type: string): number | string {
  if (!output) return 0;
  if (type === "flashcards") return output.flashcards?.length || 0;
  if (type === "mcqs") return output.mcqs?.length || 0;
  if (type === "qa") return output.qa_pairs?.length || 0;
  if (type === "notes") return output.notes?.length || 0;
  return "✓";
}

function LoadingSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {[1, 2, 3].map(i => (
        <div key={i} className="shimmer" style={{ borderRadius: "10px", height: i === 1 ? 32 : 80 }} />
      ))}
    </div>
  );
}

function EmptyState({ type }: { type: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: 300,
        gap: "12px",
      }}
    >
      <div style={{ fontSize: "2.5rem" }}>🔄</div>
      <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-display)", fontWeight: 600 }}>
        {type} not available yet
      </p>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
        Try refreshing in a moment
      </p>
    </div>
  );
}

function TranscriptPanel({ segments }: { segments: any[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="glass-card"
      style={{ marginTop: "1.5rem", overflow: "hidden" }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          padding: "1rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-primary)",
        }}
      >
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
          📜 Raw Transcript
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 400 }}>
            {segments.length} segments
          </span>
        </span>
        <span style={{ color: "var(--text-muted)" }}>{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div style={{ padding: "0 1.5rem 1.5rem", maxHeight: 400, overflowY: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {segments.map((seg: any) => (
              <div key={seg.id} style={{ display: "flex", gap: "12px" }}>
                <span
                  className="timestamp-badge"
                  style={{ flexShrink: 0, alignSelf: "flex-start", marginTop: "2px" }}
                >
                  {formatTimestamp(seg.start)}
                </span>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.6 }}>
                  {seg.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
