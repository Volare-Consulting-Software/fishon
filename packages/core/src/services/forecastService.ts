import { inject, injectable } from "tsyringe";
import {
  TOKENS,
  IWeatherScraper,
  ITideProvider,
  IMoonPhaseProvider,
  ILogger,
} from "../interfaces";
import { ForecastResult } from "../types/forecastResult";

@injectable()
export class ForecastService {
  constructor(
    @inject(TOKENS.IWeatherScraper) private readonly weatherScraper: IWeatherScraper,
    @inject(TOKENS.ITideProvider) private readonly tideProvider: ITideProvider,
    @inject(TOKENS.IMoonPhaseProvider) private readonly moonProvider: IMoonPhaseProvider,
    @inject(TOKENS.ILogger) private readonly logger: ILogger
  ) {}

  async getForecast(
    location: string,
    headless: boolean = true
  ): Promise<ForecastResult> {
    const { station: weatherStation, forecast } =
      await this.weatherScraper.getForecast(location, headless);

    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 1);
    const moonPhases = this.moonProvider.getPhasesForDays(startDate, 15);

    let tideData = null;
    try {
      tideData = await this.tideProvider.getTides(location);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Warning: Could not fetch tide data: ${message}`);
    }

    for (const row of forecast) {
      const prevDate = new Date(row.date + "T12:00:00");
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateStr = prevDate.toISOString().split("T")[0]!;
      const moon = moonPhases[prevDateStr] ?? { phase: "", illumination: 0 };
      row.moonPhase = moon.phase;
      row.moonIllumination = moon.illumination;

      const dateTides = tideData?.byDate[row.date];
      if (dateTides) {
        row.tides = dateTides;
      } else {
        row.tides = [];
      }
    }

    return {
      station: weatherStation.name,
      spotId: weatherStation.id,
      tideStation: tideData?.station ?? null,
      forecast,
    };
  }
}
