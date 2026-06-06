import { describe, it, expect } from "vitest";
import { Mock, It } from "moq.ts";
import { FishRulesClient, Logger, SpeciesNameRef } from "../src/interfaces";
import { RegulationsProvider } from "../src/services/regulationsProvider";
import {
  FishRulesLocationEntry,
  FishRulesRegulationDetail,
} from "../src/types/fishRules";
import { registerMocks, container } from "./testContainer";

function loggerMock(): Mock<Logger> {
  const m = new Mock<Logger>();
  m.setup((i) => i.info(It.IsAny())).returns();
  m.setup((i) => i.warn(It.IsAny())).returns();
  m.setup((i) => i.error(It.IsAny())).returns();
  return m;
}

function provider(opts: {
  entries?: FishRulesLocationEntry[];
  detail?: FishRulesRegulationDetail | null;
}): RegulationsProvider {
  const fish = new Mock<FishRulesClient>();
  fish
    .setup((i) => i.getAreaSpecies(It.IsAny(), It.IsAny()))
    .returnsAsync(opts.entries ?? []);
  fish
    .setup((i) => i.getRegulationDetail(It.IsAny()))
    .returnsAsync(opts.detail ?? null);
  fish.setup((i) => i.imageUrl(It.IsAny())).returns("img");
  registerMocks({ FishRulesClient: fish, Logger: loggerMock() });
  return container.resolve(RegulationsProvider);
}

const REF: SpeciesNameRef = {
  commonName: "greater amberjack",
  scientificName: "Seriola dumerili",
  regulationId: 27912,
};

const FULL_DETAIL: FishRulesRegulationDetail = {
  id: 27912,
  fish_id: 100,
  species: "Amberjack, Greater",
  location_name: "FL Atlantic State Waters",
  bag_limit: 1,
  min_size: 28,
  max_size: 40,
  measurement_unit: "in",
  measurement_name: "Fork Length",
  measurement_abbreviation: "FL",
  prohibited: 0,
  no_closures: 1,
  edibility: "<p>Very good.</p>",
};

describe("RegulationsProvider", () => {
  it("fetches detail directly by regulationId and maps the rich shape", async () => {
    const map = await provider({ detail: FULL_DETAIL }).getRegulations(
      [REF],
      26.9,
      -80.0
    );
    const reg = map.get("seriola dumerili");
    expect(reg).toMatchObject({
      regulationId: 27912,
      fishId: 100,
      locationName: "FL Atlantic State Waters",
      bagLimit: 1,
      minSize: 28,
      maxSize: 40,
      sizeUnit: "in",
      measurementName: "Fork Length",
      measurementAbbreviation: "FL",
      prohibited: false,
      seasonStatus: "open",
      status: "open",
      edibilityNote: "Very good.",
    });
  });

  it("matches OBIS-sourced species by synonym when no regulationId is given", async () => {
    const entry: FishRulesLocationEntry = {
      id: 27912,
      fish_id: 100,
      species: "Amberjack, Greater",
      synonyms: ["Seriola dumerili"],
      bag_limit: 1,
      location_name: "FL Atlantic State Waters",
    };
    const map = await provider({
      entries: [entry],
      detail: FULL_DETAIL,
    }).getRegulations(
      [{ commonName: "greater amberjack", scientificName: "Seriola dumerili" }],
      26.9,
      -80.0
    );
    expect(map.get("seriola dumerili")?.regulationId).toBe(27912);
  });

  it("treats no_limit_bag as an unlimited (null) bag limit", async () => {
    const detail = { ...FULL_DETAIL, no_limit_bag: 1, bag_limit: 5 };
    const map = await provider({ detail }).getRegulations([REF], 26.9, -80.0);
    expect(map.get("seriola dumerili")?.bagLimit).toBeNull();
  });

  it("reports prohibited species as no-harvest", async () => {
    const detail = { ...FULL_DETAIL, prohibited: 1 };
    const map = await provider({ detail }).getRegulations([REF], 26.9, -80.0);
    const reg = map.get("seriola dumerili");
    expect(reg?.prohibited).toBe(true);
    expect(reg?.status).toBe("prohibited");
  });

  it("reports out-of-season for a past, non-repeating window", async () => {
    const detail: FishRulesRegulationDetail = {
      ...FULL_DETAIL,
      no_closures: 0,
      seasons: [
        {
          starts_at: { date: "2020-01-01 00:00:00.000000" },
          ends_at: { date: "2020-01-31 23:59:59.000000" },
          repeat: false,
        },
      ],
    };
    const map = await provider({ detail }).getRegulations([REF], 26.9, -80.0);
    expect(map.get("seriola dumerili")?.status).toBe("out-of-season");
  });

  it("returns an empty map for an unmatched species with no detail", async () => {
    const map = await provider({ entries: [], detail: null }).getRegulations(
      [{ commonName: "ghost fish", scientificName: "Nullus nullus" }],
      26.9,
      -80.0
    );
    expect(map.size).toBe(0);
  });
});
