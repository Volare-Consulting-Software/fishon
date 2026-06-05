import type {
  ForecastRow,
  TidePrediction,
  GeoLocation,
  FishingSpot,
  FishSpecies,
  SpeciesProfile,
  MoonPhase,
  HourlyWindPoint,
} from "@volare-consulting/fishweather-forecast";
import { DaySuggestion } from "./daySuggestion";

export interface FishingDayReport {
  date: string;
  location: GeoLocation;
  station: string;
  marineForecastAvailable: boolean;
  /** Periods filtered to the requested time-of-day. */
  periods: ForecastRow[];
  /** All periods for the day (for the full-day charts). */
  allPeriods: ForecastRow[];
  tides: TidePrediction[];
  moonPhase: MoonPhase | "";
  moonIllumination: number;
  reefs: FishingSpot[];
  species: FishSpecies[];
  speciesProfiles: SpeciesProfile[];
  /** NOAA hourly wind for this date (drives the intraday wind curve). */
  hourlyWind: HourlyWindPoint[];
  suggestion: DaySuggestion;
}
