export interface ReefService {
  name: string;
  url: string;
  source: string;
  /** Optional state filter (2-letter); national services omit this. */
  state?: string;
}

export interface StateRegulation {
  url: string;
  label: string;
}

export interface ForecastServiceConfig {
  // --- existing core ---
  noaaApiUrl: string;
  noaaStationsApiUrl: string;
  geocodeApiUrl: string;
  geocodeSuggestUrl: string;
  fishweatherBaseUrl: string;
  browserTimeout: number;
  selectorTimeout: number;
  forecastDays: number;

  // --- fishing spots / structures ---
  reefServices: ReefService[];
  overpassApiUrl: string;

  // --- species (OBIS occurrences + WoRMS vernaculars) ---
  obisApiUrl: string;
  wormsApiUrl: string;
  /** WoRMS AphiaID for Actinopterygii (ray-finned fish). */
  fishTaxonId: number;
  /** Curated lowercase genera anglers actually target, to filter OBIS noise. */
  targetGenera: string[];

  // --- species enrichment ---
  inaturalistApiUrl: string;
  wikipediaApiUrl: string;

  // --- regulations (Fish Rules, gated) + per-state fallback links ---
  fishRulesApiUrl: string;
  stateRegulations: Record<string, StateRegulation>;

  // --- NOAA NWS gridpoint (hourly wind) ---
  weatherGovApiUrl: string;

  userAgent: string;
}

// Genera commonly targeted by recreational saltwater anglers (lowercase). Used
// to filter the OBIS occurrence list down to fish people actually fish for.
const TARGET_GENERA = [
  "centropristis", "lagodon", "stenotomus", "micropogonias", "menticirrhus",
  "coryphaena", "haemulon", "scophthalmus", "cynoscion", "paralichthys",
  "pomatomus", "scomberomorus", "pagrus", "calamus", "rhomboplites", "caranx",
  "bairdiella", "balistes", "chaetodipterus", "seriola", "sphyraena", "lutjanus",
  "epinephelus", "mycteroperca", "sciaenops", "archosargus", "lobotes",
  "trachinotus", "pogonias", "leiostomus", "morone", "megalops", "elops",
  "albula", "sarda", "euthynnus", "thunnus", "katsuwonus", "makaira",
  "istiophorus", "xiphias", "centropomus", "ocyurus", "mugil", "opsanus",
  "prionotus", "selene", "alectis", "pomacanthus", "lachnolaimus", "halichoeres",
  "diplodus", "orthopristis", "lepisosteus", "esox", "micropterus", "pomoxis",
  "lepomis", "perca", "sander", "ictalurus", "ameiurus", "salvelinus",
  "oncorhynchus", "salmo", "acanthocybium", "tylosurus", "strongylura",
  "rachycentron", "anisotremus", "kyphosus", "umbrina", "menidia",
];

