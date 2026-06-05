import { FishSpecies } from "../types/fishSpecies";

export interface SpeciesProvider {
  getSpecies(location: string): Promise<FishSpecies[]>;
}
