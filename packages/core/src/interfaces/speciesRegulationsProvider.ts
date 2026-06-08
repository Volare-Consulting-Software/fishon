import { SpeciesRegulation } from "../types/speciesProfile";

// Minimal name pair used to match our species against a regulations source.
// regulationId, when present (Fish Rules-sourced species), lets the provider
// fetch detail directly and skip fuzzy name matching.
export interface SpeciesNameRef {
  commonName: string;
  scientificName: string;
  regulationId?: number;
}

export interface SpeciesRegulationsProvider {
  // Returns a map keyed by scientificName.toLowerCase() -> regulation.
  getRegulations(
    species: SpeciesNameRef[],
    lat: number,
    lng: number
  ): Promise<Map<string, SpeciesRegulation>>;
}
