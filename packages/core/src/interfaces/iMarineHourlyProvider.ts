import { HourlyWindResult } from "../types/hourlyWind";

export interface IMarineHourlyProvider {
  getHourlyWind(lat: number, lng: number): Promise<HourlyWindResult>;
}
