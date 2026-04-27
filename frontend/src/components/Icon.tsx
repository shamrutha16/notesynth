"use client";

type IconName =
  | "spark"
  | "arrow"
  | "upload"
  | "mic"
  | "notes"
  | "cards"
  | "quiz"
  | "chat"
  | "check"
  | "close"
  | "star"
  | "mail"
  | "user"
  | "send"
  | "refresh"
  | "menu";

const PATHS: Record<IconName, JSX.Element> = {
  spark: (
    <>
      <path d="M12 2.5l1.8 5.2L19 9.5l-5.2 1.8L12 16.5l-1.8-5.2L5 9.5l5.2-1.8L12 2.5z" />
      <path d="M19.5 16l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  upload: (
    <>
      <path d="M12 16V5" />
      <path d="M8 9l4-4 4 4" />
      <path d="M5 19h14" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3.5" width="6" height="11" rx="3" />
      <path d="M6 11.5a6 6 0 0 0 12 0M12 17.5v3" />
    </>
  ),
  notes: (
    <>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </>
  ),
  cards: (
    <>
      <rect x="5" y="7" width="10" height="10" rx="2" />
      <path d="M9 7V5h8a2 2 0 0 1 2 2v8h-2" />
    </>
  ),
  quiz: (
    <>
      <path d="M8 8h11" />
      <path d="M8 12h7" />
      <path d="M8 16h10" />
      <circle cx="4.5" cy="8" r="1.25" />
      <circle cx="4.5" cy="12" r="1.25" />
      <circle cx="4.5" cy="16" r="1.25" />
    </>
  ),
  chat: (
    <>
      <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6A2.5 2.5 0 0 1 16.5 15H11l-4 3v-3H7.5A2.5 2.5 0 0 1 5 12.5v-6z" />
      <path d="M8.5 9h7" />
    </>
  ),
  check: <path d="M5 12.5l4 4 10-10" />,
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  star: <path d="M12 3.5l2.7 5.4 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.8l6-.9L12 3.5z" />,
  mail: (
    <>
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <path d="M5 7l7 6 7-6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3" />
      <path d="M6 19a6 6 0 0 1 12 0" />
    </>
  ),
  send: (
    <>
      <path d="M21 3L10 14" />
      <path d="M21 3l-7 18-4-7-7-4 18-7z" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 1 0 2 5.3" />
      <path d="M20 5v6h-6" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
};

export default function Icon({
  name,
  size = 20,
  strokeWidth = 2.2,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
