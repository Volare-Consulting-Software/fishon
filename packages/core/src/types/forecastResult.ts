import { TideStation } from "./tide";
import { ForecastRow } from "./forecastRow";

export interface ForecastResult {
  station: string;
  spotId: string;
  tideStation: TideStation | null;
  forecast: ForecastRow[];
}
