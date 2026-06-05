import { describe, it, expect } from "vitest";
import {
  formatTides,
  formatForecastTable,
  formatTideReport,
} from "../src/formatters/forecastFormatter";
import { ForecastResult } from "../src/types/forecastResult";
import { MoonPhase } from "../src/types/moonPhase";
import { TidePrediction, TideResult } from "../src/types/tide";
import { TideType } from "../src/types/tideType";

const TEST_DATE = "2024-01-01";
const HIGH_TIDE_TIME = "2024-01-01 06:30";
const LOW_TIDE_TIME = "2024-01-01 12:45";
const HIGH_TIDE_HEIGHT = 5.2;
const LOW_TIDE_HEIGHT = 0.3;
const STATION_NAME = "Springmaid Pier";
const STATION_ID = "8661070";

const HIGH_TIDE: TidePrediction = {
  time: HIGH_TIDE_TIME,
  height: HIGH_TIDE_HEIGHT,
  type: TideType.High,
};

const LOW_TIDE: TidePrediction = {
  time: LOW_TIDE_TIME,
  height: LOW_TIDE_HEIGHT,
  type: TideType.Low,
};

describe("formatTides", () => {
  it("formatTides_emptyArray_returnsEmptyString", () => {
    expect(formatTides([])).toBe("");
  });

  it("formatTides_singleHighTide_returnsFormattedTideString", () => {
    expect(formatTides([HIGH_TIDE])).toBe("H5.2ft@06:30");
  });

  it("formatTides_multipleTides_returnsSpaceSeparatedString", () => {
    expect(formatTides([HIGH_TIDE, LOW_TIDE])).toBe(
      "H5.2ft@06:30 L0.3ft@12:45"
    );
  });
});

describe("formatForecastTable", () => {
  const result: ForecastResult = {
    station: "Test Station",
    spotId: "test-123",
    tideStation: {
      id: STATION_ID,
      name: STATION_NAME,
      lat: 33.65,
      lng: -78.92,
    },
    forecast: [
      {
        day: "Mon",
        date: TEST_DATE,
        period: "AM",
        windSpeed: 10,
        windDirDeg: 180,
        windDirCompass: "S",
        waveHeight: 2,
        gust: 15,
        tempF: 65,
        cloudPct: 30,
        precipPct: 10,
        moonPhase: MoonPhase.WaxingGibbous,
        moonIllumination: 80,
        tides: [HIGH_TIDE],
      },
      {
        day: "Mon",
        date: TEST_DATE,
        period: "PM",
        windSpeed: 12,
        windDirDeg: 200,
        windDirCompass: "SSW",
        waveHeight: 3,
        gust: 18,
        tempF: 68,
        cloudPct: 50,
        precipPct: 20,
        moonPhase: MoonPhase.WaxingGibbous,
        moonIllumination: 80,
        tides: [],
      },
    ],
  };

  it("formatForecastTable_validResult_includesStationName", () => {
    const output = formatForecastTable(result);
    expect(output).toContain("Test Station - 7 Day Forecast");
  });

  it("formatForecastTable_resultWithTideStation_includesTideStationInfo", () => {
    const output = formatForecastTable(result);
    expect(output).toContain(`${STATION_NAME} (NOAA ${STATION_ID})`);
  });

  it("formatForecastTable_validResult_includesDayHeaderWithMoonPhase", () => {
    const output = formatForecastTable(result);
    expect(output).toContain(
      `--- Mon ${TEST_DATE} | Last Night: ${MoonPhase.WaxingGibbous} 80% ---`
    );
  });

  it("formatForecastTable_validResult_includesWindData", () => {
    const output = formatForecastTable(result);
    expect(output).toContain("Wind 10 mph");
  });

  it("formatForecastTable_rowWithTides_includesFormattedTidesInHeader", () => {
    const output = formatForecastTable(result);
    expect(output).toContain("Tides: H5.2ft@06:30");
  });
});

describe("formatTideReport", () => {
  const result: TideResult = {
    station: {
      id: STATION_ID,
      name: STATION_NAME,
      lat: 33.65,
      lng: -78.92,
    },
    predictions: [HIGH_TIDE, LOW_TIDE],
    byDate: {
      [TEST_DATE]: [HIGH_TIDE, LOW_TIDE],
    },
  };

  it("formatTideReport_validResult_includesStationNameAndId", () => {
    const output = formatTideReport(result);
    expect(output).toContain(`${STATION_NAME} (NOAA ${STATION_ID})`);
  });

  it("formatTideReport_validResult_includesDateHeaders", () => {
    const output = formatTideReport(result);
    expect(output).toContain(TEST_DATE);
  });

  it("formatTideReport_validResult_includesTideHeightsAndTimes", () => {
    const output = formatTideReport(result);
    expect(output).toContain(`${TideType.High} ${HIGH_TIDE_HEIGHT.toFixed(1)} ft  @ 06:30`);
    expect(output).toContain(`${TideType.Low}  ${LOW_TIDE_HEIGHT.toFixed(1)} ft  @ 12:45`);
  });
});
