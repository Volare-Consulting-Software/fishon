import { describe, it, expect, beforeEach } from "vitest";
import { Mock, It, Times } from "moq.ts";
import {
  IWeatherScraper,
  ITideProvider,
  IMoonPhaseProvider,
  ILogger,
} from "../src/interfaces";
import { ForecastService } from "../src/services/forecastService";
import { ForecastRow } from "../src/types/forecastRow";
import { MoonPhase } from "../src/types/moonPhase";
import { TideResult } from "../src/types/tide";
import { TideType } from "../src/types/tideType";
import { registerMocks, container } from "./testContainer";

const TEST_DATE = "2024-01-02";
const PREV_NIGHT_DATE = "2024-01-01";
const TEST_STATION_NAME = "Test Station";
const TEST_STATION_ID = "test-123";
const TIDE_STATION_NAME = "Springmaid Pier";
const TIDE_STATION_ID = "8661070";
const MOCK_MOON_PHASE = MoonPhase.WaxingGibbous;
const MOCK_MOON_ILLUMINATION = 80;
const MOCK_MOON_AGE = 11.5;

const baseForecastRow: ForecastRow = {
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
  moonPhase: "",
  moonIllumination: 0,
  tides: [],
};

const mockTideResult: TideResult = {
  station: {
    id: TIDE_STATION_ID,
    name: TIDE_STATION_NAME,
    lat: 33.65,
    lng: -78.92,
  },
  predictions: [
    { time: `${TEST_DATE} 06:30`, height: 5.2, type: TideType.High },
  ],
  byDate: {
    [TEST_DATE]: [
      { time: `${TEST_DATE} 06:30`, height: 5.2, type: TideType.High },
    ],
  },
};

