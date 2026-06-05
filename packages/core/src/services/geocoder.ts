import { inject, injectable } from "tsyringe";
import { TOKENS, IHttpClient, IGeocoder } from "../interfaces";
import { ForecastServiceConfig } from "../config";
import { GeoLocation, GeoSuggestion } from "../types/geo";
import { GeocodeResponse } from "../types/noaa";

interface ArcGisSuggestResponse {
  suggestions?: Array<{ text: string; magicKey: string; isCollection?: boolean }>;
}

@injectable()
export class ArcGisGeocoder implements IGeocoder {
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

  async suggest(text: string): Promise<GeoSuggestion[]> {
    if (text.trim().length < 3) return [];
    const params = new URLSearchParams({
      text,
      countryCode: "USA",
      category: "Populated Place",
      f: "json",
    });
    try {
      const data = await this.httpClient.get<ArcGisSuggestResponse>(
        `${this.config.geocodeSuggestUrl}?${params}`
      );
      return (data.suggestions ?? [])
        .filter((s) => !s.isCollection)
        .slice(0, 6)
        .map((s) => ({ text: s.text, magicKey: s.magicKey }));
    } catch {
      return [];
    }
  }
}
