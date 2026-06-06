export interface FishSpecies {
  commonName: string;
  scientificName: string;
  /** OBIS occurrence records, or 0 when sourced from Fish Rules. */
  occurrenceCount: number;
  /**
   * Fish Rules regulation id, when this species came from Fish Rules. Lets
   * downstream regulation lookups fetch detail directly instead of re-matching
   * by name. Absent for OBIS-sourced species.
   */
  regulationId?: number;
  /** Fish Rules species id (image key), when available. */
  fishId?: number;
  /**
   * Cheap area-level facts from the Fish Rules list, available without a
   * per-species detail fetch. Let the UI show a useful card for every species
   * up front and lazy-load the full profile (sizes/seasons/edibility) on demand.
   */
  imageUrl?: string;
  bagLimit?: number | null;
  prohibited?: boolean;
  /** Whether the species is regulated in salt water, fresh water, or both. */
  waterType?: "salt" | "fresh" | "both";
  /** Fish Rules body-shape grouping, e.g. "Reef Fish", "Flatfish" — a coarse habitat hint. */
  shape?: string;
}