describe("ForecastService", () => {
  let service: ForecastService;
  let weatherScraperMock: Mock<IWeatherScraper>;
  let tideProviderMock: Mock<ITideProvider>;
  let moonProviderMock: Mock<IMoonPhaseProvider>;
  let loggerMock: Mock<ILogger>;

  function setupDefaultMocks() {
    weatherScraperMock = new Mock<IWeatherScraper>();
    weatherScraperMock
      .setup((instance) => instance.getForecast(It.IsAny(), It.IsAny()))
      .returnsAsync({
        station: { id: TEST_STATION_ID, name: TEST_STATION_NAME },
        forecast: [{ ...baseForecastRow }],
      });

    tideProviderMock = new Mock<ITideProvider>();
    tideProviderMock
      .setup((instance) => instance.getTides(It.IsAny()))
      .returnsAsync(mockTideResult);

    moonProviderMock = new Mock<IMoonPhaseProvider>();
    moonProviderMock
      .setup((instance) => instance.getPhase(It.IsAny()))
      .returns({
        phase: MOCK_MOON_PHASE,
        illumination: MOCK_MOON_ILLUMINATION,
        age: MOCK_MOON_AGE,
      });
    moonProviderMock
      .setup((instance) => instance.getPhasesForDays(It.IsAny(), It.IsAny()))
      .returns({
        [PREV_NIGHT_DATE]: {
          phase: MOCK_MOON_PHASE,
          illumination: MOCK_MOON_ILLUMINATION,
          age: MOCK_MOON_AGE,
        },
      });

    loggerMock = new Mock<ILogger>();
    loggerMock.setup((instance) => instance.info(It.IsAny())).returns();
    loggerMock.setup((instance) => instance.warn(It.IsAny())).returns();
    loggerMock.setup((instance) => instance.error(It.IsAny())).returns();
  }

  function registerAllMocks(overrides?: {
    ITideProvider?: Mock<ITideProvider>;
  }) {
    registerMocks({
      IWeatherScraper: weatherScraperMock,
      ITideProvider: overrides?.ITideProvider ?? tideProviderMock,
      IMoonPhaseProvider: moonProviderMock,
      ILogger: loggerMock,
    });
    service = container.resolve(ForecastService);
  }

  beforeEach(() => {
    setupDefaultMocks();
    registerAllMocks();
  });

  it("getForecast_validLocation_returnsCompleteForecastResult", async () => {
    const result = await service.getForecast("southport, nc");
    expect(result.station).toBe(TEST_STATION_NAME);
    expect(result.spotId).toBe(TEST_STATION_ID);
    expect(result.forecast).toHaveLength(1);
  });

  it("getForecast_validLocation_enrichesRowsWithMoonPhase", async () => {
    const result = await service.getForecast("southport, nc");
    expect(result.forecast[0]!.moonPhase).toBe(MOCK_MOON_PHASE);
    expect(result.forecast[0]!.moonIllumination).toBe(MOCK_MOON_ILLUMINATION);
  });

  it("getForecast_validLocation_enrichesRowsWithTideData", async () => {
    const result = await service.getForecast("southport, nc");
    expect(result.forecast[0]!.tides).toHaveLength(1);
    expect(result.forecast[0]!.tides[0]!.type).toBe(TideType.High);
  });

  it("getForecast_validLocation_includesTideStationInResult", async () => {
    const result = await service.getForecast("southport, nc");
    expect(result.tideStation).not.toBeNull();
    expect(result.tideStation!.name).toBe(TIDE_STATION_NAME);
  });

  it("getForecast_tideProviderThrows_logsWarningAndReturnsEmptyTides", async () => {
    const failingTideMock = new Mock<ITideProvider>();
    failingTideMock
      .setup((instance) => instance.getTides(It.IsAny()))
      .callback(() => Promise.reject(new Error("NOAA is down")));

    registerAllMocks({ ITideProvider: failingTideMock });

    const result = await service.getForecast("southport, nc");
    expect(result.forecast[0]!.tides).toEqual([]);
    expect(result.tideStation).toBeNull();
    loggerMock.verify(
      (instance) => instance.warn(It.IsAny()),
      Times.Once()
    );
  });

  it("getForecast_moonPhase_usesPreviousNightNotForecastDate", async () => {
    moonProviderMock = new Mock<IMoonPhaseProvider>();
    moonProviderMock
      .setup((instance) => instance.getPhase(It.IsAny()))
      .returns({ phase: MoonPhase.NewMoon, illumination: 0, age: 0 });
    moonProviderMock
      .setup((instance) => instance.getPhasesForDays(It.IsAny(), It.IsAny()))
      .returns({
        [TEST_DATE]: {
          phase: MoonPhase.NewMoon,
          illumination: 0,
          age: 0,
        },
        [PREV_NIGHT_DATE]: {
          phase: MoonPhase.FullMoon,
          illumination: 99,
          age: 14.8,
        },
      });

    registerAllMocks();

    const result = await service.getForecast("southport, nc");
    expect(result.forecast[0]!.moonPhase).toBe(MoonPhase.FullMoon);
    expect(result.forecast[0]!.moonIllumination).toBe(99);
  });

  it("getForecast_noMoonDataForPreviousNight_fallsBackToDefaults", async () => {
    moonProviderMock = new Mock<IMoonPhaseProvider>();
    moonProviderMock
      .setup((instance) => instance.getPhase(It.IsAny()))
      .returns({ phase: MoonPhase.NewMoon, illumination: 0, age: 0 });
    moonProviderMock
      .setup((instance) => instance.getPhasesForDays(It.IsAny(), It.IsAny()))
      .returns({
        [TEST_DATE]: {
          phase: MoonPhase.FullMoon,
          illumination: 99,
          age: 14.8,
        },
      });

    registerAllMocks();

    const result = await service.getForecast("southport, nc");
    expect(result.forecast[0]!.moonPhase).toBe("");
    expect(result.forecast[0]!.moonIllumination).toBe(0);
  });

  it("getForecast_noTidesForForecastDate_setsEmptyTidesArray", async () => {
    const emptyTideMock = new Mock<ITideProvider>();
    emptyTideMock
      .setup((instance) => instance.getTides(It.IsAny()))
      .returnsAsync({ ...mockTideResult, byDate: {} });

    registerAllMocks({ ITideProvider: emptyTideMock });

    const result = await service.getForecast("southport, nc");
    expect(result.forecast[0]!.tides).toEqual([]);
  });
});
