import { inject, injectable } from "tsyringe";
import { chromium, Browser, Page } from "playwright";
import { TOKENS, Logger } from "../interfaces";
import { ForecastServiceConfig } from "../config";
import { Station } from "../types/station";
import { ScrapedData } from "../types/scrapedData";
import { ForecastRow } from "../types/forecastRow";

const COMPASS_DIRECTIONS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
] as const;

// When the nearest station has no wave forecast (inland/harbor stations often
// report wind only), fall through to the next candidate, up to this many.
const MAX_STATION_ATTEMPTS = 5;

@injectable()
export class FishweatherScraper {
  constructor(
    @inject(TOKENS.ForecastServiceConfig) private readonly config: ForecastServiceConfig,
    @inject(TOKENS.Logger) private readonly logger: Logger
  ) {}

  async getForecast(
    location: string,
    headless: boolean = true
  ): Promise<{ station: Station; forecast: ForecastRow[] }> {
    const { browser, page } = await this.createBrowser(headless);

    try {
      const stations = await this.findStations(page, location);
      if (stations.length === 0) {
        throw new Error(
          `No free stations found near "${location}". All results may require a Pro/Plus subscription.`
        );
      }

      // Prefer the closest station that actually reports wave height; inland
      // and harbor stations often have wind only. Try candidates in order and
      // fall back to the first that scraped if none report waves.
      let fallback: { station: Station; forecast: ForecastRow[] } | null = null;
      for (const station of stations.slice(0, MAX_STATION_ATTEMPTS)) {
        let forecast: ForecastRow[];
        try {
          forecast = await this.scrapeForecast(page, station.id);
        } catch {
          continue; // this station's forecast didn't load; try the next
        }
        if (!fallback) fallback = { station, forecast };
        if (forecast.some((row) => row.waveHeight > 0)) {
          return { station, forecast };
        }
      }
      if (!fallback) {
        throw new Error(
          `Could not load a forecast for any station near "${location}".`
        );
      }
      return fallback;
    } finally {
      await browser.close();
    }
  }

