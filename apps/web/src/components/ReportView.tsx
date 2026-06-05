import { FishingDayReport } from "@/types/fishingDayReport";
import { DayCard } from "./DayCard";
import { SpotsExplorer } from "./SpotsExplorer";
import { SpeciesChips } from "./SpeciesChips";
import { SpeciesProfiles } from "./SpeciesProfiles";
import { SuggestionPanel } from "./SuggestionPanel";
import { McpCallout } from "./McpCallout";

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function ReportView({ reports }: { reports: FishingDayReport[] }) {
  const first = reports[0];
  if (!first) return null;

  const targetSpecies = Array.from(
    new Set(reports.flatMap((report) => report.suggestion.targetSpecies))
  );

  return (
    <section className="space-y-6">
      <div className="text-sm text-ink-2">
        Showing {reports.length} day{reports.length > 1 ? "s" : ""} for{" "}
        <span className="font-semibold text-ink">
          {first.location.name}, {first.location.state}
        </span>{" "}
        · station {first.station}
      </div>

      {/* 1. Day metrics (conditions, tides, wind, waves). */}
      <div className="space-y-6">
        {reports.map((report) => (
          <DayCard key={report.date} report={report} />
        ))}
      </div>

      {/* 2. Area map of nearby spots & structures. */}
      {first.reefs.length > 0 && (
        <SpotsExplorer center={first.location} spots={first.reefs} />
      )}

      {/* 3. Fish: profiles + the full species list. */}
      <SpeciesProfiles profiles={first.speciesProfiles} />
      <SpeciesChips species={first.species} highlight={targetSpecies} />

      {/* 4. Suggested plan(s) for the day(s). */}
      <div className="space-y-3">
        {reports.map((report) => (
          <div key={report.date} className="space-y-2">
            {reports.length > 1 && (
              <h3 className="text-sm font-semibold text-ink">
                {formatDate(report.date)}
              </h3>
            )}
            <SuggestionPanel suggestion={report.suggestion} />
          </div>
        ))}
      </div>

      <McpCallout />
    </section>
  );
}
