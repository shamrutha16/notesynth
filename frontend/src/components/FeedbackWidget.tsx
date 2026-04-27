"use client";

import { FormEvent, useEffect, useState } from "react";
import Icon from "./Icon";

type Toast = {
  id: string;
  tone: "success" | "error";
  text: string;
};

type FeedbackEntry = {
  id: string;
  name: string;
  email: string;
  rating: number;
  message: string;
  createdAt: string;
};

const STORAGE_KEY = "notesynth-feedback";

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== toast.id));
      }, 3000),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [toasts]);

  const showToast = (tone: Toast["tone"], text: string) => {
    setToasts((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, tone, text }]);
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setRating(0);
    setMessage("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedMessage = message.trim();
    const trimmedEmail = email.trim();

    if (rating < 1 || rating > 5) {
      showToast("error", "Please choose a rating before sending feedback.");
      return;
    }

    if (trimmedMessage.length < 8) {
      showToast("error", "A little more detail helps - please write at least 8 characters.");
      return;
    }

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      showToast("error", "That email address looks off. Please double-check it.");
      return;
    }

    const entry: FeedbackEntry = {
      id: `feedback-${Date.now()}`,
      name: name.trim(),
      email: trimmedEmail,
      rating,
      message: trimmedMessage,
      createdAt: new Date().toISOString(),
    };

    try {
      const existing = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      const records = existing ? (JSON.parse(existing) as FeedbackEntry[]) : [];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([entry, ...records].slice(0, 50)));
      showToast("success", "Thanks - your feedback was saved.");
      resetForm();
      setOpen(false);
    } catch {
      showToast("error", "Could not save feedback locally on this device.");
    }
  };

  return (
    <>
      <div className="toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.tone} fade-in-up`}>
            <strong>{toast.tone === "success" ? "Saved" : "Heads up"}</strong>
            <p style={{ marginTop: 4, color: "var(--ink-soft)" }}>{toast.text}</p>
          </div>
        ))}
      </div>

      {open && (
        <div className="feedback-panel slide-in">
          <div className="panel-header">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800 }}>
                <Icon name="star" size={18} />
                Feedback
              </div>
              <p style={{ marginTop: 4, color: "var(--ink-soft)", fontSize: "0.9rem" }}>
                Quick product notes, feature ideas, or rough edges.
              </p>
            </div>
            <button className="icon-button" onClick={() => setOpen(false)} aria-label="Close feedback">
              <Icon name="close" size={16} />
            </button>
          </div>

          <form className="panel-body" onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
            <div className="input-grid" style={{ marginTop: 0 }}>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 700 }}>Name</span>
                <div style={{ position: "relative" }}>
                  <input
                    className="feedback-input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Optional"
                  />
                  <span style={{ position: "absolute", right: 16, top: 16, color: "var(--ink-soft)" }}>
                    <Icon name="user" size={16} />
                  </span>
                </div>
              </label>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 700 }}>Email</span>
                <div style={{ position: "relative" }}>
                  <input
                    className="feedback-input"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Optional"
                  />
                  <span style={{ position: "absolute", right: 16, top: 16, color: "var(--ink-soft)" }}>
                    <Icon name="mail" size={16} />
                  </span>
                </div>
              </label>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <span style={{ fontWeight: 700 }}>Rating</span>
              <div className="star-row">
                {Array.from({ length: 5 }).map((_, index) => {
                  const value = index + 1;
                  return (
                    <button
                      key={value}
                      className={`star-button ${rating >= value ? "active" : ""}`}
                      type="button"
                      onClick={() => setRating(value)}
                      aria-label={`Rate ${value} stars`}
                    >
                      <Icon name="star" size={18} />
                    </button>
                  );
                })}
              </div>
            </div>

            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ fontWeight: 700 }}>Message</span>
              <textarea
                className="feedback-textarea"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="What felt great, what felt confusing, or what should we add next?"
              />
            </label>

            <button className="cta-button" type="submit">
              <Icon name="send" size={18} />
              Send Feedback
            </button>
          </form>
        </div>
      )}

      <div className="feedback-launcher">
        <button className="floating-button" onClick={() => setOpen((value) => !value)}>
          <Icon name="star" size={18} />
          {open ? "Hide Feedback" : "Leave Feedback"}
        </button>
      </div>
    </>
  );
}
