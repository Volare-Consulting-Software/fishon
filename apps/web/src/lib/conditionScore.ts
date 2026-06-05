import type { ForecastRow } from "@volare-consulting/fishweather-forecast";
import { FishingMethod } from "@/types/fishingTripRequest";

interface MethodLimit {
  waveComfortFt: number;
  waveMaxFt: number;
  windComfortMph: number;
  windMaxMph: number;
}

// Comfort = penalties start; Max = explicit safety caution.
const METHOD_LIMITS: Record<FishingMethod, MethodLimit> = {
  shoreline: { waveComfortFt: 4, waveMaxFt: 8, windComfortMph: 15, windMaxMph: 30 },
  nearshore: { waveComfortFt: 2, waveMaxFt: 4, windComfortMph: 12, windMaxMph: 20 },
  offshore: { waveComfortFt: 3, waveMaxFt: 6, windComfortMph: 15, windMaxMph: 25 },
};

// "West is best, least is the east." Favorability 0 (worst) .. 1 (best).
const COMPASS_FAVORABILITY: Record<string, number> = {
  W: 1, WNW: 0.9, WSW: 0.9, NW: 0.8, SW: 0.8, NNW: 0.65, SSW: 0.65,
  N: 0.5, S: 0.5, NNE: 0.35, SSE: 0.35, NE: 0.25, SE: 0.25,
  ENE: 0.15, ESE: 0.15, E: 0,
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

export interface ConditionScore {
  score: number;
  cautions: string[];
}

// A transparent, deterministic conditions score used when no AI key is set (and
// as a sanity check on the AI). Higher is better.
export function scoreConditions(
  row: ForecastRow,
  method: FishingMethod
): ConditionScore {
  const limit = METHOD_LIMITS[method];
  const cautions: string[] = [];
  let score = 100;

  if (row.waveHeight > limit.waveComfortFt) {
    score -= (row.waveHeight - limit.waveComfortFt) * 12;
    if (row.waveHeight >= limit.waveMaxFt) {
      cautions.push(`${row.waveHeight} ft seas are rough for ${method} fishing`);
    }
  }

  if (row.windSpeed > limit.windComfortMph) {
    score -= (row.windSpeed - limit.windComfortMph) * 1.5;
    if (row.windSpeed >= limit.windMaxMph) {
      cautions.push(`${row.windSpeed} mph wind is strong for ${method}`);
    }
  }

  // Wind direction only matters once the wind is meaningful — an east wind on a
  // calm day shouldn't keep you home.
  const windFactor = clamp((row.windSpeed - 5) / 15, 0, 1);
  const favorability = COMPASS_FAVORABILITY[row.windDirCompass] ?? 0.5;
  score -= (1 - favorability) * windFactor * 25;
  if (favorability <= 0.25 && windFactor > 0.4) {
    cautions.push(
      `Wind out of the ${row.windDirCompass} ("least is the east") can slow the bite`
    );
  }

  if (row.precipPct >= 50) {
    score -= (row.precipPct - 50) * 0.4;
    cautions.push(`${row.precipPct}% rain chance`);
  }

  return { score: Math.max(0, Math.round(score)), cautions };
}
