import {
  container,
  TOKENS,
  ForecastService,
  type Geocoder,
  type TideProvider,
  type MoonPhaseProvider,
  type FishingSpotProvider,
  type SpeciesProvider,
  type SpeciesEnrichmentProvider,
  type MarineHourlyProvider,
} from "@volare-consulting/fishon";
import { ReportOrchestrator } from "./reportOrchestrator";
import { SuggestionService } from "./suggestionService";

// Build the web-only orchestrator from the SAME core services the MCP server
// uses (resolved from the shared tsyringe container).
export function createOrchestrator(): ReportOrchestrator {
  return new ReportOrchestrator(
    container.resolve(ForecastService),
    container.resolve<Geocoder>(TOKENS.Geocoder),
    container.resolve<TideProvider>(TOKENS.TideProvider),
    container.resolve<MoonPhaseProvider>(TOKENS.MoonPhaseProvider),
    container.resolve<FishingSpotProvider>(TOKENS.FishingSpotProvider),
    container.resolve<SpeciesProvider>(TOKENS.SpeciesProvider),
    container.resolve<SpeciesEnrichmentProvider>(
      TOKENS.SpeciesEnrichmentProvider
    ),
    container.resolve<MarineHourlyProvider>(TOKENS.MarineHourlyProvider),
    new SuggestionService()
  );
}
