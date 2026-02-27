"use client";

import { useEffect, useState, useRef } from "react";
import { Job, getJob } from "@/lib/api";

interface Props {
  job: Job;
  onComplete: (job: Job) => void;
  onReset: () => void;
}

const STAGE_CONFIG = {
  pending: { label: "Queued", icon: "⏳", color: "var(--text-muted)" },
  transcribing: { label: "Transcribing", icon: "🎙️", color: "var(--accent-amber)" },
  embedding: { label: "Embedding Chunks", icon: "🔷", color: "var(--accent-electric)" },
  generating: { label: "Generating Study Materials", icon: "🧠", color: "var(--accent-teal)" },
  completed: { label: "Ready!", icon: "✅", color: "var(--accent-teal)" },
  failed: { label: "Failed", icon: "❌", color: "var(--accent-rose)" },
};

const PIPELINE_STAGES = [
  { key: "transcribing", label: "Audio Transcription", desc: "Whisper AI analyzing speech with word timestamps" },
  { key: "embedding", label: "Semantic Chunking", desc: "Splitting and embedding transcript into vector DB" },
  { key: "generating", label: "AI Generation", desc: "GPT-4o/Claude generating study materials via RAG" },
  { key: "completed", label: "Ready", desc: "All study materials generated and indexed" },
];

function stageIndex(status: string): number {
  return ["pending", "transcribing", "embedding", "generating", "completed"].indexOf(status);
}

export default function ProcessingStatus({ job: initialJob, onComplete, onReset }: Props) {
  const [job, setJob] = useState(initialJob);
  const [dots, setDots] = useState("");
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Animate dots
  useEffect(() => {
    const timer = setInterval(() => {
      setDots(d => d.length >= 3 ? "" : d + ".");
    }, 400);
    return () => clearInterval(timer);
  }, []);

  // Poll job status
  useEffect(() => {
    if (job.status === "completed" || job.status === "failed") return;

    pollRef.current = setInterval(async () => {
      try {
        const updated = await getJob(job.job_id);
        setJob(updated);

        if (updated.status === "completed") {
          if (pollRef.current) clearInterval(pollRef.current);
          setTimeout(() => onComplete(updated), 1000);
        } else if (updated.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [job.job_id, job.status, onComplete]);

  const stage = STAGE_CONFIG[job.status] || STAGE_CONFIG.pending;
  const currentStageIdx = stageIndex(job.status);

  const formatDuration = (s?: number) => {
    if (!s) return "--";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}m ${sec}s`;
  };

  return (
    <div
      style={{
        maxWidth: 700,
        margin: "0 auto",
        padding: "4rem 2rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "2rem",
      }}
    >
      {/* Central status indicator */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "var(--bg-card)",
            border: "2px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "3rem",
            position: "relative",
            zIndex: 2,
          }}
          className={job.status !== "completed" && job.status !== "failed" ? "pulse-glow" : ""}
        >
          {stage.icon}
        </div>

        {/* Spinning ring */}
        {job.status !== "completed" && job.status !== "failed" && (
          <div
            style={{
              position: "absolute",
              inset: -8,
              borderRadius: "50%",
              border: "3px solid transparent",
              borderTopColor: stage.color,
              borderRightColor: stage.color,
            }}
            className="spin"
          />
        )}
      </div>

      {/* Status text */}
      <div style={{ textAlign: "center" }}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.6rem",
            fontWeight: 700,
            color: stage.color,
            marginBottom: "0.5rem",
          }}
        >
          {stage.label}{job.status !== "completed" && job.status !== "failed" ? dots : ""}
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          {job.message}
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ width: "100%", maxWidth: 500 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-muted)" }}>
            {job.filename}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.78rem",
              color: stage.color,
              fontWeight: 600,
            }}
          >
            {job.progress}%
          </span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${job.progress}%` }}
          />
        </div>
      </div>

      {/* Pipeline stages */}
      <div
        className="glass-card"
        style={{ width: "100%", padding: "1.5rem", maxWidth: 560 }}
      >
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "1.25rem",
          }}
        >
          Processing Pipeline
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {PIPELINE_STAGES.map((ps, i) => {
            const isDone = currentStageIdx > i || (ps.key === "completed" && job.status === "completed");
            const isCurrent = ps.key === job.status || (ps.key === "transcribing" && job.status === "pending");
            const isPending = currentStageIdx < i && ps.key !== "completed";

            return (
              <div key={ps.key} style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                {/* Connector line + dot */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "20px" }}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: isDone
                        ? "var(--accent-teal)"
                        : isCurrent
                        ? "var(--accent-electric)"
                        : "var(--bg-elevated)",
                      border: `2px solid ${isDone ? "var(--accent-teal)" : isCurrent ? "var(--accent-electric)" : "var(--border-medium)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.65rem",
                      flexShrink: 0,
                    }}
                  >
                    {isDone ? "✓" : isCurrent ? (
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "var(--accent-electric)",
                        }}
                      />
                    ) : null}
                  </div>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <div
                      style={{
                        width: 2,
                        flex: 1,
                        minHeight: "24px",
                        background: isDone ? "var(--accent-teal)" : "var(--border-subtle)",
                        margin: "4px 0",
                        borderRadius: "1px",
                      }}
                    />
                  )}
                </div>

                <div style={{ paddingBottom: i < PIPELINE_STAGES.length - 1 ? "20px" : 0 }}>
                  <p
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 600,
                      fontSize: "0.88rem",
                      color: isDone ? "var(--accent-teal)" : isCurrent ? "var(--text-primary)" : "var(--text-muted)",
                      marginBottom: "2px",
                    }}
                  >
                    {ps.label}
                  </p>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                    {ps.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metadata */}
      {(job.duration_seconds || job.chunk_count) && (
        <div
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {job.duration_seconds && (
            <div
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>⏱ Duration:</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 500 }}>
                {formatDuration(job.duration_seconds)}
              </span>
            </div>
          )}
          {job.chunk_count && (
            <div
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>📦 Chunks:</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 500 }}>
                {job.chunk_count}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Failed state */}
      {job.status === "failed" && (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              padding: "16px 24px",
              borderRadius: "12px",
              background: "rgba(255, 107, 138, 0.1)",
              border: "1px solid rgba(255, 107, 138, 0.25)",
              marginBottom: "1.5rem",
              maxWidth: 480,
            }}
          >
            <p style={{ color: "var(--accent-rose)", fontSize: "0.9rem" }}>
              {job.error || "An unexpected error occurred"}
            </p>
          </div>
          <button
            onClick={onReset}
            style={{
              padding: "12px 28px",
              borderRadius: "10px",
              background: "var(--accent-electric)",
              border: "none",
              color: "white",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
