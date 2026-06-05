import { MoonPhaseInfo, MoonPhaseMap } from "../types/moon";

export interface IMoonPhaseProvider {
  getPhase(date: Date | string): MoonPhaseInfo;
  getPhasesForDays(startDate: Date | string, numDays: number): MoonPhaseMap;
}
