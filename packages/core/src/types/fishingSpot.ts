export type SpotKind =
  | "Artificial Reef"
  | "Pier"
  | "Jetty"
  | "Fishing Spot"
  | "Wreck";

export interface FishingSpot {
  name: string;
  kind: SpotKind;
  lat: number;
  lng: number;
  distanceMiles: number;
  depthFeet?: number;
  material?: string;
  source: string;
}
