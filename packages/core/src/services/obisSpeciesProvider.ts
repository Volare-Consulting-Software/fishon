import { inject, injectable } from "tsyringe";
import {
  TOKENS,
  HttpClient,
  Geocoder,
  Logger,
  SpeciesProvider,
} from "../interfaces";
import { ForecastServiceConfig } from "../config";
import { FishSpecies } from "../types/fishSpecies";

interface ObisChecklistItem {
  scientificName?: string;
  taxonRank?: string;
  records?: number;
  acceptedNameUsageID?: string | number;
  taxonID?: string | number;
}
interface ObisChecklistResponse {
  results?: ObisChecklistItem[];
}
interface WormsVernacular {
  vernacular?: string;
  language_code?: string;
  language?: string;
}

const MAX_SPECIES = 25;

@injectable()
export class ObisSpeciesProvider implements SpeciesProvider {
  private cache = new Map<string, FishSpecies[]>();

  constructor(
    @inject(TOKENS.Geocoder) private readonly geocoder: Geocoder,
    @inject(TOKENS.HttpClient) private readonly httpClient: HttpClient,
    @inject(TOKENS.ForecastServiceConfig) private readonly config: ForecastServiceConfig,
    @inject(TOKENS.Logger) private readonly logger: Logger
  ) {}

  async getSpecies(location: string): Promise<FishSpecies[]> {
    const geo = await this.geocoder.geocode(location);
    const key = `${geo.lat.toFixed(2)},${geo.lng.toFixed(2)}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const items = await this.obisChecklist(geo.lat, geo.lng);
    const speciesItems = items.filter(
      (i) => i.taxonRank === "Species" && i.scientificName
    );

    // Prefer the genera anglers actually target; fall back to all fish if the
    // curated filter leaves nothing (e.g. an unusual area).
    const targeted = speciesItems.filter((i) =>
      this.config.targetGenera.includes(genusOf(i.scientificName!))
    );
    const chosen = (targeted.length > 0 ? targeted : speciesItems)
      .sort((a, b) => (b.records ?? 0) - (a.records ?? 0))
      .slice(0, MAX_SPECIES);

    const species = await Promise.all(
      chosen.map(async (item) => {
        const scientificName = item.scientificName!;
        const commonName =
          (await this.commonName(item)) ?? scientificName.toLowerCase();
        return {
          commonName,
          scientificName,
          occurrenceCount: item.records ?? 0,
        };
      })
    );

    this.cache.set(key, species);
    return species;
  }

  private async obisChecklist(
    lat: number,
    lng: number
  ): Promise<ObisChecklistItem[]> {
    // A small box around the point keeps the OBIS area query fast and local.
    const d = 0.6;
    const poly =
      `POLYGON((${lng - d} ${lat - d},${lng + d} ${lat - d},` +
      `${lng + d} ${lat + d},${lng - d} ${lat + d},${lng - d} ${lat - d}))`;
    const url =
      `${this.config.obisApiUrl}/checklist?taxonid=${this.config.fishTaxonId}` +
      `&geometry=${encodeURIComponent(poly)}&size=500`;
    try {
      const data = await this.httpClient.get<ObisChecklistResponse>(url, {
        "User-Agent": this.config.userAgent,
      });
      return data.results ?? [];
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`OBIS checklist failed: ${message}`);
      return [];
    }
  }

  private async commonName(item: ObisChecklistItem): Promise<string | null> {
    const aphiaId = aphiaIdOf(item);
    if (!aphiaId) return null;
    try {
      const vernaculars = await this.httpClient.get<WormsVernacular[]>(
        `${this.config.wormsApiUrl}/AphiaVernacularsByAphiaID/${aphiaId}`,
        { "User-Agent": this.config.userAgent }
      );
      const english = vernaculars.find(
        (v) => (v.language_code ?? "").toLowerCase() === "eng"
      );
      return english?.vernacular ?? null;
    } catch {
      return null;
    }
  }
}

function genusOf(scientificName: string): string {
  return (scientificName.split(" ")[0] ?? "").toLowerCase();
}

// OBIS ids look like "urn:lsid:marinespecies.org:taxname:159222"; the trailing
// number is the WoRMS AphiaID.
function aphiaIdOf(item: ObisChecklistItem): string | null {
  const raw = item.acceptedNameUsageID ?? item.taxonID ?? "";
  const match = String(raw).match(/(\d+)\s*$/);
  return match?.[1] ?? null;
}