  private async createBrowser(
    headless: boolean
  ): Promise<{ browser: Browser; page: Page }> {
    const browser = await chromium.launch({
      headless,
      args: [
        "--disable-blink-features=AutomationControlled",
        // Lambda-safe flags. Lambda's kernel forbids the user-namespace
        // clone() Chromium's zygote uses to fork sandboxed children
        // (FATAL credentials.cc "Operation not permitted"), so disable the
        // zygote and run single-process. --disable-dev-shm-usage routes shared
        // memory to /tmp (Lambda's /dev/shm is tiny).
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--no-zygote",
        "--single-process",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 900 },
      locale: "en-US",
    });

    const page = await context.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });

    return { browser, page };
  }

  // Returns every free (non-premium) station for the location, in the order
  // the site lists them (roughly nearest first). The caller picks the closest
  // one that has wave data.
  private async findStations(
    page: Page,
    location: string
  ): Promise<Station[]> {
    const searchUrl = `${this.config.fishweatherBaseUrl}/windlist/${encodeURIComponent(location)}`;
    // domcontentloaded, not load: the page has a resource that never settles,
    // so "load" can hang. Wait for the actual spot rows instead of a fixed
    // sleep — fast when the site is fast, patient up to selectorTimeout.
    await page.goto(searchUrl, {
      waitUntil: "domcontentloaded",
      timeout: this.config.browserTimeout,
    });
    await page.waitForSelector("a.jwx-spot-list-row", {
      timeout: this.config.selectorTimeout,
    });

    // Results are anchor rows (a.jwx-spot-list-row) whose href carries the spot
    // id (/spot/{id}) and whose name lives in a __spot-name child. The windlist
    // exposes no wave indicator, so candidates are filtered by wave data later.
    return page.evaluate(() => {
      const stations: { id: string; name: string }[] = [];
      for (const row of document.querySelectorAll("a.jwx-spot-list-row")) {
        const text = row.textContent?.replace(/\s+/g, " ").trim() ?? "";
        const isPremium =
          text.includes("Pro/Gold") ||
          text.includes("Plus/Pro") ||
          text.includes("PRO Station") ||
          text.includes("PLUS Station");
        if (isPremium) continue;

        const href = row.getAttribute("href") ?? "";
        const id = href.match(/\/spot\/(\d+)/)?.[1] ?? "";
        const name =
          row
            .querySelector(".jwx-spot-list-row__spot-name")
            ?.textContent?.trim() || "";
        if (id && name) stations.push({ id, name });
      }
      return stations;
    });
  }

  private async scrapeForecast(
    page: Page,
    spotId: string
  ): Promise<ForecastRow[]> {
    const spotUrl = `${this.config.fishweatherBaseUrl}/spot/${spotId}`;
    await page.goto(spotUrl, {
      waitUntil: "domcontentloaded",
      timeout: this.config.browserTimeout,
    });

    // The forecast table lazy-renders on scroll; trigger it, then wait for the
    // wind cells to appear rather than sleeping a fixed 8s. The scroll is
    // load-bearing — without it the table never renders.
    await page.evaluate(() => window.scrollTo(0, 1500));

    try {
      await page.waitForSelector('[class*="jw-fxt-table-cell-wind"]', {
        timeout: this.config.selectorTimeout,
      });
    } catch {
      throw new Error(
        "Forecast table did not load. The site may be blocking the request."
      );
    }

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(
        (b) => b.textContent?.trim() === "7 Day"
      );
      if (btn) btn.click();
    });
    // Wait for the 7-day view to populate (>=12 AM/PM wind cells) instead of a
    // fixed sleep; fall through to extraction if it doesn't expand in time.
    await page
      .waitForFunction(
        () =>
          document.querySelectorAll(
            '[class*="jw-fxt-table-cell-wind"][class*="datacell"]'
          ).length >= 12,
        { timeout: 8000 }
      )
      .catch(() => undefined);

    const data: ScrapedData = await page.evaluate(() => {
      const dayCells = document.querySelectorAll(
        '[class*="jw-fxt-table-cell-day"][class*="headday"]'
      );
      const days = Array.from(dayCells).map(
        (c) => c.textContent?.trim() ?? ""
      );

      const hourCells = document.querySelectorAll(
        '[class*="jw-fxt-table-cell-hour"][class*="datacell"]'
      );
      const hours = Array.from(hourCells).map(
        (c) => c.textContent?.trim() ?? ""
      );

      const windCells = document.querySelectorAll(
        '[class*="jw-fxt-table-cell-wind"][class*="datacell"]'
      );
      const winds = Array.from(windCells).map((c) => {
        const divs = c.querySelectorAll("div");
        const texts = Array.from(divs)
          .map((d) => d.textContent?.trim() ?? "")
          .filter((t) => t);
        return {
          speed: parseInt(texts[0] ?? "0") || 0,
          directionDeg: parseInt(texts[1] ?? "0") || 0,
        };
      });

      const waveCells = document.querySelectorAll(
        '[class*="jw-fxt-table-cell-wave"][class*="datacell"]'
      );
      const waves = Array.from(waveCells).map(
        (c) => parseFloat(c.textContent?.trim() ?? "0") || 0
      );

      const gustCells = document.querySelectorAll(
        '[class*="jw-fxt-table-cell-gust"][class*="datacell"]'
      );
      const gusts = Array.from(gustCells).map(
        (c) => parseInt(c.textContent?.trim() ?? "0") || 0
      );

      const tempCells = document.querySelectorAll(
        '[class*="jw-fxt-table-cell-atemp"][class*="datacell"]'
      );
      const temps = Array.from(tempCells).map(
        (c) => parseInt(c.textContent?.trim() ?? "0") || 0
      );

      const cloudCells = document.querySelectorAll(
        '[class*="jw-fxt-table-cell-cloud"][class*="datacell"]'
      );
      const clouds = Array.from(cloudCells).map(
        (c) => parseInt(c.textContent?.trim() ?? "0") || 0
      );

      const precipCells = document.querySelectorAll(
        '[class*="jw-fxt-table-cell-precip"][class*="datacell"]'
      );
      const precip = Array.from(precipCells).map((c) => {
        const cls = c.className || "";
        const match = cls.match(/weather-precip_(\d+)/);
        return match?.[1] ? parseInt(match[1]) : 0;
      });

      return { days, hours, winds, waves, gusts, temps, clouds, precip };
    });

    const dayAbbrs = [
      "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
    ] as const;
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const dayDates: Record<string, string> = {};
    for (let offset = 0; offset < 14; offset++) {
      const d = new Date(today);
      d.setDate(d.getDate() + offset);
      const abbr = dayAbbrs[d.getDay()];
      if (abbr && !dayDates[abbr])
        dayDates[abbr] = d.toISOString().split("T")[0]!;
    }

    const forecast: ForecastRow[] = [];
    for (let i = 0; i < data.hours.length; i++) {
      const dayIndex = Math.floor(i / 2);
      const rawDeg = data.winds[i]?.directionDeg ?? 0;
      const reversedDeg = this.reverseDegrees(rawDeg);
      const dayName = data.days[dayIndex] ?? "";

      forecast.push({
        day: dayName,
        date: dayDates[dayName] ?? "",
        period: data.hours[i] ?? "",
        windSpeed: data.winds[i]?.speed ?? 0,
        windDirDeg: reversedDeg,
        windDirCompass: this.degreesToCompass(reversedDeg),
        waveHeight: data.waves[i] ?? 0,
        gust: data.gusts[i] ?? 0,
        tempF: data.temps[i] ?? 0,
        cloudPct: data.clouds[i] ?? 0,
        precipPct: data.precip[i] ?? 0,
        moonPhase: "",
        moonIllumination: 0,
        tides: [],
      });
    }

    return forecast;
  }

  private degreesToCompass(deg: number): string {
    const index = Math.round(deg / 22.5) % 16;
    return COMPASS_DIRECTIONS[index]!;
  }

  private reverseDegrees(deg: number): number {
    return (deg + 180) % 360;
  }
}
