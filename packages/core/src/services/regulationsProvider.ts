import { inject, injectable } from "tsyringe";
import {
  TOKENS,
  Logger,
  SpeciesRegulationsProvider,
  SpeciesNameRef,
  FishRulesClient,
} from "../interfaces";
import { SpeciesRegulation } from "../types/speciesProfile";
import {
  FishRulesLocationEntry,
  FishRulesRegulationDetail,
} from "../types/fishRules";
import { resolveSeasonStatus, toRegulationSeasons } from "./seasonStatus";
import { normalizeCommonName, scientificFromSynonyms } from "./speciesNames";
import { stripHtml } from "./edibility";

// Builds rich per-species regulations (bag, size, slot, measurement, seasons,
// prohibited) from Fish Rules. Species sourced from Fish Rules already carry a
// regulationId, so we fetch detail directly; species from the OBIS fallback are
// matched against the area list by scientific name (then common name).
@injectable()
export class RegulationsProvider implements SpeciesRegulationsProvider {
  constructor(
    @inject(TOKENS.FishRulesClient)
    private readonly fishRules: FishRulesClient,
    @inject(TOKENS.Logger) private readonly logger: Logger
  ) {}

  async getRegulations(
    species: SpeciesNameRef[],
    lat: number,
    lng: number
  ): Promise<Map<string, SpeciesRegulation>> {
    const result = new Map<string, SpeciesRegulation>();
    if (species.length === 0) return result;

    const now = new Date();
    const entries = await this.fishRules.getAreaSpecies(lat, lng);
    const index = this.buildIndex(entries);

    await Promise.all(
      species.map(async (ref) => {
        const entry = this.matchEntry(ref, index);
        const regulationId = ref.regulationId ?? entry?.id;
        if (regulationId === undefined) return;

        const detail = await this.fishRules.getRegulationDetail(regulationId);
        const regulation = this.buildRegulation(detail, entry, now);
        if (regulation) {
          result.set(ref.scientificName.toLowerCase(), regulation);
        }
      })
    );
    return result;
  }

  private buildIndex(
    entries: FishRulesLocationEntry[]
  ): Map<string, FishRulesLocationEntry> {
    const index = new Map<string, FishRulesLocationEntry>();
    for (const entry of entries) {
      const scientific = scientificFromSynonyms(entry.synonyms);
      if (scientific) index.set(scientific.toLowerCase(), entry);
      for (const synonym of entry.synonyms ?? []) {
        index.set(synonym.toLowerCase(), entry);
      }
      index.set(normalizeCommonName(entry.species), entry);
    }
    return index;
  }

  private matchEntry(
    ref: SpeciesNameRef,
    index: Map<string, FishRulesLocationEntry>
  ): FishRulesLocationEntry | undefined {
    return (
      index.get(ref.scientificName.toLowerCase()) ??
      index.get(normalizeCommonName(ref.commonName))
    );
  }

  private buildRegulation(
    detail: FishRulesRegulationDetail | null,
    entry: FishRulesLocationEntry | undefined,
    now: Date
  ): SpeciesRegulation | null {
    if (!detail && !entry) return null;

    const regulationId = detail?.id ?? entry?.id;
    const fishId = detail?.fish_id ?? entry?.fish_id;
    if (regulationId === undefined || fishId === undefined) return null;

    const prohibited = (detail?.prohibited ?? entry?.prohibited ?? 0) === 1;
    const seasonStatus = detail
      ? resolveSeasonStatus(detail, now)
      : prohibited
        ? "prohibited"
        : "unknown";
    const bagLimit =
      detail?.no_limit_bag === 1
        ? null
        : (detail?.bag_limit ?? entry?.bag_limit ?? null);
    const edibilityNote = stripHtml(detail?.edibility) || undefined;

    return {
      regulationId,
      fishId,
      locationName: detail?.location_name ?? entry?.location_name ?? "",
      bagLimit,
      minSize: detail?.min_size ?? null,
      maxSize: detail?.max_size ?? null,
      minSlotSize: detail?.min_slot_size ?? null,
      maxSlotSize: detail?.max_slot_size ?? null,
      sizeUnit:
        detail?.measurement_unit ?? detail?.measurement_unit_symbol ?? null,
      measurementName: detail?.measurement_name ?? null,
      prohibited,
      seasonStatus,
      seasons: toRegulationSeasons(detail?.seasons),
      ...(edibilityNote ? { edibilityNote } : {}),
      status: prohibited
        ? "prohibited"
        : seasonStatus === "out-of-season"
          ? "out-of-season"
          : "open",
    };
  }
}
