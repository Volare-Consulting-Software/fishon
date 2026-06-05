import { FishSpecies } from "../types/fishSpecies";

export interface ISpeciesProvider {
  getSpecies(location: string): Promise<FishSpecies[]>;
}
