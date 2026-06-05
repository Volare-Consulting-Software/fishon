import { injectable } from "tsyringe";
import { IMoonPhaseProvider } from "../interfaces";
import { MoonPhase } from "../types/moonPhase";
import { MoonPhaseInfo, MoonPhaseMap } from "../types/moon";

const SYNODIC_MONTH = 29.53059;
const KNOWN_NEW_MOON = new Date("2000-01-06T18:14:00Z");

@injectable()
export class MoonPhaseProvider implements IMoonPhaseProvider {
  getPhase(date: Date | string): MoonPhaseInfo {
    const d = new Date(date);
    d.setHours(12, 0, 0, 0);
    const daysSinceRef =
      (d.getTime() - KNOWN_NEW_MOON.getTime()) / (1000 * 60 * 60 * 24);
    const cycleProgress =
      ((daysSinceRef % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
    const age = cycleProgress;
    const illumination = Math.round(
      ((1 - Math.cos((2 * Math.PI * age) / SYNODIC_MONTH)) / 2) * 100
    );

    let phase: MoonPhase;
    if (age < 1.85) phase = MoonPhase.NewMoon;
    else if (age < 7.38) phase = MoonPhase.WaxingCrescent;
    else if (age < 9.23) phase = MoonPhase.FirstQuarter;
    else if (age < 14.77) phase = MoonPhase.WaxingGibbous;
    else if (age < 16.61) phase = MoonPhase.FullMoon;
    else if (age < 22.15) phase = MoonPhase.WaningGibbous;
    else if (age < 23.99) phase = MoonPhase.LastQuarter;
    else if (age < 27.68) phase = MoonPhase.WaningCrescent;
    else phase = MoonPhase.NewMoon;

    return { phase, illumination, age: Math.round(age * 10) / 10 };
  }

  getPhasesForDays(startDate: Date | string, numDays: number): MoonPhaseMap {
    const phases: MoonPhaseMap = {};
    const d = new Date(startDate);
    for (let i = 0; i < numDays; i++) {
      const dateStr = d.toISOString().split("T")[0]!;
      phases[dateStr] = this.getPhase(d);
      d.setDate(d.getDate() + 1);
    }
    return phases;
  }
}
