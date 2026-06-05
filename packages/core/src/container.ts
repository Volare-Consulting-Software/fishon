import "reflect-metadata";
import { container } from "tsyringe";
import { TOKENS } from "./interfaces";
import { DEFAULT_CONFIG } from "./config";
import {
  HttpClient,
  ArcGisGeocoder,
  NoaaTideProvider,
  MoonPhaseProvider,
  FishweatherScraper,
  ConsoleLogger,
} from "./services";

container.register(TOKENS.ForecastServiceConfig, { useValue: DEFAULT_CONFIG });
container.register(TOKENS.IHttpClient, { useClass: HttpClient });
container.register(TOKENS.ILogger, { useClass: ConsoleLogger });
container.register(TOKENS.IGeocoder, { useClass: ArcGisGeocoder });
container.register(TOKENS.ITideProvider, { useClass: NoaaTideProvider });
container.register(TOKENS.IMoonPhaseProvider, { useClass: MoonPhaseProvider });
container.register(TOKENS.IWeatherScraper, { useClass: FishweatherScraper });

export { container };
