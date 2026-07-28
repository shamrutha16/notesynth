"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Job, getJob } from "@/lib/api";
import Icon from "./Icon";

interface Props {
  job: Job;
  onComplete: (job: Job) => void;
  onReset: () => void;
}

const STAGE_CONFIG: Record<
  Job["status"],
  { label: string; accent: string; description: string; icon: JSX.Element }
> = {
  pending: {
    label: "Queued",
    accent: "var(--yellow)",
    description: "Lecture received. Waiting to spin up the pipeline.",
    icon: <Icon name="upload" size={34} />,
  },
  transcribing: {
    label: "Transcribing",
    accent: "var(--orange)",
    description: "Speech is being turned into structured text with timestamps.",
    icon: <Icon name="mic" size={34} />,
  },
  embedding: {
    label: "Embedding",
    accent: "var(--cyan)",
    description: "Chunks are being embedded so retrieval and Q&A stay grounded.",
    icon: <Icon name="cards" size={34} />,
  },
  generating: {
    label: "Generating",
    accent: "var(--pink)",
    description: "Notes, summary, flashcards, MCQs, and Q&A are being assembled.",
    icon: <Icon name="spark" size={34} />,
  },
  completed: {
    label: "Ready",
    accent: "var(--mint)",
    description: "Everything is cooked and waiting in the results dashboard.",
    icon: <Icon name="check" size={34} />,
  },
  failed: {
    label: "Failed",
    accent: "#ffd3d3",
    description: "Something interrupted the pipeline. The upload itself is still intact.",
    icon: <Icon name="close" size={34} />,
  },
};

const PIPELINE = [
  { key: "pending", title: "Queued", detail: "We received your lecture and created the job." },
  { key: "transcribing", title: "Transcription", detail: "Audio becomes timestamped text." },
  { key: "embedding", title: "Semantic chunking", detail: "Transcript segments are embedded for grounded retrieval." },
  { key: "generating", title: "Study generation", detail: "Notes, summary, flashcards, MCQs, and Q&A are built." },
  { key: "completed", title: "Ready to review", detail: "The results view is about to open." },
];

function getStageIndex(status: Job["status"]) {
  return PIPELINE.findIndex((stage) => stage.key === status);
}

