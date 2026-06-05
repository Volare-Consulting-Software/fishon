export interface NoaaStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface NoaaStationsResponse {
  stations?: NoaaStation[];
}

export interface NoaaPredictionRaw {
  t: string;
  v: string;
  type: string;
}

export interface NoaaPredictionsResponse {
  predictions?: NoaaPredictionRaw[];
  error?: { message: string };
}

export interface GeocodeCandidate {
  location: { x: number; y: number };
  address: string;
  attributes: {
    City?: string;
    Region?: string;
    RegionAbbr?: string;
  };
}

export interface GeocodeResponse {
  candidates?: GeocodeCandidate[];
}
