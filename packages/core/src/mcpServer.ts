import "reflect-metadata";
import "./container";
import { container } from "tsyringe";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ForecastService } from "./services/forecastService";
import {
  TOKENS,
  Geocoder,
  TideProvider,
  FishingSpotProvider,
  SpeciesProvider,
  SpeciesEnrichmentProvider,
  MarineHourlyProvider,
} from "./interfaces";
import { FishweatherApiClient } from "./apiClient";
import { ForecastResult } from "./types/forecastResult";
import { TideResult } from "./types/tide";
import { FishingSpot } from "./types/fishingSpot";
import { FishSpecies } from "./types/fishSpecies";
import { SpeciesProfile } from "./types/speciesProfile";
import { HourlyWindResult } from "./types/hourlyWind";
import {
  formatForecastTable,
  formatTideReport,
  formatSpotsReport,
  formatSpeciesReport,
  formatSpeciesProfilesReport,
} from "./formatters/forecastFormatter";

const PROFILE_SPECIES_COUNT = 8;

// One data-source contract, two transports. In embedded mode the methods
// resolve the core services directly; in API mode they call the public HTTP
// endpoints — which are themselves thin wrappers over the same core services.
interface FishweatherDataSource {
  getForecast(location: string): Promise<ForecastResult>;
  getTides(location: string, days: number): Promise<TideResult>;
  getSpots(location: string, radiusMiles: number): Promise<FishingSpot[]>;
  getSpecies(location: string): Promise<FishSpecies[]>;
  getSpeciesProfiles(location: string): Promise<SpeciesProfile[]>;
  getHourlyWind(location: string): Promise<HourlyWindResult>;
}

async function embeddedHourlyWind(location: string): Promise<HourlyWindResult> {
  const geo = await container.resolve<Geocoder>(TOKENS.Geocoder).geocode(location);
  return container
    .resolve<MarineHourlyProvider>(TOKENS.MarineHourlyProvider)
    .getHourlyWind(geo.lat, geo.lng);
}

function createDataSource(): FishweatherDataSource {
  const apiBaseUrl = process.env["FISHWEATHER_API_BASE_URL"];
  if (apiBaseUrl) {
    const client = new FishweatherApiClient(apiBaseUrl);
    return {
      getForecast: (location) => client.getForecast(location),
      getTides: (location, days) => client.getTides(location, days),
      getSpots: (location, radiusMiles) => client.getSpots(location, radiusMiles),
      getSpecies: (location) => client.getSpecies(location),
      getSpeciesProfiles: (location) => client.getSpeciesProfiles(location),
      getHourlyWind: (location) => embeddedHourlyWind(location),
    };
  }
  return {
    getForecast: (location) =>
      container.resolve(ForecastService).getForecast(location),
    getTides: (location, days) =>
      container.resolve<TideProvider>(TOKENS.TideProvider).getTides(location, days),
    getSpots: (location, radiusMiles) =>
      container
        .resolve<FishingSpotProvider>(TOKENS.FishingSpotProvider)
        .getSpots(location, radiusMiles),
    getSpecies: (location) =>
      container
        .resolve<SpeciesProvider>(TOKENS.SpeciesProvider)
        .getSpecies(location),
    getSpeciesProfiles: async (location) => {
      const [geo, species] = await Promise.all([
        container.resolve<Geocoder>(TOKENS.Geocoder).geocode(location),
        container
          .resolve<SpeciesProvider>(TOKENS.SpeciesProvider)
          .getSpecies(location),
      ]);
      return container
        .resolve<SpeciesEnrichmentProvider>(TOKENS.SpeciesEnrichmentProvider)
        .enrich(species.slice(0, PROFILE_SPECIES_COUNT), geo);
    },
    getHourlyWind: (location) => embeddedHourlyWind(location),
  };
}

const dataSource = createDataSource();

const locationArg = z
  .string()
  .describe(
    'Location to search for (city/state, landmark, zip). Example: "southport, nc"'
  );

