// Public barrel for the deterministic core. The web app imports everything it
// needs from "@volare-consulting/fishweather-forecast" through here, so the
// MCP server, the CLI, and the web API routes all share one source of truth.
import "reflect-metadata";

export { container } from "./container";
export * from "./interfaces";
export * from "./services";
export { DEFAULT_CONFIG } from "./config";
export type { ForecastServiceConfig } from "./config";

export * from "./types/forecastResult";
export * from "./types/forecastRow";
export * from "./types/geo";
export * from "./types/moon";
export * from "./types/moonPhase";
export * from "./types/station";
export * from "./types/tide";
export * from "./types/tideType";
export * from "./types/wind";
export * from "./types/fishingSpot";
export * from "./types/fishSpecies";
export * from "./types/speciesProfile";
export * from "./types/hourlyWind";
