import { describe, it, expect, beforeEach } from "vitest";
import { Mock, It } from "moq.ts";
import { IHttpClient } from "../src/interfaces";
import { ArcGisGeocoder } from "../src/services/geocoder";
import { GeocodeResponse } from "../src/types/noaa";
import { registerMocks, container } from "./testContainer";

const SOUTHPORT_LAT = 33.92;
const SOUTHPORT_LNG = -78.02;
const SOUTHPORT_CITY = "Southport";
const SOUTHPORT_STATE = "NC";

describe("ArcGisGeocoder", () => {
  let geocoder: ArcGisGeocoder;
  let httpClientMock: Mock<IHttpClient>;

  beforeEach(() => {
    httpClientMock = new Mock<IHttpClient>();
    registerMocks({ IHttpClient: httpClientMock });
    geocoder = container.resolve(ArcGisGeocoder);
  });

  it("geocode_validLocation_returnsGeoLocation", async () => {
    const response: GeocodeResponse = {
      candidates: [
        {
          address: "Southport, North Carolina",
          location: { x: SOUTHPORT_LNG, y: SOUTHPORT_LAT },
          attributes: {
            City: SOUTHPORT_CITY,
            Region: "North Carolina",
            RegionAbbr: SOUTHPORT_STATE,
          },
        },
      ],
    };
    httpClientMock
      .setup((instance) => instance.get(It.IsAny()))
      .returnsAsync(response);

    const result = await geocoder.geocode("southport, nc");
    expect(result.lat).toBe(SOUTHPORT_LAT);
    expect(result.lng).toBe(SOUTHPORT_LNG);
    expect(result.name).toBe(SOUTHPORT_CITY);
    expect(result.state).toBe(SOUTHPORT_STATE);
  });

  it("geocode_noCandidatesReturned_throwsError", async () => {
    httpClientMock
      .setup((instance) => instance.get(It.IsAny()))
      .returnsAsync({ candidates: [] });

    await expect(geocoder.geocode("nonexistent")).rejects.toThrow(
      'Could not geocode location: "nonexistent"'
    );
  });

  it("geocode_emptyCityAttribute_fallsBackToAddress", async () => {
    const fallbackAddress = "Some Address, NC";
    const response: GeocodeResponse = {
      candidates: [
        {
          address: fallbackAddress,
          location: { x: -78.0, y: 34.0 },
          attributes: { City: "", Region: "North Carolina", RegionAbbr: SOUTHPORT_STATE },
        },
      ],
    };
    httpClientMock
      .setup((instance) => instance.get(It.IsAny()))
      .returnsAsync(response);

    const result = await geocoder.geocode("somewhere");
    expect(result.name).toBe(fallbackAddress);
  });
});
