"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { uploadAudio, uploadRecording, Job } from "@/lib/api";

interface Props {
  onJobCreated: (job: Job) => void;
}

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
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const job = await uploadAudio(file);
      onJobCreated(job);
    } catch (e: any) {
      setError(e.message || "Upload failed");
      setUploading(false);
    }
  }, [onJobCreated]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recordingChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data);
      };
      mr.start(100);
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (e) {
      setError("Microphone access denied");
    }
  };

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) return;
    
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    
    await new Promise<void>((resolve) => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = () => resolve();
      } else resolve();
    });

    const blob = new Blob(recordingChunksRef.current, { type: "audio/webm" });
    setUploading(true);
    setError(null);
    try {
      const job = await uploadRecording(blob);
      onJobCreated(job);
    } catch (e: any) {
      setError(e.message || "Recording upload failed");
      setUploading(false);
    }
  }, [onJobCreated]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const features = [
    { icon: "🎙️", title: "Accurate Transcription", desc: "Whisper AI with word-level timestamps" },
    { icon: "🧠", title: "Smart RAG Retrieval", desc: "Semantic search for grounded outputs" },
    { icon: "📝", title: "5 Output Types", desc: "Notes, Summary, Flashcards, MCQs, Q&A" },
    { icon: "🔗", title: "Source Citations", desc: "Every fact traced back to timestamp" },
  ];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "3rem 2rem" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: "3.5rem" }} className="fade-up">
        <div
          style={{
            display: "inline-block",
            padding: "6px 16px",
            borderRadius: "100px",
            background: "rgba(108, 99, 255, 0.12)",
            border: "1px solid rgba(108, 99, 255, 0.25)",
            color: "var(--accent-electric)",
            fontFamily: "var(--font-mono)",
            fontSize: "0.78rem",
            fontWeight: 500,
            marginBottom: "1.5rem",
            letterSpacing: "0.05em",
          }}
        >
          ✦ AI-POWERED STUDY TOOL
        </div>

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: "1.25rem",
            letterSpacing: "-0.02em",
          }}
        >
          <span style={{ color: "var(--text-primary)" }}>Turn lectures into</span>
          <br />
          <span
            style={{
              background: "linear-gradient(135deg, var(--accent-electric), var(--accent-teal))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            structured knowledge
          </span>
        </h1>

        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "1.1rem",
            lineHeight: 1.6,
            maxWidth: 560,
            margin: "0 auto",
          }}
        >
          Upload any lecture audio and get AI-generated notes, summaries, flashcards, MCQs,
          and Q&A — all cited back to exact timestamps.
        </p>
      </div>

      {/* Tab selector */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "1.5rem",
          justifyContent: "center",
        }}
      >
        {(["upload", "record"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`tab-btn ${activeTab === tab ? "active" : ""}`}
          >
            {tab === "upload" ? "📁 Upload File" : "🎙️ Record Audio"}
          </button>
        ))}
      </div>

      {/* Upload/Record Area */}
      {activeTab === "upload" ? (
        <div
          className={`upload-zone ${isDragOver ? "drag-over" : ""}`}
          style={{
            padding: "4rem 2rem",
            textAlign: "center",
            position: "relative",
            marginBottom: "1rem",
          }}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.m4a,.wav,.webm,.ogg,.flac,.mp4"
            style={{ display: "none" }}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          {uploading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  border: "3px solid var(--border-medium)",
                  borderTopColor: "var(--accent-electric)",
                }}
                className="spin"
              />
              <p style={{ color: "var(--text-secondary)", fontFamily: "var(--font-display)", fontWeight: 600 }}>
                Uploading & starting analysis...
              </p>
            </div>
          ) : (
            <>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "20px",
                  background: "rgba(108, 99, 255, 0.1)",
                  border: "1px solid rgba(108, 99, 255, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1.5rem",
                  fontSize: "2rem",
                }}
              >
                🎵
              </div>

              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  marginBottom: "0.5rem",
                  color: "var(--text-primary)",
                }}
              >
                Drop your lecture here
              </h2>
              <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
                or click to browse your files
              </p>

              <div
                style={{
                  display: "inline-flex",
                  gap: "8px",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {[".mp3", ".m4a", ".wav", ".flac", ".webm"].map((ext) => (
                  <span
                    key={ext}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.75rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {ext}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div
          className="glass-card"
          style={{
            padding: "3rem 2rem",
            textAlign: "center",
            marginBottom: "1rem",
          }}
        >
          {isRecording ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: "var(--accent-rose)",
                  }}
                  className="record-pulse"
                />
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-rose)", fontWeight: 500 }}>
                  RECORDING
                </span>
              </div>

              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "3rem",
                  fontWeight: 300,
                  color: "var(--text-primary)",
                  letterSpacing: "0.05em",
                }}
              >
                {formatTime(recordingTime)}
              </div>

              {/* Waveform */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px", height: "40px" }}>
                {Array.from({ length: 16 }).map((_, i) => (
                  <div
                    key={i}
                    className="waveform-bar"
                    style={{
                      height: `${20 + Math.random() * 30}px`,
                      animationDelay: `${i * 0.075}s`,
                    }}
                  />
                ))}
              </div>

              <button
                onClick={stopRecording}
                style={{
                  padding: "14px 32px",
                  borderRadius: "12px",
                  background: "var(--accent-rose)",
                  border: "none",
                  color: "white",
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "1rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                ⏹ Stop & Process
              </button>
            </div>
          ) : uploading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  border: "3px solid var(--border-medium)",
                  borderTopColor: "var(--accent-electric)",
                }}
                className="spin"
              />
              <p style={{ color: "var(--text-secondary)", fontFamily: "var(--font-display)", fontWeight: 600 }}>
                Processing recording...
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "rgba(255, 107, 138, 0.1)",
                  border: "2px solid rgba(255, 107, 138, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onClick={startRecording}
              >
                🎙️
              </div>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.2rem" }}>
                Record a lecture
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", maxWidth: 360 }}>
                Click the microphone to start recording. Press stop when done.
              </p>
              <button
                onClick={startRecording}
                style={{
                  padding: "12px 28px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, var(--accent-rose), #e054a0)",
                  border: "none",
                  color: "white",
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                }}
              >
                ● Start Recording
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            marginBottom: "1.5rem",
            padding: "12px 16px",
            borderRadius: "10px",
            background: "rgba(255, 107, 138, 0.1)",
            border: "1px solid rgba(255, 107, 138, 0.25)",
            color: "var(--accent-rose)",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Features grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginTop: "3rem",
        }}
      >
        {features.map((f, i) => (
          <div
            key={i}
            className="glass-card fade-up"
            style={{
              padding: "1.25rem",
              animationDelay: `${0.1 + i * 0.08}s`,
              animationFillMode: "both",
            }}
          >
            <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>{f.icon}</div>
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "0.9rem",
                marginBottom: "0.35rem",
                color: "var(--text-primary)",
              }}
            >
              {f.title}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", lineHeight: 1.5 }}>
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
