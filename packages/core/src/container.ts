import "reflect-metadata";
import { container } from "tsyringe";
import { TOKENS } from "./interfaces";
import { DEFAULT_CONFIG } from "./config";
import {
  NodeHttpsClient,
  ArcGisGeocoder,
  NoaaTideProvider,
  SynodicMoonPhaseProvider,
  FishweatherScraper,
  ConsoleLogger,
  PublicDataFishingSpotProvider,
  ObisSpeciesProvider,
  FishRulesApiClient,
  FishRulesSpeciesProvider,
  WebSpeciesEnrichmentProvider,
  RegulationsProvider,
  NoaaHourlyWindProvider,
} from "./services";

container.register(TOKENS.ForecastServiceConfig, { useValue: DEFAULT_CONFIG });
container.register(TOKENS.HttpClient, { useClass: NodeHttpsClient });
container.register(TOKENS.Logger, { useClass: ConsoleLogger });
container.register(TOKENS.Geocoder, { useClass: ArcGisGeocoder });
container.register(TOKENS.TideProvider, { useClass: NoaaTideProvider });
container.register(TOKENS.MoonPhaseProvider, { useClass: SynodicMoonPhaseProvider });
container.register(TOKENS.WeatherScraper, { useClass: FishweatherScraper });
container.register(TOKENS.FishingSpotProvider, { useClass: PublicDataFishingSpotProvider });
// Singleton so the area/detail/credential caches are shared across the species
// and regulations providers (one Fish Rules round-trip per area per process).
container.registerSingleton(TOKENS.FishRulesClient, FishRulesApiClient);
// Fish Rules is the primary species source; it falls back to OBIS internally.
container.register(TOKENS.SpeciesProvider, { useClass: FishRulesSpeciesProvider });
container.register(TOKENS.SpeciesRegulationsProvider, {
  useClass: RegulationsProvider,
});
container.register(TOKENS.SpeciesEnrichmentProvider, {
  useClass: WebSpeciesEnrichmentProvider,
});
container.register(TOKENS.MarineHourlyProvider, {
  useClass: NoaaHourlyWindProvider,
});

export { container };
