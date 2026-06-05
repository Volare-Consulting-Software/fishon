import { inject, injectable } from "tsyringe";
import { TOKENS, IHttpClient, IGeocoder } from "../interfaces";
import { ForecastServiceConfig } from "../config";
import { TideType } from "../types/tideType";
import { TideStation, TidePrediction, TideResult } from "../types/tide";
import { NoaaStation, NoaaStationsResponse, NoaaPredictionsResponse } from "../types/noaa";

@injectable()
export class NoaaTideProvider {
  private stationCache: NoaaStation[] | null = null;

  constructor(
    @inject(TOKENS.IHttpClient) private readonly httpClient: IHttpClient,
    @inject(TOKENS.IGeocoder) private readonly geocoder: IGeocoder,
    @inject(TOKENS.ForecastServiceConfig) private readonly config: ForecastServiceConfig
  ) {}

  async getTides(
    location: string,
    numDays: number = 7
  ): Promise<TideResult> {
    const geo = await this.geocoder.geocode(location);
    const station = await this.findNearestStation(geo.lat, geo.lng);
    const predictions = await this.getPredictions(station.id, numDays);
    const byDate = this.groupByDate(predictions);
    return { station, predictions, byDate };
  }

  private async getStations(): Promise<NoaaStation[]> {
    if (this.stationCache) return this.stationCache;
    const data = await this.httpClient.get<NoaaStationsResponse>(
      this.config.noaaStationsApiUrl
    );
    this.stationCache = data.stations || [];
    return this.stationCache;
  }

  private async findNearestStation(
    lat: number,
    lng: number
  ): Promise<TideStation> {
    const stations = await this.getStations();
    let nearest: NoaaStation | null = null;
    let minDist = Infinity;
    for (const s of stations) {
      const dist = Math.sqrt(
        Math.pow(s.lat - lat, 2) + Math.pow(s.lng - lng, 2)
      );
      if (dist < minDist) {
        minDist = dist;
        nearest = s;
      }
    }
    if (!nearest) {
      throw new Error("No NOAA tide stations found.");
    }
    return {
      id: nearest.id,
      name: nearest.name,
      lat: nearest.lat,
      lng: nearest.lng,
    };
  }

  private async getPredictions(
    stationId: string,
    numDays: number = 7
  ): Promise<TidePrediction[]> {
    const begin = new Date();
    begin.setHours(0, 0, 0, 0);
    const end = new Date(begin);
    end.setDate(end.getDate() + numDays);

    const params = new URLSearchParams({
      begin_date: this.formatDate(begin),
      end_date: this.formatDate(end),
      station: stationId,
      product: "predictions",
      datum: "MLLW",
      time_zone: "lst_ldt",
      interval: "hilo",
      units: "english",
      format: "json",
      application: "fishweather",
    });

    const data = await this.httpClient.get<NoaaPredictionsResponse>(
      `${this.config.noaaApiUrl}?${params}`
    );
    if (!data.predictions) {
      throw new Error(
        data.error?.message || "No tide predictions returned from NOAA."
      );
    }

    return data.predictions.map((p) => ({
      time: p.t,
      height: parseFloat(p.v),
      type: p.type === "H" ? TideType.High : TideType.Low,
    }));
  }

  private groupByDate(
    predictions: TidePrediction[]
  ): Record<string, TidePrediction[]> {
    const grouped: Record<string, TidePrediction[]> = {};
    for (const p of predictions) {
      const dateStr =
        p.time
          .split(" ")[0]
          ?.replace(/(\d{4})-(\d{2})-(\d{2})/, "$1-$2-$3") ?? "";
      if (!grouped[dateStr]) grouped[dateStr] = [];
      grouped[dateStr]!.push(p);
    }
    return grouped;
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}${m}${d}`;
  }
}
