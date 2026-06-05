import { FishingSpot } from "../types/fishingSpot";

export interface IFishingSpotProvider {
  getSpots(location: string, radiusMiles: number): Promise<FishingSpot[]>;
}
