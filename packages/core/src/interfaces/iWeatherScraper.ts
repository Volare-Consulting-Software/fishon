import { Station } from "../types/station";
import { ForecastRow } from "../types/forecastRow";

export interface IWeatherScraper {
  getForecast(
    location: string,
    headless?: boolean
  ): Promise<{ station: Station; forecast: ForecastRow[] }>;
}
