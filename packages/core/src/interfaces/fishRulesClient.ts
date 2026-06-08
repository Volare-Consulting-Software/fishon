import {
  FishRulesLocationEntry,
  FishRulesRegulationDetail,
} from "../types/fishRules";

// Low-level access to the public Fish Rules API. Responses are cached per
// process so the area list and per-species detail are each fetched at most once.
export interface FishRulesClient {
  /** Species + summary rules applicable at a coordinate (cached). */
  getAreaSpecies(lat: number, lng: number): Promise<FishRulesLocationEntry[]>;
  /** Full detail for one regulation id, or null on failure (cached). */
  getRegulationDetail(
    regulationId: number
  ): Promise<FishRulesRegulationDetail | null>;
  /** Public image URL for a species' primary photo. */
  imageUrl(fishId: number): string;
}
