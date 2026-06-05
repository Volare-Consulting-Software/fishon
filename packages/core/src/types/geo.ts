export interface GeoLocation {
  lat: number;
  lng: number;
  name: string;
  state: string;
}

// An ArcGIS autocomplete suggestion; magicKey resolves to a precise candidate.
export interface GeoSuggestion {
  text: string;
  magicKey: string;
}
