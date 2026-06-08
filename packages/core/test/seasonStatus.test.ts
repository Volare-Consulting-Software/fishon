import { describe, it, expect } from "vitest";
import {
  resolveSeasonStatus,
  toRegulationSeasons,
} from "../src/services/seasonStatus";
import { FishRulesRegulationDetail, FishRulesSeason } from "../src/types/fishRules";

function season(start: string, end: string, repeat = true): FishRulesSeason {
  return {
    starts_at: { date: `${start} 00:00:00.000000` },
    ends_at: { date: `${end} 23:59:59.000000` },
    repeat,
  };
}

function detail(
  over: Partial<FishRulesRegulationDetail>
): FishRulesRegulationDetail {
  return { id: 1, fish_id: 1, species: "Test", bag_limit: 1, ...over };
}

describe("resolveSeasonStatus", () => {
  it("returns prohibited when the prohibited flag is set", () => {
    const d = detail({ prohibited: 1, seasons: [season("2026-04-01", "2026-04-30")] });
    expect(resolveSeasonStatus(d, new Date("2026-04-15T12:00:00Z"))).toBe(
      "prohibited"
    );
  });

  it("returns open when no_closures is set", () => {
    const d = detail({ no_closures: 1 });
    expect(resolveSeasonStatus(d, new Date("2026-08-01T12:00:00Z"))).toBe("open");
  });

  it("returns open when no seasons are listed", () => {
    expect(resolveSeasonStatus(detail({ seasons: [] }), new Date("2026-08-01T12:00:00Z"))).toBe(
      "open"
    );
  });

  it("returns open inside an annually-repeating window", () => {
    const d = detail({ seasons: [season("2026-04-01", "2026-04-30")] });
    // A year later still falls inside the recurring April window.
    expect(resolveSeasonStatus(d, new Date("2027-04-10T12:00:00Z"))).toBe("open");
  });

  it("returns out-of-season outside every window", () => {
    const d = detail({ seasons: [season("2026-04-01", "2026-04-30")] });
    expect(resolveSeasonStatus(d, new Date("2026-07-01T12:00:00Z"))).toBe(
      "out-of-season"
    );
  });

  it("handles windows that wrap the year boundary", () => {
    const d = detail({ seasons: [season("2026-11-01", "2027-02-28")] });
    expect(resolveSeasonStatus(d, new Date("2027-01-15T12:00:00Z"))).toBe("open");
    expect(resolveSeasonStatus(d, new Date("2026-06-15T12:00:00Z"))).toBe(
      "out-of-season"
    );
  });

  it("compares absolute dates for non-repeating windows", () => {
    const d = detail({ seasons: [season("2026-04-01", "2026-04-30", false)] });
    expect(resolveSeasonStatus(d, new Date("2026-04-10T12:00:00Z"))).toBe("open");
    // Same month/day a year later is NOT open because the window does not repeat.
    expect(resolveSeasonStatus(d, new Date("2027-04-10T12:00:00Z"))).toBe(
      "out-of-season"
    );
  });
});

describe("toRegulationSeasons", () => {
  it("normalizes raw seasons into ISO dates + repeat flag", () => {
    const seasons = toRegulationSeasons([season("2026-04-01", "2026-04-30")]);
    expect(seasons).toEqual([
      { startsAt: "2026-04-01", endsAt: "2026-04-30", repeatsAnnually: true },
    ]);
  });

  it("returns an empty array when seasons are missing", () => {
    expect(toRegulationSeasons(undefined)).toEqual([]);
  });
});
