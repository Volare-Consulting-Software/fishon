import "reflect-metadata";
import "./container";
import { container } from "tsyringe";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ForecastService } from "./services/forecastService";
import { TOKENS, ITideProvider } from "./interfaces";
import {
  formatForecastTable,
  formatTideReport,
} from "./formatters/forecastFormatter";

const server = new McpServer({
  name: "fishweather",
  version: "1.0.0",
});

server.tool(
  "get_forecast",
  "Get the 7-day fishing forecast for a given location. Returns wind speed, " +
    "gust, wind direction (where wind is blowing from), wave height, air temperature, " +
    "cloud cover, rain chance, moon phase, and NOAA tide predictions (high/low) " +
    "for each morning (AM) and afternoon (PM).",
  {
    location: z
      .string()
      .describe(
        'Location to search for (city/state, landmark, zip). Example: "southport, nc"'
      ),
  },
  async ({ location }) => {
    try {
      const service = container.resolve(ForecastService);
      const result = await service.getForecast(location);
      const text = formatForecastTable(result);

      return {
        content: [
          { type: "text" as const, text },
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
            annotations: { audience: ["assistant" as const] },
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_tides",
  "Get NOAA high/low tide predictions for a given location. " +
    "Finds the nearest NOAA tide prediction station and returns " +
    "7 days of high and low tide times and heights (in feet, MLLW datum).",
  {
    location: z
      .string()
      .describe(
        'Location to search for (city/state, landmark, zip). Example: "southport, nc"'
      ),
    days: z
      .number()
      .optional()
      .default(7)
      .describe("Number of days of tide predictions (default: 7)"),
  },
  async ({ location, days }) => {
    try {
      const tideProvider = container.resolve<ITideProvider>(TOKENS.ITideProvider);
      const result = await tideProvider.getTides(location, days);
      const text = formatTideReport(result);

      return {
        content: [
          { type: "text" as const, text },
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
            annotations: { audience: ["assistant" as const] },
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  }
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
