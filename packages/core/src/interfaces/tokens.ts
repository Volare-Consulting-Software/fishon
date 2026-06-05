function createTokens<const T extends readonly string[]>(
  keys: T
): { [K in T[number]]: symbol } {
  return Object.fromEntries(keys.map((k) => [k, Symbol(k)])) as {
    [K in T[number]]: symbol;
  };
}

export const TOKENS = createTokens([
  "IHttpClient",
  "IGeocoder",
  "ITideProvider",
  "IMoonPhaseProvider",
  "IWeatherScraper",
  "ILogger",
  "ForecastServiceConfig",
] as const);
