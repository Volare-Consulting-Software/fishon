import type { HourlyWindPoint } from "@volare-consulting/fishon";
import { FishingDayReport } from "@/types/fishingDayReport";
import { WindWaveGauge } from "./WindWaveGauge";
import { DayCharts } from "./DayCharts";

// Nearest NOAA hourly point to a target hour (within 2h), so the gauge wind
// matches the hourly wind chart. Returns undefined if none is close enough.
function nearestWind(hourly: HourlyWindPoint[] | undefined, targetHour: number) {
  if (!hourly || hourly.length === 0) return undefined;
  let best = hourly[0]!;
  for (const p of hourly) {
    if (Math.abs(p.hour - targetHour) < Math.abs(best.hour - targetHour)) best = p;
  }
  if (Math.abs(best.hour - targetHour) > 2) return undefined;
  return {
    speed: best.windSpeed,
    gust: best.windGust,
    dirDeg: best.windDirDeg ?? 0,
    dirCompass: best.windDirCompass ?? "",
  };
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function DayCard({ report }: { report: FishingDayReport }) {
  return (
    <article className="rounded-xl border border-line bg-raised p-5 shadow-sm">
      <header className="mb-4">
        <h2 className="text-lg font-bold text-ink">{formatDate(report.date)}</h2>
      </header>

      {report.marineForecastAvailable ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {report.periods.map((row) => (
            <WindWaveGauge
              key={row.period}
              row={row}
              moon={
                row.period === "AM" && report.moonPhase
                  ? { phase: report.moonPhase, illumination: report.moonIllumination }
                  : undefined
              }
              wind={nearestWind(report.hourlyWind, row.period === "AM" ? 9 : 15)}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-info/30 bg-info/10 px-3 py-2 text-xs text-info">
          Detailed wind &amp; wave forecast for this date becomes available
          within about 7 days. Showing tides, spots, and species below.
        </p>
      )}

      <div className="mt-3">
        <DayCharts
          tides={report.tides}
          periods={report.allPeriods ?? report.periods}
          hourlyWind={report.hourlyWind}
        />
      </div>
    </article>
  );
}
