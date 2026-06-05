"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { MoonIcon } from "./MoonIcon";
import { moonInsight } from "@/lib/moonInsight";

// Moon phase chip with a click-to-open timing tip. The popover is styled to
// match the Recharts tooltips below (white, hairline border, 8px radius).
export function MoonInfo({
  phase,
  illumination,
}: {
  phase: string;
  illumination: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <span
      ref={ref}
      className="relative flex items-center gap-1 font-medium normal-case text-ink-2"
    >
      <MoonIcon illumination={illumination} />
      {phase} · {illumination}%
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Moon timing tip"
        aria-expanded={open}
        className="text-brand transition hover:text-brand-strong"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span className="absolute left-0 top-full z-30 mt-1 w-64 rounded-lg border border-line bg-surface p-2.5 text-xs font-normal leading-snug text-ink shadow-lg">
          {moonInsight(illumination)}
        </span>
      )}
    </span>
  );
}
