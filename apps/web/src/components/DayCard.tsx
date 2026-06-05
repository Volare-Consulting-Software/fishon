import { Info } from "lucide-react";
import { FishingDayReport } from "@/types/fishingDayReport";
import { WindWaveGauge } from "./WindWaveGauge";
import { DayCharts } from "./DayCharts";
import { MoonIcon } from "./MoonIcon";
import { moonInsight } from "@/lib/moonInsight";

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
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-bold text-ink">{formatDate(report.date)}</h2>
        {report.moonPhase && (
          <div className="flex items-center gap-2 text-xs text-ink-2">
            <MoonIcon illumination={report.moonIllumination} />
            <span>
              {report.moonPhase} · {report.moonIllumination}%
            </span>
          </div>
        )}
      </header>

      {report.moonPhase && (
        <p className="mb-4 flex items-start gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
          <span>{moonInsight(report.moonIllumination)}</span>
        </p>
      )}

      {report.marineForecastAvailable ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {report.periods.map((row) => (
            <WindWaveGauge key={row.period} row={row} />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-info/30 bg-info/10 px-3 py-2 text-xs text-info">
          Detailed wind &amp; wave forecast for this date becomes available
          within about 7 days. Showing tides, moon, spots, and species below.
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
