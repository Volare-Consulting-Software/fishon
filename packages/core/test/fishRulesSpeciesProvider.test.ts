import { describe, it, expect, beforeEach } from "vitest";
import { Mock, It } from "moq.ts";
import { Geocoder, FishRulesClient, Logger } from "../src/interfaces";
import { FishRulesSpeciesProvider } from "../src/services/fishRulesSpeciesProvider";
import { ObisSpeciesProvider } from "../src/services/obisSpeciesProvider";
import { FishRulesLocationEntry } from "../src/types/fishRules";
import { FishSpecies } from "../src/types/fishSpecies";
import { registerMocks, container } from "./testContainer";

function entry(over: Partial<FishRulesLocationEntry>): FishRulesLocationEntry {
  return {
    id: 1,
    fish_id: 1,
    species: "Test",
    bag_limit: 1,
    location_name: "Somewhere",
    ...over,
  };
}

function build(entries: FishRulesLocationEntry[], obis: FishSpecies[]) {
  const geocoder = new Mock<Geocoder>();
  geocoder
    .setup((i) => i.geocode(It.IsAny()))
    .returnsAsync({ lat: 26.9, lng: -80.0, name: "Jupiter, FL", state: "FL" });

  const fish = new Mock<FishRulesClient>();
  fish.setup((i) => i.getAreaSpecies(It.IsAny(), It.IsAny())).returnsAsync(entries);
  fish.setup((i) => i.imageUrl(It.IsAny())).returns("img");

  const logger = new Mock<Logger>();
  logger.setup((i) => i.info(It.IsAny())).returns();
  logger.setup((i) => i.warn(It.IsAny())).returns();
  logger.setup((i) => i.error(It.IsAny())).returns();

  const obisMock = new Mock<ObisSpeciesProvider>();
  obisMock.setup((i) => i.getSpecies(It.IsAny())).returnsAsync(obis);

  registerMocks({
    Geocoder: geocoder,
    FishRulesClient: fish,
    Logger: logger,
  });
  container.register(ObisSpeciesProvider, { useValue: obisMock.object() });
  return container.resolve(FishRulesSpeciesProvider);
}

describe("FishRulesSpeciesProvider", () => {
  beforeEach(() => container.reset());

  it("maps Fish Rules entries to species carrying ids and clean names", async () => {
    const provider = build(
      [
        entry({
          id: 27912,
          fish_id: 100,
          species: "Amberjack, Greater",
          synonyms: ["Kahala", "Seriola dumerili"],
        }),
      ],
      []
    );
    const species = await provider.getSpecies("Jupiter, FL");
    expect(species).toEqual([
      {
        commonName: "greater amberjack",
        scientificName: "Seriola dumerili",
        occurrenceCount: 0,
        regulationId: 27912,
        fishId: 100,
        imageUrl: "img",
        bagLimit: 1,
        prohibited: false,
      },
    ]);
  });

  it("dedupes entries by regulation id", async () => {
    const provider = build(
      [
        entry({ id: 5, fish_id: 5, species: "Snook" }),
        entry({ id: 5, fish_id: 5, species: "Snook" }),
      ],
      []
    );
    expect(await provider.getSpecies("x")).toHaveLength(1);
  });

  it("falls back to OBIS when Fish Rules has no coverage", async () => {
    const obis: FishSpecies[] = [
      { commonName: "cod", scientificName: "Gadus morhua", occurrenceCount: 9 },
    ];
    const provider = build([], obis);
    expect(await provider.getSpecies("inland lake")).toEqual(obis);
  });
});
