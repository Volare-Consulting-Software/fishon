import { WindData } from "./wind";

export interface ScrapedData {
  days: string[];
  hours: string[];
  winds: WindData[];
  waves: number[];
  gusts: number[];
  temps: number[];
  clouds: number[];
  precip: number[];
}
