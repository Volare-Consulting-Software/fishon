import { describe, it, expect, beforeEach } from "vitest";
import { MoonPhaseProvider } from "../src/services/moonPhaseProvider";
import { MoonPhase } from "../src/types/moonPhase";
import { registerMocks, container } from "./testContainer";

const KNOWN_NEW_MOON_DATE = "2000-01-06";
const FULL_MOON_DATE = "2024-06-23";
const WAXING_CRESCENT_DATE = "2024-06-10";
const START_DATE = "2024-01-01";
const END_DATE_7 = "2024-01-07";

describe("MoonPhaseProvider", () => {
  let provider: MoonPhaseProvider;

  beforeEach(() => {
    registerMocks({});
    provider = container.resolve(MoonPhaseProvider);
  });

  it("getPhase_knownNewMoonDate_returnsNewMoonPhase", () => {
    const result = provider.getPhase(KNOWN_NEW_MOON_DATE);
    expect(result.phase).toBe(MoonPhase.NewMoon);
    expect(result.illumination).toBeLessThanOrEqual(1);
  });

  it("getPhase_midLunarCycleDate_returnsFullMoon", () => {
    const result = provider.getPhase(FULL_MOON_DATE);
    expect(result.phase).toBe(MoonPhase.FullMoon);
    expect(result.illumination).toBeGreaterThan(95);
  });

  it("getPhase_fewDaysAfterNewMoon_returnsWaxingCrescent", () => {
    const result = provider.getPhase(WAXING_CRESCENT_DATE);
    expect(result.phase).toBe(MoonPhase.WaxingCrescent);
    expect(result.illumination).toBeGreaterThan(0);
    expect(result.illumination).toBeLessThan(50);
  });

  it("getPhase_anyDate_returnsRoundedAge", () => {
    const result = provider.getPhase(WAXING_CRESCENT_DATE);
    expect(typeof result.age).toBe("number");
    expect(result.age * 10).toBe(Math.round(result.age * 10));
  });

  it("getPhase_dateObject_returnsValidPhase", () => {
    const result = provider.getPhase(new Date("2024-06-22T12:00:00Z"));
    expect(result.phase).toBe(MoonPhase.FullMoon);
  });

  it("getPhase_anyDate_returnsIlluminationBetween0And100", () => {
    const result = provider.getPhase("2024-03-15");
    expect(result.illumination).toBeGreaterThanOrEqual(0);
    expect(result.illumination).toBeLessThanOrEqual(100);
  });

  it("getPhasesForDays_sevenDays_returnsMapWithSevenEntries", () => {
    const result = provider.getPhasesForDays(START_DATE, 7);
    const keys = Object.keys(result);
    expect(keys).toHaveLength(7);
    expect(keys[0]).toBe(START_DATE);
    expect(keys[6]).toBe(END_DATE_7);
  });

  it("getPhasesForDays_multipleDays_returnsValidMoonPhaseInfoPerEntry", () => {
    const result = provider.getPhasesForDays("2024-06-15", 3);
    for (const info of Object.values(result)) {
      expect(info).toHaveProperty("phase");
      expect(info).toHaveProperty("illumination");
      expect(info).toHaveProperty("age");
      expect(typeof info.phase).toBe("string");
      expect(info.illumination).toBeGreaterThanOrEqual(0);
      expect(info.illumination).toBeLessThanOrEqual(100);
    }
  });

  it("getPhasesForDays_dateObject_returnsCorrectEntryCount", () => {
    const result = provider.getPhasesForDays(new Date(START_DATE), 3);
    expect(Object.keys(result)).toHaveLength(3);
  });
});
