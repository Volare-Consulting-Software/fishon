import { Station } from "../types/station";
import { ForecastRow } from "../types/forecastRow";

export interface WeatherScraper {
  getForecast(
    location: string,
    headless?: boolean
  ): Promise<{ station: Station; forecast: ForecastRow[] }>;
}
