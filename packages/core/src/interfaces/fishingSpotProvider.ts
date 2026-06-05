import { FishingSpot } from "../types/fishingSpot";

export interface FishingSpotProvider {
  getSpots(location: string, radiusMiles: number): Promise<FishingSpot[]>;
}
