export interface ForecastServiceConfig {
  noaaApiUrl: string;
  noaaStationsApiUrl: string;
  geocodeApiUrl: string;
  fishweatherBaseUrl: string;
  browserTimeout: number;
  selectorTimeout: number;
  forecastDays: number;
}

export const DEFAULT_CONFIG: ForecastServiceConfig = {
  noaaApiUrl: "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter",
  noaaStationsApiUrl:
    "https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions&units=english",
  geocodeApiUrl:
    "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates",
  fishweatherBaseUrl: "https://fishweather.com",
  browserTimeout: 60000,
  selectorTimeout: 20000,
  forecastDays: 7,
};
