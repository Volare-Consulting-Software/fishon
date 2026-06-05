import { GeoLocation } from "../types/geo";

export interface IGeocoder {
  geocode(location: string): Promise<GeoLocation>;
}
