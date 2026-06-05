"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Checking the wind & waves…",
  "Reading the tides…",
  "Scouting nearby reefs & structure…",
  "Finding fish recorded in the area…",
  "Reading the moon…",
  "Putting your day together…",
];

function Fish({
  top,
  duration,
  delay,
  color,
  size,
}: {
  top: string;
  duration: number;
  delay: number;
  color: string;
  size: number;
}) {
  return (
    <div
      className="absolute"
      style={{
        top,
        left: 0,
        animation: `fw-swim ${duration}s linear ${delay}s infinite`,
      }}
    >
      <div style={{ animation: `fw-bob ${duration / 6}s ease-in-out infinite` }}>
        <svg width={size} height={size * 0.6} viewBox="0 0 40 24" aria-hidden="true">
          <path d="M2 12 L12 4 L12 20 Z" fill={color} opacity="0.85" />
          <ellipse cx="22" cy="12" rx="14" ry="8" fill={color} />
          <circle cx="30" cy="10" r="1.6" fill="#fff" />
        </svg>
      </div>
    </div>
  );
}

function Bubble({ left, delay }: { left: string; delay: number }) {
  return (
    <div
      className="absolute bottom-6 h-2 w-2 rounded-full bg-white/50"
      style={{ left, animation: `fw-bubble 3s ease-in ${delay}s infinite` }}
    />
  );
}

export function LoadingSplash({ onCancel }: { onCancel: () => void }) {
  const [msg, setMsg] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setMsg((m) => (m + 1) % MESSAGES.length), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-[#2a6db5] to-[#0d3b66]">
        <Fish top="20%" duration={9} delay={0} color="#ffd166" size={44} />
        <Fish top="45%" duration={12} delay={1.5} color="#ef6f6c" size={32} />
        <Fish top="62%" duration={7.5} delay={0.6} color="#9ad1d4" size={52} />
        <Fish top="78%" duration={14} delay={2.4} color="#f4a261" size={28} />
        {["12%", "28%", "55%", "73%", "88%"].map((l, i) => (
          <Bubble key={l} left={l} delay={i * 0.5} />
        ))}
      </div>
      <p className="mt-4 text-sm font-medium text-ink-2">{MESSAGES[msg]}</p>
      <button
        type="button"
        onClick={onCancel}
        className="mt-4 rounded-full border border-line bg-surface px-4 py-1.5 text-xs font-semibold text-ink-2 transition hover:border-brand hover:text-brand"
      >
        Back to planning
      </button>
    </div>
  );
}
