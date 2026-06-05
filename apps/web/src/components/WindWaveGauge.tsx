import type { ForecastRow } from "@volare-consulting/fishon";
import { Info, Navigation, Waves } from "lucide-react";
import { MoonIcon } from "./MoonIcon";
import { moonInsight } from "@/lib/moonInsight";

// A period with all-zero temp/wind/gust/wave wasn't calm — fishweather hadn't
// captured that window (e.g. a morning that already passed). Show that plainly
// instead of misleading zeros.
function isCaptured(row: ForecastRow): boolean {
  return !(
    row.tempF === 0 &&
    row.windSpeed === 0 &&
    row.gust === 0 &&
    row.waveHeight === 0
  );
}

// A compact wind + wave readout for one period (AM/PM). The morning card also
// carries the previous night's moon, since that drives the morning bite timing.
export function WindWaveGauge({
  row,
  moon,
  wind,
}: {
  row: ForecastRow;
  moon?: { phase: string; illumination: number };
  // When NOAA hourly wind is available we source the gauge wind from it too, so
  // it agrees with the hourly wind chart (instead of fishweather's reading).
  wind?: { speed: number; gust: number | null; dirDeg: number; dirCompass: string };
}) {
  const label = row.period === "AM" ? "Morning · ~9 AM" : "Afternoon · ~3 PM";
  const w = wind ?? {
    speed: row.windSpeed,
    gust: row.gust,
    dirDeg: row.windDirDeg,
    dirCompass: row.windDirCompass,
  };

  const moonBlock =
    moon && moon.phase ? (
      <div className="mb-2 rounded-md border border-line bg-sunken px-2 py-1.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
          <MoonIcon illumination={moon.illumination} />
          {moon.phase} · {moon.illumination}%
        </div>
        <p className="mt-1 flex items-start gap-1 text-[11px] text-ink-3">
          <Info className="mt-0.5 h-3 w-3 shrink-0 text-brand" />
          <span>{moonInsight(moon.illumination)}</span>
        </p>
      </div>
    ) : null;

  if (!isCaptured(row)) {
    return (
      <div className="rounded-lg border border-line bg-surface p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">
          {label}
        </div>
        {moonBlock}
        <p className="text-xs text-ink-3">
          Not captured for this window — fishweather hadn&apos;t posted a reading
          here (often a window that has already passed).
        </p>
      </div>
    );
  }

  const waveColor =
    row.waveHeight >= 4
      ? "text-error"
      : row.waveHeight >= 2.5
        ? "text-warning"
        : "text-info";
  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">
        {label}
      </div>
      {moonBlock}
      <div className="flex items-center gap-3">
        <Navigation
          className="h-5 w-5 text-brand"
          style={{ transform: `rotate(${w.dirDeg + 180}deg)` }}
        />
        <div className="text-sm">
          <div className="font-semibold text-ink">
            {w.speed} mph{" "}
            {w.gust !== null && <span className="text-ink-3">g{w.gust}</span>}
          </div>
          <div className="text-xs text-ink-2">from {w.dirCompass}</div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Waves className={`h-4 w-4 ${waveColor}`} />
        <span className="text-xs text-ink-3">Waves</span>
        <span className={`text-sm font-semibold ${waveColor}`}>
          {row.waveHeight} ft
        </span>
        <span className="text-xs text-ink-3">
          · {row.tempF}°F · {row.cloudPct}% cloud · {row.precipPct}% rain
        </span>
      </div>
    </div>
  );
}
