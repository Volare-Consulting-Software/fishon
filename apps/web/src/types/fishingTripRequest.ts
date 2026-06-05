import { TimeOfDay } from "./timeOfDay";

export type FishingMethod = "shoreline" | "nearshore" | "offshore";

export interface FishingTripRequest {
  /** ISO yyyy-mm-dd dates within the 7-day planning window. */
  dates: string[];
  /** Empty => best window based on conditions. */
  timesOfDay: TimeOfDay[];
  /** Single free-text location field (city + state). */
  location: string;
  methods: FishingMethod[];
  /** Common names the angler is specifically interested in (optional). */
  interestedSpecies?: string[];
}
