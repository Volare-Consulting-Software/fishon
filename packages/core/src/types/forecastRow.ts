import { TidePrediction } from "./tide";
import { MoonPhase } from "./moonPhase";

export interface ForecastRow {
  day: string;
  date: string;
  period: string;
  windSpeed: number;
  windDirDeg: number;
  windDirCompass: string;
  waveHeight: number;
  gust: number;
  tempF: number;
  cloudPct: number;
  precipPct: number;
  moonPhase: MoonPhase | "";
  moonIllumination: number;
  tides: TidePrediction[];
}
