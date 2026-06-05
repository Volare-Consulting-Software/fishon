import type { ForecastRow } from "@volare-consulting/fishon";
import { Navigation, Waves } from "lucide-react";
import { MoonInfo } from "./MoonInfo";

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
// carries the previous night's moon — kept on the title line (with the timing
// tip behind an info icon) so the two cards stay the same height.
interface WindWaveGaugeProps {
  row: ForecastRow;
  moon?: { phase: string; illumination: number };
  // When NOAA hourly wind is available we source the gauge wind from it too, so
  // it agrees with the hourly wind chart (instead of fishweather's reading).
  wind?: { speed: number; gust: number | null; dirDeg: number; dirCompass: string };
}

export function WindWaveGauge({
  row,
  moon,
  wind,
}: WindWaveGaugeProps) {
  const label = row.period === "AM" ? "Morning · ~9 AM" : "Afternoon · ~3 PM";
  const w = wind ?? {
    speed: row.windSpeed,
    gust: row.gust,
    dirDeg: row.windDirDeg,
    dirCompass: row.windDirCompass,
  };

  const header = (
    <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold uppercase tracking-wide text-ink-3">
      <span>{label}</span>
      {moon && moon.phase && (
        <MoonInfo phase={moon.phase} illumination={moon.illumination} />
      )}
    </div>
  );

  if (!isCaptured(row)) {
    return (
      <div className="rounded-lg border border-line bg-surface p-3">
        {header}
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
      {header}
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