function dualContent(text: string, data: unknown) {
  return {
    content: [
      { type: "text" as const, text },
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
        annotations: { audience: ["assistant" as const] },
      },
    ],
  };
}

function errorContent(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true,
  };
}

const server = new McpServer({
  name: "fishweather",
  version: "1.1.0",
});

server.tool(
  "get_forecast",
  "Get the 7-day fishing forecast for a given location. Returns wind speed, " +
    "gust, wind direction (where wind is blowing from), wave height, air temperature, " +
    "cloud cover, rain chance, moon phase, and NOAA tide predictions (high/low) " +
    "for each morning (AM) and afternoon (PM).",
  { location: locationArg },
  async ({ location }) => {
    try {
      const result = await dataSource.getForecast(location);
      return dualContent(formatForecastTable(result), result);
    } catch (err) {
      return errorContent(err);
    }
  }
);

server.tool(
  "get_tides",
  "Get NOAA high/low tide predictions for a given location. " +
    "Finds the nearest NOAA tide prediction station and returns " +
    "7 days of high and low tide times and heights (in feet, MLLW datum).",
  {
    location: locationArg,
    days: z
      .number()
      .optional()
      .default(7)
      .describe("Number of days of tide predictions (default: 7)"),
  },
  async ({ location, days }) => {
    try {
      const result = await dataSource.getTides(location, days);
      return dualContent(formatTideReport(result), result);
    } catch (err) {
      return errorContent(err);
    }
  }
);

server.tool(
  "get_fishing_spots",
  "Get nearby fishing spots and structures for a given location: artificial " +
    "reefs (with material and depth where available) from state/NOAA datasets, " +
    "plus piers, jetties/breakwaters, and designated fishing spots from " +
    "OpenStreetMap. Each spot includes its kind, distance in miles, and source.",
  {
    location: locationArg,
    radiusMiles: z
      .number()
      .optional()
      .default(50)
      .describe("Search radius in miles (default: 50)"),
  },
  async ({ location, radiusMiles }) => {
    try {
      const result = await dataSource.getSpots(location, radiusMiles);
      return dualContent(formatSpotsReport(result), result);
    } catch (err) {
      return errorContent(err);
    }
  }
);

server.tool(
  "get_species",
  "Get fish species recorded near a given location, ranked by occurrence " +
    "count. Uses OBIS marine occurrence data (so results are real local fish) " +
    "with English common names from WoRMS. Useful for grounding suggestions " +
    "about what is realistically catchable in the area.",
  { location: locationArg },
  async ({ location }) => {
    try {
      const result = await dataSource.getSpecies(location);
      return dualContent(formatSpeciesReport(result), result);
    } catch (err) {
      return errorContent(err);
    }
  }
);

server.tool(
  "get_species_profiles",
  "Get enriched profiles for the top fish species near a location: a photo " +
    "(iNaturalist), a short description (Wikipedia), a non-official edibility " +
    "rating derived from the description, regulations (bag/size where Fish Rules " +
    "credentials are configured), and an outbound link to the official state " +
    "recreational regulations.",
  { location: locationArg },
  async ({ location }) => {
    try {
      const result = await dataSource.getSpeciesProfiles(location);
      return dualContent(formatSpeciesProfilesReport(result), result);
    } catch (err) {
      return errorContent(err);
    }
  }
);

server.tool(
  "get_hourly_wind",
  "Get the NOAA NWS hourly wind forecast (speed, gust, direction) for a " +
    "location, grouped by local date. Provides intraday wind detail the AM/PM " +
    "scrape cannot. Wave height is not included here (NDFD gridpoints are too " +
    "coarse for waves).",
  { location: locationArg },
  async ({ location }) => {
    try {
      const result = await dataSource.getHourlyWind(location);
      return dualContent(
        `Hourly wind grouped by date (timezone ${result.timeZone}).`,
        result
      );
    } catch (err) {
      return errorContent(err);
    }
  }
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