// Per-state recreational saltwater regulation pages (keyed by 2-letter code).
const STATE_REGULATIONS: Record<string, StateRegulation> = {
  NC: { url: "https://www.deq.nc.gov/marine-fisheries", label: "North Carolina (DMF) saltwater regulations" },
  SC: { url: "https://www.dnr.sc.gov/regulations.html", label: "South Carolina (DNR) saltwater regulations" },
  GA: { url: "https://coastalgadnr.org/recreational-fishing-regulations", label: "Georgia (Coastal Resources) saltwater regulations" },
  FL: { url: "https://myfwc.com/fishing/saltwater/recreational/", label: "Florida (FWC) saltwater regulations" },
  VA: { url: "https://mrc.virginia.gov/regulations/swrecfishing.shtm", label: "Virginia (MRC) saltwater regulations" },
  MD: { url: "https://dnr.maryland.gov/fisheries/pages/regulations/index.aspx", label: "Maryland (DNR) fishing regulations" },
  DE: { url: "https://dnrec.alpha.delaware.gov/fish-wildlife/fishing/", label: "Delaware (DNREC) fishing regulations" },
  NJ: { url: "https://dep.nj.gov/njfw/fishing/marine/", label: "New Jersey (DEP) marine regulations" },
  NY: { url: "https://dec.ny.gov/things-to-do/saltwater-fishing", label: "New York (DEC) saltwater regulations" },
  CT: { url: "https://portal.ct.gov/deep/fishing/saltwater/saltwater-fishing", label: "Connecticut (DEEP) saltwater regulations" },
  RI: { url: "https://dem.ri.gov/natural-resources-bureau/fish-wildlife/marine-fisheries", label: "Rhode Island (DEM) marine regulations" },
  MA: { url: "https://www.mass.gov/recreational-saltwater-fishing-regulations", label: "Massachusetts (DMF) saltwater regulations" },
  NH: { url: "https://www.wildlife.nh.gov/fishing-new-hampshire/saltwater-fishing", label: "New Hampshire (F&G) saltwater regulations" },
  ME: { url: "https://www.maine.gov/dmr/fisheries/recreational", label: "Maine (DMR) recreational regulations" },
  TX: { url: "https://tpwd.texas.gov/regulations/outdoor-annual/fishing/saltwater-fishing", label: "Texas (TPWD) saltwater regulations" },
  LA: { url: "https://www.wlf.louisiana.gov/page/saltwater-sport-fishing", label: "Louisiana (WLF) saltwater regulations" },
  MS: { url: "https://dmr.ms.gov/recreational-fishing/", label: "Mississippi (DMR) recreational regulations" },
  AL: { url: "https://www.outdooralabama.com/saltwater-fishing", label: "Alabama (DCNR) saltwater regulations" },
  CA: { url: "https://wildlife.ca.gov/Fishing/Ocean", label: "California (CDFW) ocean regulations" },
  OR: { url: "https://myodfw.com/recreation-report/fishing-report", label: "Oregon (ODFW) fishing regulations" },
  WA: { url: "https://wdfw.wa.gov/fishing/regulations", label: "Washington (WDFW) fishing regulations" },
  default: { url: "https://www.fisheries.noaa.gov/recreational-fishing", label: "NOAA recreational fishing regulations" },
};

export const DEFAULT_CONFIG: ForecastServiceConfig = {
  noaaApiUrl: "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter",
  noaaStationsApiUrl:
    "https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions&units=english",
  geocodeApiUrl:
    "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates",
  geocodeSuggestUrl:
    "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest",
  fishweatherBaseUrl: "https://fishweather.com",
  browserTimeout: 60000,
  selectorTimeout: 20000,
  forecastDays: 7,

  reefServices: [
    {
      name: "NOAA Artificial Reefs",
      url: "https://coast.noaa.gov/arcgis/rest/services/Hosted/ArtificialReefs/FeatureServer/0",
      source: "NOAA",
    },
    {
      name: "Florida FWC Artificial Reefs",
      url: "https://gis.myfwc.com/mapping/rest/services/Open_Data/Artificial_Reef_Locations_in_Florida/MapServer/12",
      source: "FWC",
      state: "FL",
    },
  ],
  overpassApiUrl: "https://overpass-api.de/api/interpreter",

  obisApiUrl: "https://api.obis.org/v3",
  wormsApiUrl: "https://www.marinespecies.org/rest",
  fishTaxonId: 10194,
  targetGenera: TARGET_GENERA,

  inaturalistApiUrl: "https://api.inaturalist.org/v1",
  wikipediaApiUrl: "https://en.wikipedia.org/api/rest_v1",

  fishRulesApiUrl: "https://app.fishrulesapp.com/api/regulations",
  stateRegulations: STATE_REGULATIONS,

  weatherGovApiUrl: "https://api.weather.gov",

  userAgent:
    "fishon/1.1 (+https://github.com/volare-consulting-software/fishon)",
};
