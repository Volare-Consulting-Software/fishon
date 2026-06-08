function createTokens<const T extends readonly string[]>(
  keys: T
): { [K in T[number]]: symbol } {
  return Object.fromEntries(keys.map((k) => [k, Symbol(k)])) as {
    [K in T[number]]: symbol;
  };
}

export const TOKENS = createTokens([
  "HttpClient",
  "Geocoder",
  "TideProvider",
  "MoonPhaseProvider",
  "WeatherScraper",
  "Logger",
  "FishingSpotProvider",
  "SpeciesProvider",
  "FishRulesClient",
  "SpeciesEnrichmentProvider",
  "SpeciesRegulationsProvider",
  "MarineHourlyProvider",
  "ForecastServiceConfig",
] as const);
