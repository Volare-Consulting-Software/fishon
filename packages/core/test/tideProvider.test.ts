import { describe, it, expect, beforeEach } from "vitest";
import { Mock, It, Times } from "moq.ts";
import { IHttpClient, IGeocoder } from "../src/interfaces";
import { NoaaTideProvider } from "../src/services/tideProvider";
import { TideType } from "../src/types/tideType";
import { NoaaStationsResponse, NoaaPredictionsResponse } from "../src/types/noaa";
import { registerMocks, container } from "./testContainer";

const SPRINGMAID_ID = "8661070";
const WILMINGTON_ID = "8658120";
const TEST_DATE_1 = "2024-01-01";
const TEST_DATE_2 = "2024-01-02";
const SOUTHPORT_LAT = 33.92;
const SOUTHPORT_LNG = -78.02;

const mockStationsResponse: NoaaStationsResponse = {
  stations: [
    { id: SPRINGMAID_ID, name: "Springmaid Pier", lat: 33.65, lng: -78.92 },
    { id: WILMINGTON_ID, name: "Wilmington", lat: 34.23, lng: -77.95 },
  ],
};

const mockPredictionsResponse: NoaaPredictionsResponse = {
  predictions: [
    { t: `${TEST_DATE_1} 06:30`, v: "5.2", type: "H" },
    { t: `${TEST_DATE_1} 12:45`, v: "0.3", type: "L" },
    { t: `${TEST_DATE_2} 07:15`, v: "4.8", type: "H" },
  ],
};

describe("NoaaTideProvider", () => {
  let tideProvider: NoaaTideProvider;
  let httpClientMock: Mock<IHttpClient>;
  let geocoderMock: Mock<IGeocoder>;

  beforeEach(() => {
    httpClientMock = new Mock<IHttpClient>();
    httpClientMock
      .setup((instance) => instance.get(It.Is<string>((url) => url.includes("stations.json"))))
      .returnsAsync(mockStationsResponse);
    httpClientMock
      .setup((instance) => instance.get(It.Is<string>((url) => url.includes("datagetter"))))
      .returnsAsync(mockPredictionsResponse);

    geocoderMock = new Mock<IGeocoder>();
    geocoderMock
      .setup((instance) => instance.geocode(It.IsAny()))
      .returnsAsync({
        lat: SOUTHPORT_LAT,
        lng: SOUTHPORT_LNG,
        name: "Southport",
        state: "NC",
      });

    registerMocks({ IHttpClient: httpClientMock, IGeocoder: geocoderMock });
    tideProvider = container.resolve(NoaaTideProvider);
  });

  it("getTides_validLocation_returnsStationAndPredictions", async () => {
    const result = await tideProvider.getTides("southport, nc");
    expect(result.station).toBeDefined();
    expect(result.predictions).toHaveLength(3);
  });

  it("getTides_noaaHighLowTypes_mapsToHighAndLowStrings", async () => {
    const result = await tideProvider.getTides("southport, nc");
    expect(result.predictions[0]!.type).toBe(TideType.High);
    expect(result.predictions[1]!.type).toBe(TideType.Low);
  });

  it("getTides_stringHeightValues_parsesAsNumbers", async () => {
    const result = await tideProvider.getTides("southport, nc");
    expect(result.predictions[0]!.height).toBe(5.2);
    expect(result.predictions[1]!.height).toBe(0.3);
  });

  it("getTides_multipleDates_groupsPredictionsByDate", async () => {
    const result = await tideProvider.getTides("southport, nc");
    expect(result.byDate[TEST_DATE_1]).toHaveLength(2);
    expect(result.byDate[TEST_DATE_2]).toHaveLength(1);
  });

  it("getTides_multipleStations_returnsNearestByDistance", async () => {
    const result = await tideProvider.getTides("southport, nc");
    // Wilmington (34.23, -77.95) is closer to (33.92, -78.02) than Springmaid Pier (33.65, -78.92)
    expect(result.station.id).toBe(WILMINGTON_ID);
  });

  it("getTides_calledTwice_fetchesStationsOnlyOnce", async () => {
    await tideProvider.getTides("southport, nc");
    await tideProvider.getTides("wilmington, nc");

    httpClientMock.verify(
      (instance) => instance.get(It.Is<string>((url) => url.includes("stations.json"))),
      Times.Once()
    );
  });

  it("getTides_noaaReturnsError_throwsWithErrorMessage", async () => {
    const errorMessage = "Station not found";
    const errorHttpMock = new Mock<IHttpClient>();
    errorHttpMock
      .setup((instance) => instance.get(It.Is<string>((url) => url.includes("stations.json"))))
      .returnsAsync(mockStationsResponse);
    errorHttpMock
      .setup((instance) => instance.get(It.Is<string>((url) => url.includes("datagetter"))))
      .returnsAsync({ error: { message: errorMessage } });

    registerMocks({ IHttpClient: errorHttpMock, IGeocoder: geocoderMock });
    tideProvider = container.resolve(NoaaTideProvider);

    await expect(tideProvider.getTides("southport, nc")).rejects.toThrow(
      errorMessage
    );
  });
});
