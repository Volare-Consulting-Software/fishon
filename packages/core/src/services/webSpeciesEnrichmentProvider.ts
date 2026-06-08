import { inject, injectable } from "tsyringe";
import {
  TOKENS,
  HttpClient,
  Logger,
  SpeciesEnrichmentProvider,
  SpeciesRegulationsProvider,
  FishRulesClient,
} from "../interfaces";
import { ForecastServiceConfig } from "../config";
import { FishSpecies } from "../types/fishSpecies";
import { GeoLocation } from "../types/geo";
import {
  SpeciesProfile,
  EdibilityRating,
  SpeciesRegulation,
} from "../types/speciesProfile";
import { rateFishRulesEdibility, EdibilityVerdict } from "./edibility";

interface NaturalistTaxaResponse {
  results?: Array<{
    default_photo?: { medium_url?: string; attribution?: string };
  }>;
}
interface WikiSummary {
  extract?: string;
  title?: string;
  type?: string;
}

// Module-scoped so the cache survives the per-request provider instances.
const LOOKUP_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const photoCache = new Map<
  string,
  { at: number; value: Promise<{ url?: string; attribution?: string }> }
>();
const summaryCache = new Map<
  string,
  { at: number; value: Promise<string | undefined> }
>();

function cachedLookup<T>(
  cache: Map<string, { at: number; value: Promise<T> }>,
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < LOOKUP_TTL_MS) return hit.value;
  const value = fetcher();
  cache.set(key, { at: Date.now(), value });
  return value;
}

@injectable()
export class WebSpeciesEnrichmentProvider implements SpeciesEnrichmentProvider {
  constructor(
    @inject(TOKENS.HttpClient) private readonly httpClient: HttpClient,
    @inject(TOKENS.ForecastServiceConfig) private readonly config: ForecastServiceConfig,
    @inject(TOKENS.Logger) private readonly logger: Logger,
    @inject(TOKENS.SpeciesRegulationsProvider)
    private readonly regulations: SpeciesRegulationsProvider,
    @inject(TOKENS.FishRulesClient)
    private readonly fishRules: FishRulesClient
  ) {}

  async enrich(
    species: FishSpecies[],
    geo: GeoLocation
  ): Promise<SpeciesProfile[]> {
    const reg = this.config.stateRegulations[geo.state] ??
      this.config.stateRegulations["default"]!;

    const regMap = await this.regulations.getRegulations(
      species.map((s) => ({
        commonName: s.commonName,
        scientificName: s.scientificName,
        ...(s.regulationId !== undefined
          ? { regulationId: s.regulationId }
          : {}),
      })),
      geo.lat,
      geo.lng
    );

    return Promise.all(
      species.map(async (fish) => {
        const regulation: SpeciesRegulation | undefined = regMap.get(
          fish.scientificName.toLowerCase()
        );

        // Prefer a real iNaturalist photo (broad coverage + attribution); fall
        // back to the Fish Rules species image, which only exists for ~half of
        // species and can't be enumerated reliably.
        const [summary, inat] = await Promise.all([
          this.summary(fish.scientificName),
          this.photo(fish.scientificName),
        ]);
        const frImage = regulation
          ? this.fishRules.imageUrl(regulation.fishId)
          : undefined;
        const photo: { url?: string; attribution?: string } = {
          ...(inat.url ?? frImage ? { url: inat.url ?? frImage } : {}),
          ...(inat.url && inat.attribution
            ? { attribution: inat.attribution }
            : {}),
        };
        const { edibility, edibilityNote } = resolveEdibility(
          regulation,
          summary
        );

        return {
          commonName: fish.commonName,
          scientificName: fish.scientificName,
          occurrenceCount: fish.occurrenceCount,
          ...(photo.url ? { imageUrl: photo.url } : {}),
          ...(photo.attribution ? { imageAttribution: photo.attribution } : {}),
          ...(summary ? { summary } : {}),
          ...(edibilityNote ? { edibilityNote } : {}),
          edibility,
          ...(regulation ? { regulation } : {}),
          regulationsUrl: reg.url,
          regulationsLabel: reg.label,
        } satisfies SpeciesProfile;
      })
    );
  }

  // Photos/descriptions are effectively static per species. Cache them at module
  // scope (the provider itself is resolved fresh per request) so repeat lookups
  // across requests in a warm process skip the iNaturalist/Wikipedia round-trips.
  private photo(
    scientificName: string
  ): Promise<{ url?: string; attribution?: string }> {
    return cachedLookup(photoCache, scientificName, () =>
      this.fetchPhoto(scientificName)
    );
  }

  private async fetchPhoto(
    scientificName: string
  ): Promise<{ url?: string; attribution?: string }> {
    try {
      const data = await this.httpClient.get<NaturalistTaxaResponse>(
        `${this.config.inaturalistApiUrl}/taxa?q=${encodeURIComponent(scientificName)}&rank=species&per_page=1`,
        { "User-Agent": this.config.userAgent }
      );
      const photo = data.results?.[0]?.default_photo;
      return {
        ...(photo?.medium_url ? { url: photo.medium_url } : {}),
        ...(photo?.attribution ? { attribution: photo.attribution } : {}),
      };
    } catch {
      return {};
    }
  }

  private summary(scientificName: string): Promise<string | undefined> {
    return cachedLookup(summaryCache, scientificName, () =>
      this.fetchSummary(scientificName)
    );
  }

  private async fetchSummary(
    scientificName: string
  ): Promise<string | undefined> {
    try {
      const data = await this.httpClient.get<WikiSummary>(
        `${this.config.wikipediaApiUrl}/page/summary/${encodeURIComponent(scientificName)}`,
        { "User-Agent": this.config.userAgent }
      );
      if (data.type && data.type.includes("not_found")) return undefined;
      return data.extract?.trim() || undefined;
    } catch {
      return undefined;
    }
  }
}

// Prefer Fish Rules' own edibility note (per-species, semi-authoritative);
// otherwise fall back to the Wikipedia-derived heuristic.
function resolveEdibility(
  regulation: SpeciesRegulation | undefined,
  summary: string | undefined
): EdibilityVerdict {
  if (regulation?.edibilityNote) {
    return rateFishRulesEdibility(regulation.edibilityNote);
  }
  return deriveEdibility(summary);
}

// Wikipedia descriptions aren't a regulatory edibility source, but they reliably
// hint at it. This is a non-official, best-effort signal surfaced as a chip.
function deriveEdibility(text: string | undefined): {
  edibility: EdibilityRating;
  edibilityNote?: string;
} {
  if (!text) return { edibility: "unknown" };
  const t = text.toLowerCase();

  const yuck = [
    "not eaten",
    "rarely eaten",
    "poisonous",
    "toxic",
    "ciguatera",
    "trash fish",
    "not considered a food",
    "inedible",
  ];
  const yum = [
    "excellent food",
    "prized food",
    "important food",
    "highly prized",
    "good eating",
    "esteemed food",
    "valued food",
    "popular food",
    "delicacy",
    "important species for commercial and recreational",
  ];
  const meh = ["edible", "food fish", "eaten", "marketed", "consumed", "panfish"];

  if (yuck.some((k) => t.includes(k)))
    return { edibility: "yuck", edibilityNote: "Often not eaten — verify locally." };
  if (yum.some((k) => t.includes(k)))
    return { edibility: "yum", edibilityNote: "Generally well-regarded table fare." };
  if (meh.some((k) => t.includes(k)))
    return { edibility: "meh", edibilityNote: "Edible; quality varies." };
  return { edibility: "unknown" };
}
