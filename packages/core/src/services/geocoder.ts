import { inject, injectable } from "tsyringe";
import { TOKENS, IHttpClient } from "../interfaces";
import { ForecastServiceConfig } from "../config";
import { GeoLocation } from "../types/geo";
import { GeocodeResponse } from "../types/noaa";

@injectable()
export class ArcGisGeocoder {
  constructor(
    @inject(TOKENS.IHttpClient) private readonly httpClient: IHttpClient,
    @inject(TOKENS.ForecastServiceConfig) private readonly config: ForecastServiceConfig
  ) {}

  async geocode(location: string): Promise<GeoLocation> {
    const params = new URLSearchParams({
      SingleLine: location,
      countryCode: "USA",
      category: "Populated Place",
      maxLocations: "1",
      outFields: "City,Region,RegionAbbr",
      f: "json",
    });
    const data = await this.httpClient.get<GeocodeResponse>(
      `${this.config.geocodeApiUrl}?${params}`
    );
    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new Error(`Could not geocode location: "${location}"`);
    }
    return {
      lat: candidate.location.y,
      lng: candidate.location.x,
      name: candidate.attributes.City || candidate.address,
      state: candidate.attributes.RegionAbbr || "",
    };
  }
}
