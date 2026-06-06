import {
  FishRulesRegulationDetail,
  FishRulesSeason,
} from "../types/fishRules";
import { RegulationSeason, SeasonStatus } from "../types/speciesProfile";

// Fish Rules `seasons` are OPEN-harvest windows. A species is harvestable today
// when it is not prohibited and either has no listed closures or falls inside an
// open window right now. Windows with `repeat` recur every year.

/** Parse Fish Rules' "YYYY-MM-DD HH:mm:ss.uuuuuu" (UTC) into a Date. */
function parseFishRulesDate(raw: string | undefined | null): Date | null {
  if (!raw) return null;
  // Keep the date+time, drop sub-second precision, mark UTC.
  const iso = `${raw.slice(0, 19).replace(" ", "T")}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Month-day ordinal (1..1231) for annual comparisons, ignoring the year. */
function monthDayOrdinal(d: Date): number {
  return (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

function isWithinSeason(season: FishRulesSeason, now: Date): boolean {
  const start = parseFishRulesDate(season.starts_at?.date);
  const end = parseFishRulesDate(season.ends_at?.date);
  if (!start || !end) return true; // open-ended window → treat as open.

  if (!season.repeat) {
    return now >= start && now <= end;
  }

  // Annual window: compare by month/day, allowing a window that wraps the new
  // year (e.g. open Nov 1 → Feb 28).
  const cur = monthDayOrdinal(now);
  const a = monthDayOrdinal(start);
  const b = monthDayOrdinal(end);
  return a <= b ? cur >= a && cur <= b : cur >= a || cur <= b;
}

/** Decide harvest availability for `now` from a Fish Rules detail record. */
export function resolveSeasonStatus(
  detail: Pick<FishRulesRegulationDetail, "prohibited" | "no_closures" | "seasons">,
  now: Date
): SeasonStatus {
  if ((detail.prohibited ?? 0) === 1) return "prohibited";
  if ((detail.no_closures ?? 0) === 1) return "open";

  const seasons = detail.seasons ?? [];
  if (seasons.length === 0) return "open"; // no closures listed → open.

  return seasons.some((s) => isWithinSeason(s, now)) ? "open" : "out-of-season";
}

/** Normalize raw Fish Rules seasons into the public RegulationSeason shape. */
export function toRegulationSeasons(
  seasons: FishRulesSeason[] | undefined
): RegulationSeason[] {
  return (seasons ?? []).map((s) => {
    const start = parseFishRulesDate(s.starts_at?.date);
    const end = parseFishRulesDate(s.ends_at?.date);
    return {
      startsAt: start ? start.toISOString().slice(0, 10) : null,
      endsAt: end ? end.toISOString().slice(0, 10) : null,
      repeatsAnnually: !!s.repeat,
      ...(s.description ? { description: s.description } : {}),
    };
  });
}
