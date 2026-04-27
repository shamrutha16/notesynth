"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Icon from "./Icon";

type Message = {
  id: string;
  role: "bot" | "user";
  text: string;
};

const FAQS = [
  {
    match: ["what does this app do", "what is this", "what does notesynth do"],
    answer:
      "NoteSynth turns lecture audio into usable study material. Upload a file or record live, then it generates notes, summaries, flashcards, MCQs, and Q&A with timestamps tied back to the source audio.",
  },
  {
    match: ["how do i use", "how to use", "how does this work"],
    answer:
      "Start on the upload workspace, choose a file or record audio, then let the pipeline process it. Once the job finishes, you can switch between notes, summary, flashcards, MCQs, and Q&A from the results dashboard.",
  },
  {
    match: ["upload", "supported file", "file types"],
    answer:
      "You can upload common lecture formats like MP3, M4A, WAV, FLAC, WEBM, OGG, and MP4 audio. Drag and drop works, and the recorder is there for quick capture on desktop or mobile.",
  },
  {
    match: ["dashboard", "navigate", "results"],
    answer:
      "The results area is organized by output type. The left side keeps job context and transcript stats, while the main panel lets you switch between notes, summary, flashcards, MCQs, and timestamped Q&A.",
  },
  {
    match: ["pricing", "plans", "cost"],
    answer:
      "Pricing is still a placeholder in this build. Right now the product message is free-to-start, and the UI is ready for a future plans page or billing integration when you want to add one.",
  },
  {
    match: ["support", "contact", "help"],
    answer:
      "For now, support routes through the in-app feedback panel. You can leave a rating and a message there, and the component is structured so you can later wire it to email, a CRM, or a support inbox.",
  },
  {
    match: ["not working", "error", "troubleshoot", "problem"],
    answer:
      "If something feels off, try a fresh upload, check microphone permissions for recording, and confirm your backend API URL is set correctly. If the issue persists, leave a feedback note with the steps you took so it is easier to trace.",
  },
];

const STARTER_MESSAGES: Message[] = [
  {
    id: "welcome",
    role: "bot",
    text: "Hey - I can answer basic NoteSynth questions about uploads, navigation, outputs, pricing placeholders, and support.",
  },
];

const QUICK_PROMPTS = [
  "What does this app do?",
  "How do I upload a lecture?",
  "How do I use the dashboard?",
  "How do flashcards and MCQs work?",
];

function getReply(input: string): string {
  const normalized = input.toLowerCase().trim();
  const hit = FAQS.find((faq) => faq.match.some((phrase) => normalized.includes(phrase)));
  if (hit) return hit.answer;
  return "I can help with uploads, recording, dashboard navigation, notes, flashcards, MCQs, Q&A, support, and placeholder pricing. Try asking one of the quick prompts below.";
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(STARTER_MESSAGES);
  const [typing, setTyping] = useState<string | null>(null);

  const quickPrompts = useMemo(() => QUICK_PROMPTS, []);

  useEffect(() => {
    if (!typing) return;
    const target = typing;
    let index = 0;
    const id = window.setInterval(() => {
      index += 1;
      setMessages((prev) => {
        const rest = prev.filter((message) => message.id !== "typing");
        return [
          ...rest,
          {
            id: "typing",
            role: "bot",
            text: target.slice(0, index),
          },
        ];
      });
      if (index >= target.length) {
        window.clearInterval(id);
        setMessages((prev) =>
          prev.map((message) =>
            message.id === "typing" ? { ...message, id: `bot-${Date.now()}` } : message,
          ),
        );
        setTyping(null);
      }
    }, 18);

    return () => window.clearInterval(id);
  }, [typing]);

  const sendMessage = (text: string) => {
    const value = text.trim();
    if (!value || typing) return;

    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: "user", text: value }]);
    setInput("");

    window.setTimeout(() => {
      setTyping(getReply(value));
    }, 180);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {open && (
        <div className="chat-panel slide-in">
          <div className="panel-header">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800 }}>
                <Icon name="chat" size={18} />
                Study Buddy
              </div>
              <p style={{ marginTop: 4, color: "var(--ink-soft)", fontSize: "0.9rem" }}>
                Quick product help, without leaving the page.
              </p>
            </div>
            <button className="icon-button" onClick={() => setOpen(false)} aria-label="Close chat">
              <Icon name="close" size={16} />
            </button>
          </div>

          <div className="panel-body">
            <div className="chat-log">
              {messages.map((message) => (
                <div key={message.id} className={`message ${message.role}`}>
                  {message.text}
                </div>
              ))}
            </div>

            <div className="quick-prompts">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  className="chip-button"
                  type="button"
                  onClick={() => sendMessage(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, marginTop: 16 }}>
              <input
                className="chat-input"
                placeholder="Ask about uploads, notes, Q&A, support..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
              <button className="icon-button" type="submit" aria-label="Send question">
                <Icon name="send" size={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="chat-launcher">
        <button className="floating-button" onClick={() => setOpen((value) => !value)}>
          <Icon name="chat" size={18} />
          {open ? "Hide Chat" : "Ask NoteSynth"}
        </button>
      </div>
    </>
  );
}
