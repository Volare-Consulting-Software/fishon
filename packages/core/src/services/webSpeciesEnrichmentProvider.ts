import { inject, injectable } from "tsyringe";
import {
  TOKENS,
  HttpClient,
  Logger,
  SpeciesEnrichmentProvider,
  SpeciesRegulationsProvider,
} from "../interfaces";
import { ForecastServiceConfig } from "../config";
import { FishSpecies } from "../types/fishSpecies";
import { GeoLocation } from "../types/geo";
import {
  SpeciesProfile,
  EdibilityRating,
  SpeciesRegulation,
} from "../types/speciesProfile";

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

@injectable()
export class WebSpeciesEnrichmentProvider implements SpeciesEnrichmentProvider {
  constructor(
    @inject(TOKENS.HttpClient) private readonly httpClient: HttpClient,
    @inject(TOKENS.ForecastServiceConfig) private readonly config: ForecastServiceConfig,
    @inject(TOKENS.Logger) private readonly logger: Logger,
    @inject(TOKENS.SpeciesRegulationsProvider)
    private readonly regulations: SpeciesRegulationsProvider
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
      })),
      geo.lat,
      geo.lng
    );

    return Promise.all(
      species.map(async (fish) => {
        const [photo, summary] = await Promise.all([
          this.photo(fish.scientificName),
          this.summary(fish.scientificName),
        ]);
        const { edibility, edibilityNote } = deriveEdibility(summary);
        const regulation: SpeciesRegulation | undefined = regMap.get(
          fish.scientificName.toLowerCase()
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

  private async photo(
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

  private async summary(scientificName: string): Promise<string | undefined> {
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
