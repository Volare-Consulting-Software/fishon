import { SpeciesRegulation } from "../types/speciesProfile";

// Minimal name pair used to match our species against a regulations source.
export interface SpeciesNameRef {
  commonName: string;
  scientificName: string;
}

export interface ISpeciesRegulationsProvider {
  getRegulations(
    species: SpeciesNameRef[],
    lat: number,
    lng: number
  ): Promise<Map<string, SpeciesRegulation>>;
}
