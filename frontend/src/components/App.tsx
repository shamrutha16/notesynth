"use client";

import { useCallback, useState } from "react";
import ChatWidget from "./ChatWidget";
import FeedbackWidget from "./FeedbackWidget";
import Icon from "./Icon";
import ProcessingStatus from "./ProcessingStatus";
import ResultsDashboard from "./ResultsDashboard";
import UploadDashboard from "./UploadDashboard";
import { Job } from "@/lib/api";

type AppState = "upload" | "processing" | "results";

const TICKER_ITEMS = [
  "NEW: Live recording",
  "10K+ students",
  "Timestamped Q&A",
  "Export anywhere",
  "Free tier",
  "Made with caffeine",
];

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
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  return (
    <div className="app-root">
      <div className="ticker">
        <div className="ticker-track">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, index) => (
            <div className="ticker-item" key={`${item}-${index}`}>
              <span>{item}</span>
              <span className="ticker-dot">★</span>
            </div>
          ))}
        </div>
      </div>

      <header className="site-header">
        <div className="page-shell header-row">
          <button
            onClick={handleReset}
            style={{ background: "transparent", border: "none", cursor: "pointer" }}
            aria-label="Return to NoteSynth home"
          >
            <span className="brand-lockup">
              <span className="brand-mark">
                <Icon name="spark" size={22} strokeWidth={2.4} />
              </span>
              <span>NoteSynth.</span>
            </span>
          </button>

          <div className="header-actions">
            <div className={`nav-pill ${state === "upload" ? "active" : ""}`}>
              <span>01</span>
              <span>Upload</span>
            </div>
            <div className={`nav-pill ${state === "processing" ? "active" : ""}`}>
              <span>02</span>
              <span>Cook</span>
            </div>
            <div className={`nav-pill ${state === "results" ? "active" : ""}`}>
              <span>03</span>
              <span>Learn</span>
            </div>
          </div>

          <div className="header-actions">
            {state !== "upload" ? (
              <button className="ghost-button" onClick={handleReset}>
                <Icon name="refresh" size={18} />
                New Lecture
              </button>
            ) : (
              <a className="cta-button" href="#workspace">
                Get cracking
                <Icon name="arrow" size={18} />
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="page-shell">
        {state === "upload" && <UploadDashboard onJobCreated={handleJobCreated} />}
        {state === "processing" && currentJob && (
          <ProcessingStatus job={currentJob} onComplete={handleProcessingComplete} onReset={handleReset} />
        )}
        {state === "results" && currentJob && <ResultsDashboard job={currentJob} onReset={handleReset} />}
      </main>

      <ChatWidget />
      <FeedbackWidget />
    </div>
  );
}
