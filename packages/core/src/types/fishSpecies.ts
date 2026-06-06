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
}
