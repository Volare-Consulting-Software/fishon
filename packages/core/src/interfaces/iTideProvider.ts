import { TideResult } from "../types/tide";

export interface ITideProvider {
  getTides(location: string, numDays?: number): Promise<TideResult>;
}
