import { ForecastResult } from "./types/forecastResult";
import { TideResult } from "./types/tide";
import { FishingSpot } from "./types/fishingSpot";
import { FishSpecies } from "./types/fishSpecies";
import { SpeciesProfile } from "./types/speciesProfile";

// The MCP server's "API mode": instead of resolving core services directly, it
// calls the hosted HTTP endpoints — which are themselves thin wrappers over the
// same core services. Embedded mode and API mode therefore can't diverge.
export class FishweatherApiClient {
  constructor(private readonly baseUrl: string) {}

  private async getJson<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`);
    if (!res.ok) {
      throw new Error(`Fishweather API ${path} responded ${res.status}`);
    }
    return (await res.json()) as T;
  }

  getForecast(location: string): Promise<ForecastResult> {
    return this.getJson(`/api/forecast?location=${encodeURIComponent(location)}`);
  }

  getTides(location: string, days: number): Promise<TideResult> {
    return this.getJson(
      `/api/tides?location=${encodeURIComponent(location)}&days=${days}`
    );
  }

  getSpots(location: string, radiusMiles: number): Promise<FishingSpot[]> {
    return this.getJson(
      `/api/spots?location=${encodeURIComponent(location)}&radiusMiles=${radiusMiles}`
    );
  }

  getSpecies(location: string): Promise<FishSpecies[]> {
    return this.getJson(`/api/species?location=${encodeURIComponent(location)}`);
  }

  getSpeciesProfiles(location: string): Promise<SpeciesProfile[]> {
    return this.getJson(
      `/api/species/profiles?location=${encodeURIComponent(location)}`
    );
  }
}
