import {
  container,
  TOKENS,
  ForecastService,
  type IGeocoder,
  type ITideProvider,
  type IMoonPhaseProvider,
  type IFishingSpotProvider,
  type ISpeciesProvider,
  type ISpeciesEnrichmentProvider,
  type IMarineHourlyProvider,
} from "@volare-consulting/fishweather-forecast";
import { ReportOrchestrator } from "./reportOrchestrator";
import { SuggestionService } from "./suggestionService";

// Build the web-only orchestrator from the SAME core services the MCP server
// uses (resolved from the shared tsyringe container).
export function createOrchestrator(): ReportOrchestrator {
  return new ReportOrchestrator(
    container.resolve(ForecastService),
    container.resolve<IGeocoder>(TOKENS.IGeocoder),
    container.resolve<ITideProvider>(TOKENS.ITideProvider),
    container.resolve<IMoonPhaseProvider>(TOKENS.IMoonPhaseProvider),
    container.resolve<IFishingSpotProvider>(TOKENS.IFishingSpotProvider),
    container.resolve<ISpeciesProvider>(TOKENS.ISpeciesProvider),
    container.resolve<ISpeciesEnrichmentProvider>(
      TOKENS.ISpeciesEnrichmentProvider
    ),
    container.resolve<IMarineHourlyProvider>(TOKENS.IMarineHourlyProvider),
    new SuggestionService()
  );
}
