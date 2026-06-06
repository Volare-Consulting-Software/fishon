import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Mock, It, Times } from "moq.ts";
import { HttpClient, Logger } from "../src/interfaces";
import { FishRulesApiClient } from "../src/services/fishRulesApiClient";
import { DEFAULT_CONFIG } from "../src/config";
import { registerMocks, container } from "./testContainer";

const ENTRY = {
  id: 27912,
  fish_id: 100,
  species: "Amberjack, Greater",
  synonyms: ["Seriola dumerili"],
  bag_limit: 1,
  location_name: "FL Atlantic State Waters",
};
const DETAIL = { id: 27912, fish_id: 100, species: "Amberjack, Greater", bag_limit: 1, min_size: 28 };

function loggerMock(): Mock<Logger> {
  const m = new Mock<Logger>();
  m.setup((i) => i.info(It.IsAny())).returns();
  m.setup((i) => i.warn(It.IsAny())).returns();
  m.setup((i) => i.error(It.IsAny())).returns();
  return m;
}

describe("FishRulesApiClient (data, credentials via env)", () => {
  let httpMock: Mock<HttpClient>;
  let client: FishRulesApiClient;

  beforeEach(() => {
    process.env["FISHRULES_CLIENT_ID"] = "CID";
    process.env["FISHRULES_API_KEY"] = "KEY";

    httpMock = new Mock<HttpClient>();
    httpMock
      .setup((i) => i.get(It.Is<string>((u) => u.includes("/location/")), It.IsAny()))
      .returnsAsync({ results: [ENTRY] });
    httpMock
      .setup((i) => i.get(It.Is<string>((u) => u.endsWith("/27912")), It.IsAny()))
      .returnsAsync({ results: DETAIL });

    registerMocks({ HttpClient: httpMock, Logger: loggerMock() });
    client = container.resolve(FishRulesApiClient);
  });

  afterEach(() => {
    delete process.env["FISHRULES_CLIENT_ID"];
    delete process.env["FISHRULES_API_KEY"];
  });

  it("builds the primary image URL from the fish id", () => {
    expect(client.imageUrl(100)).toBe(
      `${DEFAULT_CONFIG.fishRulesImageUrl}/100/100.jpg`
    );
  });

  it("returns area species from the location endpoint", async () => {
    const entries = await client.getAreaSpecies(26.94, -80.07);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.id).toBe(27912);
  });

  it("caches area lookups by coordinate", async () => {
    await client.getAreaSpecies(26.94, -80.07);
    await client.getAreaSpecies(26.94, -80.07);
    httpMock.verify(
      (i) => i.get(It.Is<string>((u) => u.includes("/location/")), It.IsAny()),
      Times.Once()
    );
  });

  it("returns regulation detail by id", async () => {
    const detail = await client.getRegulationDetail(27912);
    expect(detail?.min_size).toBe(28);
  });

  it("degrades to an empty list when the area lookup fails", async () => {
    const failing = new Mock<HttpClient>();
    failing
      .setup((i) => i.get(It.IsAny<string>(), It.IsAny()))
      .throwsAsync(new Error("network down"));
    registerMocks({ HttpClient: failing, Logger: loggerMock() });
    const c = container.resolve(FishRulesApiClient);
    expect(await c.getAreaSpecies(1, 2)).toEqual([]);
  });
});

describe("FishRulesApiClient (runtime key capture)", () => {
  let httpMock: Mock<HttpClient>;

  beforeEach(() => {
    delete process.env["FISHRULES_CLIENT_ID"];
    delete process.env["FISHRULES_API_KEY"];

    httpMock = new Mock<HttpClient>();
    httpMock
      .setup((i) => i.getText(It.Is<string>((u) => u.endsWith("/")), It.IsAny()))
      .returnsAsync(
        '<script src="/_next/static/chunks/pages/_app-abc123.js"></script>'
      );
    httpMock
      .setup((i) => i.getText(It.Is<string>((u) => u.includes("_app-")), It.IsAny()))
      .returnsAsync(
        'x,"x-client-id":i.env.CLIENT_ID||"CID2","x-api-key":i.env.API_KEY||"KEY2",y'
      );
    httpMock
      .setup((i) => i.get(It.Is<string>((u) => u.includes("/location/")), It.IsAny()))
      .returnsAsync({ results: [] });
  });

  it("sends the key scraped from the live bundle", async () => {
    registerMocks({ HttpClient: httpMock, Logger: loggerMock() });
    const client = container.resolve(FishRulesApiClient);
    await client.getAreaSpecies(1, 2);
    httpMock.verify(
      (i) =>
        i.get(
          It.IsAny<string>(),
          It.Is<Record<string, string>>(
            (h) => h["x-api-key"] === "KEY2" && h["x-client-id"] === "CID2"
          )
        ),
      Times.Once()
    );
  });

  it("falls back to the config defaults when capture fails", async () => {
    const failing = new Mock<HttpClient>();
    failing
      .setup((i) => i.getText(It.IsAny<string>(), It.IsAny()))
      .throwsAsync(new Error("blocked"));
    failing
      .setup((i) => i.get(It.Is<string>((u) => u.includes("/location/")), It.IsAny()))
      .returnsAsync({ results: [] });
    registerMocks({ HttpClient: failing, Logger: loggerMock() });
    const client = container.resolve(FishRulesApiClient);
    await client.getAreaSpecies(1, 2);
    failing.verify(
      (i) =>
        i.get(
          It.IsAny<string>(),
          It.Is<Record<string, string>>(
            (h) => h["x-api-key"] === DEFAULT_CONFIG.fishRulesApiKey
          )
        ),
      Times.Once()
    );
  });
});
