export type EdibilityRating = "yum" | "meh" | "yuck" | "unknown";

/** Harvest availability right now, derived from prohibited flag + open seasons. */
export type SeasonStatus =
  | "open" // open today (a current open window, or no closures)
  | "out-of-season" // closed today, but has open windows at other times
  | "prohibited" // no harvest at any time
  | "unknown"; // not enough data to decide

/** A single open-harvest window resolved from Fish Rules seasons. */
export interface RegulationSeason {
  /** ISO date of the window start, or null if open-ended. */
  startsAt: string | null;
  /** ISO date of the window end, or null if open-ended. */
  endsAt: string | null;
  /** True when the window recurs every year. */
  repeatsAnnually: boolean;
  description?: string;
}

export interface SpeciesRegulation {
  /** Fish Rules regulation id (detail endpoint key). */
  regulationId: number;
  /** Fish Rules species id (image key). */
  fishId: number;
  locationName: string;
  bagLimit: number | null;
  minSize: number | null;
  maxSize: number | null;
  minSlotSize: number | null;
  maxSlotSize: number | null;
  /** Unit symbol/abbreviation for sizes, e.g. `"` or `in`. */
  sizeUnit: string | null;
  /** How the fish is measured, e.g. "Fork Length", "Total Length". */
  measurementName: string | null;
  prohibited: boolean;
  seasonStatus: SeasonStatus;
  seasons: RegulationSeason[];
  /** Plain-text edibility note from Fish Rules, when provided. */
  edibilityNote?: string;
  /** Rolled-up harvest status for quick display. */
  status: "open" | "prohibited" | "out-of-season";
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
