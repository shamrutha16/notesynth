"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Job, uploadAudio, uploadRecording } from "@/lib/api";
import Icon from "./Icon";

interface Props {
  onJobCreated: (job: Job) => void;
}

const FEATURE_CARDS = [
  {
    index: "01 / Notes",
    title: "Structured notes that do not need cleanup",
    description: "Neat headings, bullets, concept blocks, and timestamp anchors your brain can actually scan later.",
    accent: "accent-orange",
    span: "span-4",
    preview: ["## Key concepts", "- Signal flow", "- Example breakdown"],
  },
  {
    index: "02 / Summary",
    title: "TL;DR for your brain",
    description: "One lecture, compressed into the handful of ideas worth remembering before the next class.",
    accent: "accent-yellow",
    span: "span-4",
    preview: ["1 paragraph", "5 bullets", "exam-safe recap"],
  },
  {
    index: "03 / Flashcards",
    title: "Flip. Learn. Repeat.",
    description: "Generate flashcards directly from the lecture, with difficulty tags and source timestamps.",
    accent: "accent-cyan",
    span: "span-4",
    preview: ["48 cards", "easy / medium / hard", "source-linked"],
  },
  {
    index: "04 / MCQs",
    title: "Auto quizzes with explanations",
    description: "Practice recall with multiple choice questions that explain the answer instead of just judging you.",
    accent: "accent-pink",
    span: "span-6",
    preview: ["24 questions", "instant score", "answer notes"],
  },
  {
    index: "05 / Q&A",
    title: "Ask the lecture anything",
    description: "Search the content in plain English and trace the answer back to where it appeared in the audio.",
    accent: "accent-mint",
    span: "span-6",
    preview: ["timestamped answers", "topic lookup", "study-safe grounding"],
  },
];

const STEPS = [
  { number: "01", title: "DROP IT", description: "MP3, WAV, M4A, FLAC, or a fresh recording from the built-in recorder." },
  { number: "02", title: "WE COOK", description: "Transcribe, chunk, embed, and generate study material without touching your backend." },
  { number: "03", title: "YOU LEARN", description: "Review notes, summary, flashcards, MCQs, and Q&A from one results workspace." },
];

const QUOTES = [
  {
    body: "Replaced the scattered study flow. Notes, cards, and timestamped Q&A finally live in one place.",
    author: "Maya R.",
    title: "PhD candidate",
  },
  {
    body: "Recording live and getting MCQs right after class is unfair in the best way.",
    author: "Devon K.",
    title: "CS undergrad",
  },
  {
    body: "The output feels organized enough to use immediately instead of needing a cleanup lap.",
    author: "Aisha N.",
    title: "Exam prep mode",
  },
];

