const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface Job {
  job_id: string;
  filename: string;
  status: "pending" | "transcribing" | "embedding" | "generating" | "completed" | "failed";
  progress: number;
  message: string;
  created_at: string;
  updated_at: string;
  transcript_available: boolean;
  duration_seconds?: number;
  chunk_count?: number;
  outputs: Record<string, boolean>;
  error?: string;
}

export interface StudyNote {
  id: string;
  title: string;
  content: string;
  source_timestamps: Array<{ start: number; end: number }>;
  subsection?: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  source_timestamps: Array<{ start: number; end: number }>;
  difficulty: "easy" | "medium" | "hard";
}

export interface MCQOption {
  id: string;
  text: string;
}

export interface MCQ {
  id: string;
  question: string;
  options: MCQOption[];
  correct_answer: string;
  explanation: string;
  source_timestamps: Array<{ start: number; end: number }>;
}

export interface QAPair {
  id: string;
  question: string;
  answer: string;
  source_timestamps: Array<{ start: number; end: number }>;
}

export interface GeneratedOutput {
  output_type: string;
  job_id: string;
  created_at: string;
  notes?: StudyNote[];
  summary?: string;
  summary_timestamps?: Array<{ start: number; end: number }>;
  flashcards?: Flashcard[];
  mcqs?: MCQ[];
  qa_pairs?: QAPair[];
}

export async function uploadAudio(file: File): Promise<Job> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function uploadRecording(blob: Blob): Promise<Job> {
  const formData = new FormData();
  formData.append("file", blob, "recording.webm");
  const res = await fetch(`${API_BASE}/record`, { method: "POST", body: formData });
  if (!res.ok) throw new Error("Recording upload failed");
  return res.json();
}

export async function getJob(jobId: string): Promise<Job> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`);
  if (!res.ok) throw new Error("Failed to fetch job");
  return res.json();
}

export async function getTranscript(jobId: string) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/transcript`);
  if (!res.ok) return null;
  return res.json();
}

export async function getOutput(jobId: string, outputType: string): Promise<GeneratedOutput | null> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/output/${outputType}`);
  if (!res.ok) return null;
  return res.json();
}

export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
