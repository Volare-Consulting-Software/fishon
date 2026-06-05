import type { ForecastRow } from "@volare-consulting/fishweather-forecast";
import { Navigation, Waves } from "lucide-react";

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

// A compact wind + wave readout for one period (AM/PM). The arrow points in the
// direction the wind blows toward (windDirDeg is where it blows FROM).
export function WindWaveGauge({ row }: { row: ForecastRow }) {
  const label = row.period === "AM" ? "Morning · ~9 AM" : "Afternoon · ~3 PM";

  if (!isCaptured(row)) {
    return (
      <div className="rounded-lg border border-line bg-surface p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">
          {label}
        </div>
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
      <div className="flex items-center gap-3">
        <Navigation
          className="h-5 w-5 text-brand"
          style={{ transform: `rotate(${row.windDirDeg + 180}deg)` }}
        />
        <div className="text-sm">
          <div className="font-semibold text-ink">
            {row.windSpeed} mph <span className="text-ink-3">g{row.gust}</span>
          </div>
          <div className="text-xs text-ink-2">from {row.windDirCompass}</div>
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