export default function UploadDashboard({ onJobCreated }: Props) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeTab, setActiveTab] = useState<"upload" | "record">("upload");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const waveformHeights = useMemo(
    () => [18, 42, 24, 56, 36, 62, 28, 45, 20, 58, 32, 50, 22, 48, 26, 40, 54, 30, 60, 34],
    [],
  );

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);
      try {
        const job = await uploadAudio(file);
        onJobCreated(job);
      } catch (event) {
        const message = event instanceof Error ? event.message : "Upload failed";
        setError(message);
        setUploading(false);
      }
    },
    [onJobCreated],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragOver(false);
      const file = event.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recordingChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.start(120);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => setRecordingTime((value) => value + 1), 1000);
      setError(null);
    } catch {
      setError("Microphone access is required to record audio.");
    }
  };

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);

    await new Promise<void>((resolve) => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = () => resolve();
      } else {
        resolve();
      }
    });

    const blob = new Blob(recordingChunksRef.current, { type: "audio/webm" });
    setUploading(true);
    setError(null);

    try {
      const job = await uploadRecording(blob);
      onJobCreated(job);
    } catch (event) {
      const message = event instanceof Error ? event.message : "Recording upload failed";
      setError(message);
      setUploading(false);
    }
  }, [onJobCreated]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <>
      <section className="hero-grid">
        <div className="hero-copy">
          <div className="hero-kicker">
            <span style={{ color: "var(--orange)" }}>●</span>
            AI Study Buddy - v1
          </div>

          <h1 className="hero-title">
            Turn your <span className="highlight-block">lectures</span> into <span className="outline-word">actual</span>{" "}
            knowledge
          </h1>

          <p className="hero-description">
            Drop an audio file or hit record. We turn it into <mark>notes</mark>, <mark style={{ background: "var(--cyan)" }}>flashcards</mark>,{" "}
            <mark style={{ background: "var(--pink)" }}>MCQs</mark> and grounded Q&amp;A with timestamped sources.
          </p>

          <div className="hero-actions">
            <a className="cta-button" href="#workspace">
              <Icon name="upload" size={18} />
              Upload Lecture
            </a>
            <button className="ghost-button" type="button" onClick={() => setActiveTab("record")}>
              <Icon name="mic" size={18} />
              Try Recording
            </button>
          </div>
        </div>

        <div className="hero-card">
          <div className="tape-strip" />
          <div className="recording-row" style={{ marginTop: 34 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="live-dot" />
              <span>Recording</span>
            </div>
            <span>00:42 / 58:14</span>
          </div>

          <div className="wave-bars" aria-hidden="true">
            {waveformHeights.map((height, index) => (
              <span key={index} style={{ height, animationDelay: `${index * 0.08}s` }} />
            ))}
          </div>

          <div className="preview-grid">
            <div className="preview-chip" style={{ background: "var(--yellow)" }}>
              <div style={{ color: "var(--ink-soft)" }}>
                <Icon name="notes" size={18} />
              </div>
              <h4 style={{ marginTop: 10, fontSize: "1.05rem", fontWeight: 800 }}>Notes</h4>
              <p style={{ marginTop: 8, fontSize: "1.4rem", fontWeight: 800 }}>12 sections</p>
            </div>
            <div className="preview-chip" style={{ background: "var(--cyan)" }}>
              <div style={{ color: "var(--ink-soft)" }}>
                <Icon name="cards" size={18} />
              </div>
              <h4 style={{ marginTop: 10, fontSize: "1.05rem", fontWeight: 800 }}>Flashcards</h4>
              <p style={{ marginTop: 8, fontSize: "1.4rem", fontWeight: 800 }}>48 cards</p>
            </div>
            <div className="preview-chip" style={{ background: "var(--pink)" }}>
              <div style={{ color: "var(--ink-soft)" }}>
                <Icon name="quiz" size={18} />
              </div>
              <h4 style={{ marginTop: 10, fontSize: "1.05rem", fontWeight: 800 }}>MCQs</h4>
              <p style={{ marginTop: 8, fontSize: "1.4rem", fontWeight: 800 }}>24 quizzes</p>
            </div>
          </div>
        </div>
      </section>

      <section className="proof-row">
        <div className="section-kicker">Loved by nerds at</div>
        <div className="proof-brands">
          <span>STANFORD</span>
          <span>MIT</span>
          <span>IIT</span>
          <span>BERKELEY</span>
          <span>OXFORD</span>
          <span>ETH</span>
        </div>
      </section>

      <section className="metrics-grid">
        <div className="metric-card" style={{ background: "var(--yellow)" }}>
          <h3>10K+</h3>
          <p>Students</p>
        </div>
        <div className="metric-card" style={{ background: "var(--cyan)" }}>
          <h3>1.2M</h3>
          <p>Lectures</p>
        </div>
        <div className="metric-card" style={{ background: "var(--panel)" }}>
          <h3>98%</h3>
          <p>Recall Up</p>
        </div>
        <div className="metric-card" style={{ background: "var(--panel)" }}>
          <h3>150+</h3>
          <p>Unis</p>
        </div>
      </section>

      <section id="workspace" className="upload-layout">
        <aside className="upload-panel">
          <div className="panel-header" style={{ padding: 0, borderBottom: "none", marginBottom: 18 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.4rem" }}>Drop it here</div>
              <p style={{ marginTop: 6, color: "var(--ink-soft)" }}>
                Upload a lecture file or record audio live.
              </p>
            </div>
          </div>

          <div className="tab-row" style={{ marginBottom: 18 }}>
            <button className={`chip-button ${activeTab === "upload" ? "active" : ""}`} onClick={() => setActiveTab("upload")}>
              <Icon name="upload" size={16} />
              Upload file
            </button>
            <button className={`chip-button ${activeTab === "record" ? "active" : ""}`} onClick={() => setActiveTab("record")}>
              <Icon name="mic" size={16} />
              Record audio
            </button>
          </div>

          {activeTab === "upload" ? (
            <div
              className={`dropzone ${isDragOver ? "drag-over" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.m4a,.wav,.webm,.ogg,.flac,.mp4"
                style={{ display: "none" }}
                onChange={(event) => event.target.files?.[0] && handleFile(event.target.files[0])}
              />

              {uploading ? (
                <div style={{ display: "grid", justifyItems: "center", gap: 16 }}>
                  <div className="status-ring" style={{ width: 88, height: 88 }}>
                    <div className="spin">
                      <Icon name="upload" size={28} />
                    </div>
                  </div>
                  <strong>Uploading and starting analysis...</strong>
                </div>
              ) : (
                <div style={{ display: "grid", justifyItems: "center" }}>
                  <span className="brand-mark" style={{ width: 72, height: 72, borderRadius: 24 }}>
                    <Icon name="upload" size={28} />
                  </span>
                  <div className="dropzone-title">Upload a lecture</div>
                  <p style={{ marginTop: 10, color: "var(--ink-soft)", maxWidth: 360 }}>
                    Drag a file here or click to browse. Supported: MP3, M4A, WAV, FLAC, WEBM, OGG, MP4.
                  </p>
                  <div className="quick-prompts" style={{ justifyContent: "center", marginTop: 18 }}>
                    {["MP3", "WAV", "M4A", "FLAC", "WEBM"].map((item) => (
                      <span key={item} className="chip-button" style={{ cursor: "default" }}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="dropzone" style={{ cursor: "default" }}>
              {isRecording ? (
                <div style={{ display: "grid", justifyItems: "center", gap: 18 }}>
                  <div className="status-ring" style={{ width: 88, height: 88, background: "#fff4f4" }}>
                    <span className="live-dot" />
                  </div>
                  <div style={{ fontFamily: "Syne, sans-serif", fontSize: "2.4rem", fontWeight: 800 }}>
                    {formatTime(recordingTime)}
                  </div>
                  <div className="wave-bars" style={{ margin: 0, height: 52 }}>
                    {waveformHeights.slice(0, 16).map((height, index) => (
                      <span key={index} style={{ height: height / 1.4, animationDelay: `${index * 0.08}s` }} />
                    ))}
                  </div>
                  <button className="cta-button" onClick={stopRecording}>
                    <Icon name="check" size={18} />
                    Stop and process
                  </button>
                </div>
              ) : uploading ? (
                <div style={{ display: "grid", justifyItems: "center", gap: 16 }}>
                  <div className="status-ring" style={{ width: 88, height: 88 }}>
                    <div className="spin">
                      <Icon name="mic" size={28} />
                    </div>
                  </div>
                  <strong>Processing recording...</strong>
                </div>
              ) : (
                <div style={{ display: "grid", justifyItems: "center", gap: 16 }}>
                  <span className="brand-mark" style={{ width: 72, height: 72, borderRadius: 999 }}>
                    <Icon name="mic" size={28} />
                  </span>
                  <div className="dropzone-title">Record live</div>
                  <p style={{ color: "var(--ink-soft)", maxWidth: 360 }}>
                    Tap once to start recording. When you stop, the audio moves straight into the same study pipeline.
                  </p>
                  <button className="cta-button" onClick={startRecording}>
                    <Icon name="mic" size={18} />
                    Start recording
                  </button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div
              className="mini-paper"
              style={{
                marginTop: 16,
                background: "#fff0f0",
                borderColor: "var(--danger)",
                color: "var(--danger)",
              }}
            >
              {error}
            </div>
          )}

          <div className="mini-stat-grid" style={{ marginTop: 18 }}>
            <div className="mini-stat" style={{ background: "rgba(248, 230, 111, 0.42)" }}>
              <strong style={{ display: "block", fontSize: "1.6rem" }}>5</strong>
              <span style={{ color: "var(--ink-soft)" }}>Output types</span>
            </div>
            <div className="mini-stat" style={{ background: "rgba(105, 223, 240, 0.3)" }}>
              <strong style={{ display: "block", fontSize: "1.6rem" }}>1</strong>
              <span style={{ color: "var(--ink-soft)" }}>Shared workflow</span>
            </div>
            <div className="mini-stat" style={{ background: "rgba(245, 139, 192, 0.22)" }}>
              <strong style={{ display: "block", fontSize: "1.6rem" }}>RAG</strong>
              <span style={{ color: "var(--ink-soft)" }}>Grounded answers</span>
            </div>
            <div className="mini-stat" style={{ background: "rgba(141, 226, 184, 0.22)" }}>
              <strong style={{ display: "block", fontSize: "1.6rem" }}>AI</strong>
              <span style={{ color: "var(--ink-soft)" }}>Transcribe + generate</span>
            </div>
          </div>
        </aside>

        <div className="workspace-card">
          <div className="section-kicker">Your workspace</div>
          <h2 className="section-title">
            Five tools. One workflow. Zero stress.
          </h2>
          <p className="section-description">
            This is the live part of the product. Everything below is wired to your existing backend flow, so the redesign changes the experience without touching the business logic.
          </p>

          <div className="bento-grid">
            {FEATURE_CARDS.map((card) => (
              <article key={card.title} className={`bento-card ${card.accent} ${card.span}`}>
                <div className="eyebrow-index">{card.index}</div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <div className="mini-paper">
                  {card.preview.map((line) => (
                    <div key={line} style={{ fontWeight: 700, lineHeight: 1.6 }}>
                      {line}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-kicker">How it goes</div>
        <h2 className="section-title">Three steps. No BS.</h2>
        <div className="steps-grid">
          {STEPS.map((step, index) => (
            <article
              key={step.number}
              className="paper-card step-card"
              style={{
                background:
                  index === 0
                    ? "rgba(248, 230, 111, 0.32)"
                    : index === 1
                      ? "rgba(105, 223, 240, 0.2)"
                      : "rgba(245, 139, 192, 0.18)",
              }}
            >
              <div className="step-number">{step.number}</div>
              <h3 style={{ marginTop: 18, fontSize: "1.6rem", fontWeight: 800 }}>{step.title}</h3>
              <p style={{ marginTop: 12, color: "var(--ink-soft)", lineHeight: 1.6 }}>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-kicker">Receipts</div>
        <h2 className="section-title">What the kids say.</h2>
        <div className="quotes-grid">
          {QUOTES.map((quote) => (
            <article key={quote.author} className="quote-card">
              <div className="quote-mark">"</div>
              <p style={{ marginTop: 12, color: "var(--ink)", fontSize: "1.06rem", lineHeight: 1.65 }}>{quote.body}</p>
              <div style={{ marginTop: 18 }}>
                <strong>{quote.author}</strong>
                <div style={{ marginTop: 4, color: "var(--ink-soft)" }}>{quote.title}</div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="footer-banner hero-card">
        <div>
          <div className="section-kicker">Ready when you are</div>
          <h2 className="section-title">
            Stop re-watching. Start understanding.
          </h2>
          <p className="section-description" style={{ maxWidth: 540 }}>
            Free to start. Same backend. Better frontend. Your first lecture can go from raw audio to a study set in one clean flow.
          </p>
        </div>
        <div className="hero-actions" style={{ marginTop: 0 }}>
          <a className="cta-button" href="#workspace">
            <Icon name="upload" size={18} />
            Upload now
          </a>
          <button className="ghost-button" type="button" onClick={() => setActiveTab("record")}>
            <Icon name="mic" size={18} />
            Make recording
          </button>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-grid">
          <div>
            <div className="brand-lockup" style={{ fontSize: "1.6rem" }}>
              <span className="brand-mark" style={{ width: 40, height: 40 }}>
                <Icon name="spark" size={20} strokeWidth={2.4} />
              </span>
              <span>NoteSynth.</span>
            </div>
            <p style={{ marginTop: 16, color: "var(--ink-soft)", maxWidth: 360, lineHeight: 1.6 }}>
              Made for students who want one place for notes, cards, quizzes, and timestamped answers instead of five disconnected tools.
            </p>
          </div>
          <div>
            <h4>Stuff</h4>
            <ul>
              <li>Features</li>
              <li>Pricing</li>
              <li>Changelog</li>
            </ul>
          </div>
          <div>
            <h4>Team</h4>
            <ul>
              <li>About</li>
              <li>Blog</li>
              <li>Careers</li>
            </ul>
          </div>
          <div>
            <h4>Fine print</h4>
            <ul>
              <li>Privacy</li>
              <li>Terms</li>
              <li>Cookies</li>
            </ul>
          </div>
        </div>
      </footer>
    </>
  );
}
