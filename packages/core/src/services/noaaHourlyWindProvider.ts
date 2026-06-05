import { inject, injectable } from "tsyringe";
import {
  TOKENS,
  IHttpClient,
  ILogger,
  IMarineHourlyProvider,
} from "../interfaces";
import { ForecastServiceConfig } from "../config";
import { HourlyWindPoint, HourlyWindResult } from "../types/hourlyWind";

interface PointsResponse {
  properties?: {
    gridId?: string;
    gridX?: number;
    gridY?: number;
    timeZone?: string;
  };
}
interface GridValue {
  validTime: string;
  value: number | null;
}
interface GridProperty {
  uom?: string;
  values?: GridValue[];
}
interface GridResponse {
  properties?: Record<string, GridProperty | unknown>;
}

const COMPASS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
] as const;

// Wind from the NWS gridpoint forecast. NDFD gives hourly-ish wind (~10-12
// points/day near-term), letting us draw a real intraday curve the AM/PM scrape
// can't. Wave height is intentionally NOT taken from here — NDFD gridpoints
// carry only ~1 wave value/day, so we keep fishweather's AM/PM wave instead.
@injectable()
export class NoaaHourlyWindProvider implements IMarineHourlyProvider {
  private cache = new Map<string, HourlyWindResult>();

  constructor(
    @inject(TOKENS.IHttpClient) private readonly httpClient: IHttpClient,
    @inject(TOKENS.ForecastServiceConfig) private readonly config: ForecastServiceConfig,
    @inject(TOKENS.ILogger) private readonly logger: ILogger
  ) {}

  async getHourlyWind(lat: number, lng: number): Promise<HourlyWindResult> {
    const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const empty: HourlyWindResult = { byDate: {}, timeZone: "UTC" };
    const headers = { "User-Agent": this.config.userAgent, Accept: "application/geo+json" };

    try {
      const point = await this.httpClient.get<PointsResponse>(
        `${this.config.weatherGovApiUrl}/points/${lat},${lng}`,
        headers
      );
      const props = point.properties;
      if (!props?.gridId || props.gridX === undefined || props.gridY === undefined) {
        return empty;
      }
      const timeZone = props.timeZone || "UTC";

      const grid = await this.httpClient.get<GridResponse>(
        `${this.config.weatherGovApiUrl}/gridpoints/${props.gridId}/${props.gridX},${props.gridY}`,
        headers
      );
      const gp = grid.properties ?? {};

      const speed = expand(prop(gp, "windSpeed"));
      const gust = expand(prop(gp, "windGust"));
      const dir = expand(prop(gp, "windDirection"));

      const byDate: Record<string, HourlyWindPoint[]> = {};
      for (const [ms, kmh] of speed) {
        if (kmh === null) continue;
        const { date, hour, time } = toLocal(ms, timeZone);
        const deg = dir.get(ms) ?? null;
        const point: HourlyWindPoint = {
          time,
          hour,
          windSpeed: round1(kmh * 0.621371),
          windGust: gust.get(ms) != null ? round1((gust.get(ms) as number) * 0.621371) : null,
          windDirDeg: deg,
          windDirCompass: deg === null ? null : COMPASS[Math.round(deg / 22.5) % 16]!,
        };
        (byDate[date] ??= []).push(point);
      }
      for (const day of Object.keys(byDate)) {
        byDate[day]!.sort((a, b) => a.hour - b.hour);
      }

      const result: HourlyWindResult = { byDate, timeZone };
      this.cache.set(key, result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`NOAA hourly wind failed: ${message}`);
      return empty;
    }
  }
}

function prop(gp: Record<string, unknown>, name: string): GridProperty {
  const p = gp[name];
  return (p && typeof p === "object" ? (p as GridProperty) : {}) ?? {};
}

// Expand each {validTime, value} interval ("2026-06-05T11:00:00+00:00/PT3H")
// into hourly UTC-epoch buckets, holding the value across the interval.
function expand(property: GridProperty): Map<number, number | null> {
  const out = new Map<number, number | null>();
  for (const entry of property.values ?? []) {
    const [startStr, duration] = entry.validTime.split("/");
    if (!startStr) continue;
    const start = new Date(startStr).getTime();
    if (Number.isNaN(start)) continue;
    const hours = durationHours(duration ?? "PT1H");
    for (let i = 0; i < hours; i++) {
      out.set(start + i * 3_600_000, entry.value);
    }
  }
  return out;
}

function durationHours(iso: string): number {
  const days = Number(iso.match(/P(?:.*?)(\d+)D/)?.[1] ?? 0);
  const hours = Number(iso.match(/T.*?(\d+)H/)?.[1] ?? 0);
  return Math.max(1, days * 24 + hours);
}

function toLocal(
  ms: number,
  timeZone: string
): { date: string; hour: number; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(ms));
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  let h = Number(map["hour"]);
  if (h === 24) h = 0;
  const minute = Number(map["minute"]);
  return {
    date: `${map["year"]}-${map["month"]}-${map["day"]}`,
    hour: h + minute / 60,
    time: `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
