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
container.register(TOKENS.SpeciesProvider, { useClass: ObisSpeciesProvider });
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
