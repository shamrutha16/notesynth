import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NoteSynth - Audio lectures into notes, flashcards, MCQs and Q&A",
  description: "Upload or record a lecture and turn it into structured study materials with timestamped AI outputs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@500;700;800&family=Space+Grotesk:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
