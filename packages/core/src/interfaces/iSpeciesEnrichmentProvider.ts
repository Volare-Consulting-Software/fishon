import { FishSpecies } from "../types/fishSpecies";
import { SpeciesProfile } from "../types/speciesProfile";
import { GeoLocation } from "../types/geo";

export interface ISpeciesEnrichmentProvider {
  enrich(species: FishSpecies[], geo: GeoLocation): Promise<SpeciesProfile[]>;
}
