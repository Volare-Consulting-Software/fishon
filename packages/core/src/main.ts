#!/usr/bin/env node
import "reflect-metadata";
import "./container";
import { container } from "tsyringe";
import { ForecastService } from "./services/forecastService";
import { TOKENS, ITideProvider } from "./interfaces";
import {
  formatForecastTable,
  formatTideReport,
} from "./formatters/forecastFormatter";

function printUsage(): void {
  console.log("Usage: fishweather <location> [options]");
  console.log("");
  console.log("  Searches FishWeather for the given location and pulls the");
  console.log("  7-day wind/wave forecast from the first free station found.");
  console.log("  Includes NOAA tide predictions and moon phase data.");
  console.log("");
  console.log("Examples:");
  console.log('  fishweather "southport, nc"');
  console.log('  fishweather "key west, fl" --json');
  console.log('  fishweather "outer banks" --visible');
  console.log('  fishweather "southport, nc" --tides');
  console.log("");
  console.log("Options:");
  console.log("  --json       Output as JSON instead of a table");
  console.log("  --visible    Show the browser window (for debugging)");
  console.log("  --tides      Show only NOAA tide predictions (no weather)");
  console.log("  --mcp        Start as an MCP server (for Claude Code)");
}

async function main(): Promise<void> {
  if (process.argv.includes("--mcp")) {
    await import("./mcpServer");
    return;
  }

  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const location = args.join(" ").trim();

  if (!location) {
    printUsage();
    process.exit(1);
  }

  const outputJson = process.argv.includes("--json");
  const tidesOnly = process.argv.includes("--tides");
  const headless = !process.argv.includes("--visible");

  try {
    if (tidesOnly) {
      console.log(`Fetching tides near "${location}"...`);
      const tideProvider = container.resolve<ITideProvider>(TOKENS.ITideProvider);
      const result = await tideProvider.getTides(location);
      if (outputJson) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatTideReport(result));
      }
    } else {
      console.log(`Searching for stations near "${location}"...`);
      const service = container.resolve(ForecastService);
      const result = await service.getForecast(location, headless);
      console.log(`Found station: ${result.station} (ID: ${result.spotId})`);
      if (outputJson) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatForecastTable(result));
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Error:", message);
    process.exit(1);
  }
}

main();
