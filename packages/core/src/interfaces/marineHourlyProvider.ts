import { HourlyWindResult } from "../types/hourlyWind";

export interface MarineHourlyProvider {
  getHourlyWind(lat: number, lng: number): Promise<HourlyWindResult>;
}
