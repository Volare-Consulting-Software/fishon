import { GeoLocation, GeoSuggestion } from "../types/geo";

export interface IGeocoder {
  geocode(location: string): Promise<GeoLocation>;
  suggest(text: string): Promise<GeoSuggestion[]>;
}
