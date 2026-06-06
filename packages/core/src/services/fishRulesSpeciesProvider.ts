import { inject, injectable } from "tsyringe";
import {
  TOKENS,
  Geocoder,
  Logger,
  SpeciesProvider,
  FishRulesClient,
} from "../interfaces";
import { FishSpecies } from "../types/fishSpecies";
import { FishRulesLocationEntry } from "../types/fishRules";
import { ObisSpeciesProvider } from "./obisSpeciesProvider";
import { normalizeCommonName, scientificFromSynonyms } from "./speciesNames";

// Primary species source: Fish Rules' per-area list, which already reflects the
// species an angler can target there (with inline regulation ids). Falls back to
// the OBIS occurrence provider when Fish Rules has no coverage for the point
// (e.g. inland or non-US locations).
@injectable()
export class FishRulesSpeciesProvider implements SpeciesProvider {
  constructor(
    @inject(TOKENS.Geocoder) private readonly geocoder: Geocoder,
    @inject(TOKENS.FishRulesClient)
    private readonly fishRules: FishRulesClient,
    @inject(ObisSpeciesProvider)
    private readonly fallback: ObisSpeciesProvider,
    @inject(TOKENS.Logger) private readonly logger: Logger
  ) {}

  async getSpecies(location: string): Promise<FishSpecies[]> {
    const geo = await this.geocoder.geocode(location);
    const entries = await this.fishRules.getAreaSpecies(geo.lat, geo.lng);

    if (entries.length === 0) {
      this.logger.info(
        "Fish Rules has no species for this area; falling back to OBIS."
      );
      return this.fallback.getSpecies(location);
    }

    return this.toSpecies(entries);
  }

  // Dedupe by regulation id and preserve the API's ordering.
  private toSpecies(entries: FishRulesLocationEntry[]): FishSpecies[] {
    const seen = new Set<number>();
    const species: FishSpecies[] = [];
    for (const entry of entries) {
      if (seen.has(entry.id)) continue;
      seen.add(entry.id);
      const commonName = normalizeCommonName(entry.species);
      species.push({
        commonName,
        scientificName: scientificFromSynonyms(entry.synonyms) ?? commonName,
        occurrenceCount: 0,
        regulationId: entry.id,
        fishId: entry.fish_id,
        imageUrl: this.fishRules.imageUrl(entry.fish_id),
        bagLimit: entry.bag_limit,
        prohibited: entry.prohibited === 1,
        waterType: waterTypeOf(entry),
        ...(entry.shape ? { shape: entry.shape } : {}),
      });
    }
    return species;
  }
}

function waterTypeOf(
  entry: FishRulesLocationEntry
): "salt" | "fresh" | "both" | undefined {
  const salt = entry.saltwater === 1;
  const fresh = entry.freshwater === 1;
  if (salt && fresh) return "both";
  if (salt) return "salt";
  if (fresh) return "fresh";
  return undefined;
}
