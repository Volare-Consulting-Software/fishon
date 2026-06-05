import { TimeOfDay } from "./timeOfDay";
import { FishingMethod } from "./fishingTripRequest";

export interface DaySuggestion {
  bestWindow: TimeOfDay | "fullday";
  recommendedMethod: FishingMethod;
  /** Subset of the report's species (common names). */
  targetSpecies: string[];
  /** Subset of the report's spot names. */
  recommendedSpots: string[];
  confidence: "low" | "medium" | "high";
  rationale: string;
  cautions: string[];
}
