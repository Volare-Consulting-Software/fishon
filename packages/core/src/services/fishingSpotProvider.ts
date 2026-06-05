import { inject, injectable } from "tsyringe";
import {
  TOKENS,
  IHttpClient,
  IGeocoder,
  ILogger,
  IFishingSpotProvider,
} from "../interfaces";
import { ForecastServiceConfig } from "../config";
import { FishingSpot, SpotKind } from "../types/fishingSpot";

const NAME_KEYS = ["reefname", "name", "sitename", "label", "site_name", "title"];
const DEPTH_KEYS = ["waterdepthfeet", "depth", "depthft", "depth_ft", "maxdepth"];
const MATERIAL_KEYS = ["reefcomposition", "material", "materials", "structure"];

interface ArcGisFeature {
  attributes?: Record<string, unknown>;
  geometry?: { x?: number; y?: number };
}
interface ArcGisResponse {
  features?: ArcGisFeature[];
}
interface OverpassElement {
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}
interface OverpassResponse {
  elements?: OverpassElement[];
}

const MAX_SPOTS = 25;

@injectable()
export class FishingSpotProvider implements IFishingSpotProvider {
  private cache = new Map<string, FishingSpot[]>();

  constructor(
    @inject(TOKENS.IGeocoder) private readonly geocoder: IGeocoder,
    @inject(TOKENS.IHttpClient) private readonly httpClient: IHttpClient,
    @inject(TOKENS.ForecastServiceConfig) private readonly config: ForecastServiceConfig,
    @inject(TOKENS.ILogger) private readonly logger: ILogger
  ) {}

  async getSpots(location: string, radiusMiles: number): Promise<FishingSpot[]> {
    const geo = await this.geocoder.geocode(location);
    const key = `${geo.lat.toFixed(2)},${geo.lng.toFixed(2)}:${radiusMiles}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const [reefs, structures] = await Promise.all([
      this.queryReefs(geo.lat, geo.lng, radiusMiles, geo.state),
      this.queryStructures(geo.lat, geo.lng, radiusMiles),
    ]);

    const spots = [...reefs, ...structures]
      .filter((s) => s.distanceMiles <= radiusMiles)
      .sort((a, b) => a.distanceMiles - b.distanceMiles)
      .slice(0, MAX_SPOTS);

    this.cache.set(key, spots);
    return spots;
  }

  private async queryReefs(
    lat: number,
    lng: number,
    radiusMiles: number,
    state: string
  ): Promise<FishingSpot[]> {
    const dLat = radiusMiles / 69;
    const dLng = radiusMiles / (69 * Math.cos((lat * Math.PI) / 180));
    const envelope = `${lng - dLng},${lat - dLat},${lng + dLng},${lat + dLat}`;
    const services = this.config.reefServices.filter(
      (s) => !s.state || s.state === state
    );

    const results = await Promise.all(
      services.map(async (service) => {
        const url =
          `${service.url}/query?geometry=${encodeURIComponent(envelope)}` +
          `&geometryType=esriGeometryEnvelope&inSR=4326&outSR=4326` +
          `&outFields=*&where=1%3D1&f=json`;
        try {
          const data = await this.httpClient.get<ArcGisResponse>(url, {
            "User-Agent": this.config.userAgent,
          });
          return (data.features ?? [])
            .map((f) => this.toReefSpot(f, lat, lng, service.source))
            .filter((s): s is FishingSpot => s !== null);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Reef service ${service.name} failed: ${message}`);
          return [];
        }
      })
    );
    return results.flat();
  }

  private toReefSpot(
    feature: ArcGisFeature,
    lat: number,
    lng: number,
    source: string
  ): FishingSpot | null {
    const attrs = this.lowerKeys(feature.attributes ?? {});
    const y = feature.geometry?.y;
    const x = feature.geometry?.x;
    if (typeof x !== "number" || typeof y !== "number") return null;

    const name = this.pick(attrs, NAME_KEYS) || "Artificial reef";
    const depth = this.pickNumber(attrs, DEPTH_KEYS);
    const material = this.pick(attrs, MATERIAL_KEYS);

    return {
      name: name.toLowerCase().includes("reef") ? name : `${name} reef`,
      kind: "Artificial Reef",
      lat: y,
      lng: x,
      distanceMiles: round1(haversineMiles(lat, lng, y, x)),
      ...(depth !== undefined ? { depthFeet: Math.round(depth) } : {}),
      ...(material ? { material } : {}),
      source,
    };
  }

  private async queryStructures(
    lat: number,
    lng: number,
    radiusMiles: number
  ): Promise<FishingSpot[]> {
    const r = Math.round(radiusMiles * 1609.34);
    const q =
      `[out:json][timeout:25];(` +
      `node["man_made"="pier"](around:${r},${lat},${lng});` +
      `way["man_made"="pier"](around:${r},${lat},${lng});` +
      `node["man_made"="breakwater"](around:${r},${lat},${lng});` +
      `way["man_made"="breakwater"](around:${r},${lat},${lng});` +
      `node["leisure"="fishing"](around:${r},${lat},${lng});` +
      `way["leisure"="fishing"](around:${r},${lat},${lng});` +
      `);out center tags;`;
    const url = `${this.config.overpassApiUrl}?data=${encodeURIComponent(q)}`;
    try {
      const data = await this.httpClient.get<OverpassResponse>(url, {
        "User-Agent": this.config.userAgent,
      });
      const spots: FishingSpot[] = [];
      for (const el of data.elements ?? []) {
        const name = el.tags?.["name"];
        if (!name) continue; // unnamed structures aren't useful to anglers
        const elLat = el.lat ?? el.center?.lat;
        const elLng = el.lon ?? el.center?.lon;
        if (elLat === undefined || elLng === undefined) continue;
        spots.push({
          name,
          kind: this.structureKind(el.tags ?? {}),
          lat: elLat,
          lng: elLng,
          distanceMiles: round1(haversineMiles(lat, lng, elLat, elLng)),
          source: "OpenStreetMap",
        });
      }
      // Dedupe by name+rounded position (ways + nodes can overlap).
      const seen = new Set<string>();
      return spots.filter((s) => {
        const k = `${s.name}@${s.lat.toFixed(3)},${s.lng.toFixed(3)}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Overpass structures query failed: ${message}`);
      return [];
    }
  }

  private structureKind(tags: Record<string, string>): SpotKind {
    if (tags["man_made"] === "breakwater") return "Jetty";
    if (tags["leisure"] === "fishing") return "Fishing Spot";
    return "Pier";
  }

  private lowerKeys(obj: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) out[k.toLowerCase()] = v;
    return out;
  }

  private pick(attrs: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const v = attrs[key];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  }

  private pickNumber(
    attrs: Record<string, unknown>,
    keys: string[]
  ): number | undefined {
    for (const key of keys) {
      const v = attrs[key];
      const n = typeof v === "number" ? v : parseFloat(String(v));
      if (Number.isFinite(n) && n > 0) return n;
    }
    return undefined;
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
