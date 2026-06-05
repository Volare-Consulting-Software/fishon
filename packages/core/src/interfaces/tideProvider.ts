import { TideResult } from "../types/tide";

export interface TideProvider {
  getTides(location: string, numDays?: number): Promise<TideResult>;
}
