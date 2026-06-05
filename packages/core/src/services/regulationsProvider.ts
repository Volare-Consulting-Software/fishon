import { inject, injectable } from "tsyringe";
import {
  TOKENS,
  IHttpClient,
  ILogger,
  ISpeciesRegulationsProvider,
  SpeciesNameRef,
} from "../interfaces";
import { ForecastServiceConfig } from "../config";
import { SpeciesRegulation } from "../types/speciesProfile";
import {
  FishRulesLocationResponse,
  FishRulesLocationEntry,
  FishRulesSpeciesResponse,
} from "../types/fishRules";

// Fish Rules is partner-gated (every uncached coordinate returns 401 without a
// client-id/api-key). We integrate behind FISHRULES_CLIENT_ID +
// FISHRULES_API_KEY env vars and degrade gracefully to an empty map otherwise,
// so the public site keeps working without anyone's credentials.
@injectable()
export class RegulationsProvider implements ISpeciesRegulationsProvider {
  private locationCache = new Map<string, FishRulesLocationEntry[]>();
  private detailCache = new Map<string, SpeciesRegulation | null>();

  constructor(
    @inject(TOKENS.IHttpClient) private readonly httpClient: IHttpClient,
    @inject(TOKENS.ForecastServiceConfig) private readonly config: ForecastServiceConfig,
    @inject(TOKENS.ILogger) private readonly logger: ILogger
  ) {}

  private credentials(): { clientId: string; apiKey: string } | null {
    const clientId = process.env["FISHRULES_CLIENT_ID"];
    const apiKey = process.env["FISHRULES_API_KEY"];
    return clientId && apiKey ? { clientId, apiKey } : null;
  }

  async getRegulations(
    species: SpeciesNameRef[],
    lat: number,
    lng: number
  ): Promise<Map<string, SpeciesRegulation>> {
    const result = new Map<string, SpeciesRegulation>();
    const creds = this.credentials();
    if (!creds) return result; // Fish Rules disabled — no keys configured.

    const headers = {
      "x-client-id": creds.clientId,
      "x-api-key": creds.apiKey,
      "User-Agent": this.config.userAgent,
    };

    const entries = await this.locationEntries(lat, lng, headers);
    if (entries.length === 0) return result;

    const index = this.buildIndex(entries);
    await Promise.all(
      species.map(async (ref) => {
        const entry = this.matchEntry(ref, index);
        if (!entry) return;
        const regulation = await this.speciesDetail(entry, lat, lng, headers);
        if (regulation) {
          result.set(ref.scientificName.toLowerCase(), regulation);
        }
      })
    );
    return result;
  }

  private async locationEntries(
    lat: number,
    lng: number,
    headers: Record<string, string>
  ): Promise<FishRulesLocationEntry[]> {
    const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    const cached = this.locationCache.get(key);
    if (cached) return cached;
    try {
      const data = await this.httpClient.get<FishRulesLocationResponse>(
        `${this.config.fishRulesApiUrl}/location/${lat}/${lng}`,
        headers
      );
      const entries = data.results ?? [];
      this.locationCache.set(key, entries);
      return entries;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Fish Rules location lookup failed: ${message}`);
      this.locationCache.set(key, []);
      return [];
    }
  }

  private buildIndex(
    entries: FishRulesLocationEntry[]
  ): Map<string, FishRulesLocationEntry> {
    const index = new Map<string, FishRulesLocationEntry>();
    for (const entry of entries) {
      for (const synonym of entry.synonyms ?? []) {
        index.set(synonym.toLowerCase(), entry);
      }
      index.set(this.normalizeCommon(entry.species), entry);
    }
    return index;
  }

  // Match primarily on scientific name (Fish Rules lists it among synonyms),
  // falling back to a normalized common name.
  private matchEntry(
    ref: SpeciesNameRef,
    index: Map<string, FishRulesLocationEntry>
  ): FishRulesLocationEntry | undefined {
    return (
      index.get(ref.scientificName.toLowerCase()) ??
      index.get(this.normalizeCommon(ref.commonName))
    );
  }

  // "Amberjack, Greater" -> "greater amberjack"; "black sea bass" -> itself.
  private normalizeCommon(name: string): string {
    const trimmed = name.trim().toLowerCase();
    const comma = trimmed.indexOf(",");
    if (comma === -1) return trimmed;
    const head = trimmed.slice(0, comma).trim();
    const tail = trimmed.slice(comma + 1).trim();
    return `${tail} ${head}`.trim();
  }

  private async speciesDetail(
    entry: FishRulesLocationEntry,
    lat: number,
    lng: number,
    headers: Record<string, string>
  ): Promise<SpeciesRegulation | null> {
    const key = `${entry.fish_id}:${lat.toFixed(3)},${lng.toFixed(3)}`;
    if (this.detailCache.has(key)) return this.detailCache.get(key) ?? null;
    try {
      const data = await this.httpClient.get<FishRulesSpeciesResponse>(
        `${this.config.fishRulesApiUrl}/species/${entry.fish_id}/${lat}/${lng}`,
        headers
      );
      const detail = data.results?.[0];
      const prohibited =
        entry.prohibited === 1 || (detail?.prohibited ?? 0) === 1;
      const regulation: SpeciesRegulation = {
        fishId: entry.fish_id,
        locationName: detail?.location_name ?? entry.location_name,
        bagLimit: detail?.bag_limit ?? entry.bag_limit,
        minSize: detail?.min_size ?? null,
        maxSize: detail?.max_size ?? null,
        sizeUnit: detail?.measurement_unit ?? null,
        prohibited,
        status: prohibited ? "prohibited" : "open",
      };
      this.detailCache.set(key, regulation);
      return regulation;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Fish Rules species ${entry.fish_id} lookup failed: ${message}`
      );
      this.detailCache.set(key, null);
      return null;
    }
  }
}