export default function ProcessingStatus({ job: initialJob, onComplete, onReset }: Props) {
  const [job, setJob] = useState(initialJob);
  const [dots, setDots] = useState("");
  const [timedOut, setTimedOut] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  const jobIdRef = useRef(job.job_id);

  // Animated dots
  useEffect(() => {
    const timer = window.setInterval(() => {
      setDots((value) => (value.length >= 3 ? "" : `${value}.`));
    }, 400);
    return () => window.clearInterval(timer);
  }, []);

  // Exponential backoff polling
  useEffect(() => {
    // Don't poll if already in a terminal state
    if (job.status === "completed" || job.status === "failed") return;

    const MAX_WAIT_MS = 10 * 60 * 1000; // 10 minute absolute timeout
    const BASE_INTERVAL = 3000;         // start at 3s
    const MAX_INTERVAL = 30000;         // cap at 30s

    const scheduleNext = (delay: number) => {
      pollRef.current = setTimeout(async () => {
        // Absolute timeout guard
        if (Date.now() - startTimeRef.current > MAX_WAIT_MS) {
          setTimedOut(true);
          return;
        }

        try {
          const updated = await getJob(jobIdRef.current);
          setJob(updated);
          attemptRef.current = 0; // reset backoff on a successful response

          if (updated.status === "completed") {
            window.setTimeout(() => onComplete(updated), 900);
            return; // stop polling
          }

          if (updated.status === "failed") {
            return; // stop polling
          }

          // Still processing — schedule next poll with same base interval
          scheduleNext(BASE_INTERVAL);
        } catch {
          // Network error — back off exponentially
          attemptRef.current += 1;
          const backoff = Math.min(
            BASE_INTERVAL * Math.pow(2, attemptRef.current),
            MAX_INTERVAL
          );
          scheduleNext(backoff);
        }
      }, delay);
    };

    scheduleNext(BASE_INTERVAL);

    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run only once on mount

  const stage = STAGE_CONFIG[job.status];
  const stageIndex = useMemo(() => getStageIndex(job.status), [job.status]);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <section className="processing-layout">
      <div className="status-card result-panel" style={{ position: "relative" }}>
        {job.status !== "completed" && job.status !== "failed" && <div className="status-orbit" />}
        <div className="section-kicker">We cook</div>
        <div className="status-ring" style={{ background: stage.accent }}>
          {stage.icon}
        </div>
        <div>
          <h1 className="section-title" style={{ maxWidth: "none", fontSize: "clamp(2.4rem, 6vw, 4rem)" }}>
            {stage.label}
            {job.status !== "completed" && job.status !== "failed" ? dots : ""}
          </h1>
          <p className="section-description" style={{ marginTop: 14, maxWidth: 700 }}>
            {job.message || stage.description}
          </p>
        </div>

        <div style={{ width: "min(720px, 100%)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontWeight: 700 }}>
            <span>{job.filename}</span>
            <span>{job.progress}%</span>
          </div>
          <div className="progress-shell">
            <div className="progress-bar" style={{ width: `${Math.max(6, job.progress)}%` }} />
          </div>
        </div>

        <div className="stage-row" style={{ justifyContent: "center" }}>
          {PIPELINE.map((item, index) => {
            const isActive = index === stageIndex;
            const isDone = index < stageIndex || job.status === "completed";
            return (
              <div
                key={item.key}
                className="chip-button"
                style={{
                  cursor: "default",
                  background: isDone ? "var(--mint)" : isActive ? "var(--yellow)" : "var(--panel)",
                }}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span>{item.title}</span>
              </div>
            );
          })}
        </div>

        {timedOut && (
          <div className="mini-paper" style={{ marginTop: 18, background: "rgba(255,200,100,0.2)", borderColor: "var(--orange)" }}>
            <strong>Taking longer than expected.</strong> The server may be downloading the Whisper model for the first time (~1 min). The job is still running — check back shortly or{" "}
            <button className="ghost-button" style={{ display: "inline-flex", marginLeft: 8 }} onClick={onReset}>start over</button>.
          </div>
        )}

        {job.status === "failed" && (
          <button className="ghost-button" onClick={onReset}>
            <Icon name="refresh" size={18} />
            Start over
          </button>
        )}
      </div>

      <div className="results-grid">
        <div className="detail-card" style={{ gridColumn: "span 4", background: "rgba(248, 230, 111, 0.3)" }}>
          <h4>Duration</h4>
          <p style={{ marginTop: 14, fontSize: "2rem", fontWeight: 800 }}>{formatDuration(job.duration_seconds)}</p>
          <p style={{ marginTop: 8, color: "var(--ink-soft)" }}>Lecture runtime</p>
        </div>
        <div className="detail-card" style={{ gridColumn: "span 4", background: "rgba(105, 223, 240, 0.24)" }}>
          <h4>Chunks</h4>
          <p style={{ marginTop: 14, fontSize: "2rem", fontWeight: 800 }}>{job.chunk_count ?? "--"}</p>
          <p style={{ marginTop: 8, color: "var(--ink-soft)" }}>Semantic slices</p>
        </div>
        <div className="detail-card" style={{ gridColumn: "span 4", background: "rgba(245, 139, 192, 0.2)" }}>
          <h4>Status</h4>
          <p style={{ marginTop: 14, fontSize: "2rem", fontWeight: 800 }}>{stage.label}</p>
          <p style={{ marginTop: 8, color: "var(--ink-soft)" }}>{job.progress}% complete</p>
        </div>

        <div className="timeline-card" style={{ gridColumn: "span 12" }}>
          <h4>Pipeline timeline</h4>
          <div style={{ display: "grid", gap: 18, marginTop: 20 }}>
            {PIPELINE.map((item, index) => {
              const isActive = index === stageIndex;
              const isDone = index < stageIndex || job.status === "completed";
              return (
                <div key={item.key} style={{ display: "grid", gridTemplateColumns: "42px 1fr", gap: 16 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 16,
                      border: "3px solid var(--line)",
                      boxShadow: "4px 4px 0 0 var(--line)",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 800,
                      background: isDone ? "var(--mint)" : isActive ? "var(--yellow)" : "var(--panel)",
                    }}
                  >
                    {isDone ? <Icon name="check" size={18} /> : String(index + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "1.06rem" }}>{item.title}</div>
                    <p style={{ marginTop: 6, color: "var(--ink-soft)", lineHeight: 1.55 }}>{item.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
