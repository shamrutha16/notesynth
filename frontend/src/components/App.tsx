"use client";

import { useState, useCallback } from "react";
import UploadDashboard from "./UploadDashboard";
import ProcessingStatus from "./ProcessingStatus";
import ResultsDashboard from "./ResultsDashboard";
import { Job } from "@/lib/api";

type AppState = "upload" | "processing" | "results";

export default function App() {
  const [state, setState] = useState<AppState>("upload");
  const [currentJob, setCurrentJob] = useState<Job | null>(null);

  const handleJobCreated = useCallback((job: Job) => {
    setCurrentJob(job);
    setState("processing");
  }, []);

  const handleProcessingComplete = useCallback((job: Job) => {
    setCurrentJob(job);
    setState("results");
  }, []);

  const handleReset = useCallback(() => {
    setCurrentJob(null);
    setState("upload");
  }, []);

  return (
    <>
      {/* Animated background */}
      <div className="gradient-bg">
        <div className="gradient-orb gradient-orb-1" />
        <div className="gradient-orb gradient-orb-2" />
        <div className="gradient-orb gradient-orb-3" />
      </div>
      <div className="noise-overlay" />

      {/* Header */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: "0 2rem",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(10, 10, 15, 0.8)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: "12px" }}
          onClick={handleReset}
          className="cursor-pointer"
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "10px",
              background: "linear-gradient(135deg, var(--accent-electric), var(--accent-teal))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
            </svg>
          </div>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.3rem",
              fontWeight: 800,
              background: "linear-gradient(135deg, #fff 30%, var(--accent-teal))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            NoteSynth
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {["upload", "processing", "results"].map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  background: state === s
                    ? "var(--accent-electric)"
                    : (["upload", "processing", "results"].indexOf(state) > i
                      ? "var(--accent-teal)"
                      : "var(--bg-elevated)"),
                  color: state === s || (["upload", "processing", "results"].indexOf(state) > i)
                    ? "white"
                    : "var(--text-muted)",
                  border: `1px solid ${state === s ? "var(--accent-electric)" : "var(--border-subtle)"}`,
                }}
              >
                {["upload", "processing", "results"].indexOf(state) > i ? "✓" : i + 1}
              </div>
              <span
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  fontFamily: "var(--font-display)",
                  color: state === s ? "var(--text-primary)" : "var(--text-muted)",
                  textTransform: "capitalize",
                }}
              >
                {s}
              </span>
              {i < 2 && (
                <div style={{ width: 24, height: 1, background: "var(--border-medium)" }} />
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {state !== "upload" && (
            <button
              onClick={handleReset}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-medium)",
                color: "var(--text-secondary)",
                fontSize: "0.8rem",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12l7-7 7 7"/>
              </svg>
              New Upload
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main style={{ paddingTop: "64px", minHeight: "100vh" }}>
        {state === "upload" && (
          <UploadDashboard onJobCreated={handleJobCreated} />
        )}
        {state === "processing" && currentJob && (
          <ProcessingStatus
            job={currentJob}
            onComplete={handleProcessingComplete}
            onReset={handleReset}
          />
        )}
        {state === "results" && currentJob && (
          <ResultsDashboard job={currentJob} onReset={handleReset} />
        )}
      </main>
    </>
  );
}
