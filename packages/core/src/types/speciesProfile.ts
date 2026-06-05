export type EdibilityRating = "yum" | "meh" | "yuck" | "unknown";

export interface SpeciesRegulation {
  fishId: number;
  locationName: string;
  bagLimit: number | null;
  minSize: number | null;
  maxSize: number | null;
  sizeUnit: string | null;
  prohibited: boolean;
  status: "open" | "prohibited";
}

export interface SpeciesProfile {
  commonName: string;
  scientificName: string;
  occurrenceCount: number;
  imageUrl?: string;
  imageAttribution?: string;
  summary?: string;
  edibilityNote?: string;
  edibility: EdibilityRating;
  regulation?: SpeciesRegulation;
  regulationsUrl: string;
  regulationsLabel: string;
}
