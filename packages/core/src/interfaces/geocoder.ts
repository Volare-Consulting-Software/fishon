import { GeoLocation, GeoSuggestion } from "../types/geo";

export interface Geocoder {
  geocode(location: string): Promise<GeoLocation>;
  suggest(text: string): Promise<GeoSuggestion[]>;
}
