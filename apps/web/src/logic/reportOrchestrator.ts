import type {
  ForecastService,
  IGeocoder,
  ITideProvider,
  IMoonPhaseProvider,
  IFishingSpotProvider,
  ISpeciesProvider,
  ISpeciesEnrichmentProvider,
  IMarineHourlyProvider,
  ForecastRow,
  FishingSpot,
  FishSpecies,
  GeoLocation,
  TideResult,
  HourlyWindResult,
} from "@volare-consulting/fishweather-forecast";
import { FishingTripRequest } from "@/types/fishingTripRequest";
import { FishingDayReport } from "@/types/fishingDayReport";
import { TimeOfDay } from "@/types/timeOfDay";
import { SuggestionService } from "./suggestionService";

const SPOT_RADIUS_MILES = 50;
const PLANNING_WINDOW_DAYS = 14;
const TIDE_DAYS = 15;
const MAX_ENRICHED_SPECIES = 12;
const DEFAULT_ENRICHED_SPECIES = 6;

export class ReportOrchestrator {
  constructor(
    private readonly forecastService: ForecastService,
    private readonly geocoder: IGeocoder,
    private readonly tideProvider: ITideProvider,
    private readonly moonProvider: IMoonPhaseProvider,
    private readonly spotProvider: IFishingSpotProvider,
    private readonly speciesProvider: ISpeciesProvider,
    private readonly enrichmentProvider: ISpeciesEnrichmentProvider,
    private readonly marineHourlyProvider: IMarineHourlyProvider,
    private readonly suggestionService: SuggestionService
  ) {}

  async buildReports(request: FishingTripRequest): Promise<FishingDayReport[]> {
    const location = request.location;
    const validDates = this.withinPlanningWindow(request.dates);
    if (validDates.length === 0) return [];

    const geo = await this.geocoder.geocode(location);

    // Forecast once (covers the 7-day window); tides cover the full planning
    // window; spots/species/hourly-wind depend only on location. All parallel.
    const [forecast, tides, reefs, species, hourlyWind] = await Promise.all([
      this.forecastService.getForecast(location),
      this.tideProvider.getTides(location, TIDE_DAYS),
      this.spotProvider.getSpots(location, SPOT_RADIUS_MILES),
      this.speciesProvider.getSpecies(location),
      this.marineHourlyProvider.getHourlyWind(geo.lat, geo.lng),
    ]);

    const interested = request.interestedSpecies ?? [];
    const reports = await Promise.all(
      validDates.map((date) =>
        this.buildDayReport(
          date,
          request,
          interested,
          geo,
          forecast.station,
          forecast.forecast,
          tides,
          reefs,
          species,
          hourlyWind
        )
      )
    );

    // Enrich the angler's interested species plus what the suggestions
    // recommend (location-level, identical across days) and attach to each.
    const targets = reports.flatMap((r) => r.suggestion.targetSpecies);
    const profiles = await this.enrichmentProvider.enrich(
      this.speciesToEnrich(species, interested, targets),
      geo
    );
    return reports.map((report) => ({ ...report, speciesProfiles: profiles }));
  }

  private speciesToEnrich(
    species: FishSpecies[],
    interested: string[],
    targets: string[]
  ): FishSpecies[] {
    const byName = new Map(
      species.map((fish) => [fish.commonName.toLowerCase(), fish])
    );
    const picked = new Map<string, FishSpecies>();
    for (const name of [...interested, ...targets]) {
      const fish = byName.get(name.toLowerCase());
      if (fish) picked.set(fish.commonName.toLowerCase(), fish);
    }
    if (picked.size === 0) {
      return species.slice(0, DEFAULT_ENRICHED_SPECIES);
    }
    return Array.from(picked.values()).slice(0, MAX_ENRICHED_SPECIES);
  }

  private async buildDayReport(
    date: string,
    request: FishingTripRequest,
    interested: string[],
    geo: GeoLocation,
    station: string,
    allRows: ForecastRow[],
    tides: TideResult,
    reefs: FishingSpot[],
    species: FishSpecies[],
    hourlyWind: HourlyWindResult
  ): Promise<FishingDayReport> {
    const dayRows = allRows.filter((row) => row.date === date);
    const marineForecastAvailable = dayRows.length > 0;
    const periods = this.filterByTimeOfDay(dayRows, request.timesOfDay);
    const dayTides = tides.byDate[date] ?? [];

    // Moon shown is the previous night's, which drives overnight feeding and
    // therefore the next day's bite timing.
    const previousNight = this.previousDay(date);
    const moon = this.moonProvider.getPhase(previousNight);

    const suggestion = await this.suggestionService.suggest({
      date,
      location: geo,
      marineForecastAvailable,
      periods,
      tides: dayTides,
      moonPhase: moon.phase,
      moonIllumination: moon.illumination,
      reefs,
      species,
      methods: request.methods,
      timesOfDay: request.timesOfDay,
      interestedSpecies: interested,
    });

    return {
      date,
      location: geo,
      station,
      marineForecastAvailable,
      periods,
      allPeriods: dayRows,
      tides: dayTides,
      moonPhase: moon.phase,
      moonIllumination: moon.illumination,
      reefs,
      species,
      speciesProfiles: [],
      hourlyWind: hourlyWind.byDate[date] ?? [],
      suggestion,
    };
  }

  // Keep only requested dates from today through the next 14 days.
  private withinPlanningWindow(dates: string[]): string[] {
    const today = this.todayIso();
    const max = this.addDaysIso(today, PLANNING_WINDOW_DAYS - 1);
    const unique = Array.from(new Set(dates));
    return unique.filter((date) => date >= today && date <= max).sort();
  }

  // The scraped forecast is AM/PM granularity, so time-of-day selections map to
  // periods: morning/midday -> AM, evening -> PM, full day / none -> both.
  private filterByTimeOfDay(
    rows: ForecastRow[],
    timesOfDay: TimeOfDay[]
  ): ForecastRow[] {
    if (timesOfDay.length === 0 || timesOfDay.includes("fullday")) {
      return rows;
    }
    const wantAm = timesOfDay.includes("morning") || timesOfDay.includes("midday");
    const wantPm = timesOfDay.includes("evening");
    const filtered = rows.filter(
      (row) =>
        (wantAm && row.period === "AM") || (wantPm && row.period === "PM")
    );
    return filtered.length > 0 ? filtered : rows;
  }

  private todayIso(): string {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  private addDaysIso(iso: string, days: number): string {
    const date = new Date(`${iso}T12:00:00`);
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  private previousDay(iso: string): string {
    return this.addDaysIso(iso, -1);
  }
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
