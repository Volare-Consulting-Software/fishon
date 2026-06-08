# @volare-consulting/fishon

**Real fishing-trip conditions for a location — as an MCP server, a CLI, and a Node.js library.**

FishOn pulls together the data you actually need to plan a day on the water and returns it as structured, grounded results (no invented spots or species):

- **Weather** — 7-day AM/PM wind, gust, wind direction, wave height, air temp, cloud cover, and rain chance, scraped from [FishWeather](https://fishweather.com).
- **Hourly wind** — intraday wind speed/gust/direction from the NOAA NWS gridpoint forecast.
- **Tides** — NOAA high/low tide predictions from the nearest station (feet, MLLW).
- **Moon** — phase and illumination for each day.
- **Fishing spots** — artificial reefs (with material/depth where available) from state & NOAA datasets, plus piers, jetties/breakwaters, and designated fishing spots from OpenStreetMap.
- **Species** — fish you can target nearby, sourced from the Fish Rules per-area regulation list (falling back to OBIS occurrence data + WoRMS common names where Fish Rules has no coverage), with enriched profiles: photo, description, edibility, and regulations (bag, min/max & slot size, measurement type, and open / out-of-season / no-harvest status for the location).

The MCP server is the headline use: it gives Claude (or any MCP client) six tools to ground fishing advice in real local data.

---

## Use as an MCP server (Claude Code)

Register it in one command — no install needed, `npx` fetches it on demand:

```bash
claude mcp add --transport stdio fishon -- npx -y @volare-consulting/fishon --mcp
```

Or add it to a project's `.mcp.json`:

```json
{
  "mcpServers": {
    "fishon": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@volare-consulting/fishon", "--mcp"]
    }
  }
}
```

Restart the client and the tools below are available. Every tool takes a free-form
`location` (city/state, landmark, or zip — e.g. `"southport, nc"`) and returns both a
human-readable summary and a structured JSON payload for the assistant.

### Tools

| Tool | Arguments | Returns |
| --- | --- | --- |
| **`get_forecast`** | `location` | 7-day forecast, AM & PM per day: wind speed, gust, wind direction (where it's blowing **from**), wave height, air temp, cloud %, rain %, moon phase, and that day's tides. |
| **`get_hourly_wind`** | `location` | NOAA NWS **hourly** wind (speed, gust, direction) grouped by local date — the intraday detail the AM/PM forecast can't give. |
| **`get_tides`** | `location`, `days` (default `7`) | High/low tide times and heights (ft, MLLW) from the nearest NOAA station. |
| **`get_fishing_spots`** | `location`, `radiusMiles` (default `50`) | Nearby artificial reefs, piers, jetties/breakwaters, and fishing spots — each with kind, distance (mi), and source. |
| **`get_species`** | `location` | Fish you can target near the location, from the Fish Rules per-area list (falls back to OBIS + WoRMS where Fish Rules has no coverage). Real, catchable-in-the-area grounding. |
| **`get_species_profiles`** | `location` | Enriched profiles for the top species: photo, short description (Wikipedia), edibility rating, Fish Rules regulations (bag, min/max & slot size, measurement type, open / out-of-season / no-harvest status), and a link to official state regs. |

**Example prompt once registered:**
> "Plan me a half-day of shore fishing near Southport, NC this weekend — use the forecast, tides, and what's actually biting."

Claude will call `get_forecast`, `get_tides`, `get_fishing_spots`, and `get_species` and build a recommendation grounded only in what those tools return.

---

## Use as a CLI

```bash
# one-off, no install
npx @volare-consulting/fishon "southport, nc"

# or install globally
npm install -g @volare-consulting/fishon
fishon "key west, fl"
```

Options:

| Flag | Effect |
| --- | --- |
| `--json` | Output JSON instead of a formatted table |
| `--tides` | NOAA tide predictions only (no weather scrape) |
| `--visible` | Show the scraper browser window (debugging) |
| `--mcp` | Run as an MCP server over stdio |

---

## Use as a library

```ts
import "reflect-metadata";
import { container, ForecastService, TOKENS, type TideProvider } from "@volare-consulting/fishon";

const forecast = await container.resolve(ForecastService).getForecast("southport, nc");
const tides = await container.resolve<TideProvider>(TOKENS.TideProvider).getTides("southport, nc", 7);
```

The package ships full TypeScript types. Services are wired with [tsyringe](https://github.com/microsoft/tsyringe); resolve them from the exported `container` using the `TOKENS` symbols. `import "reflect-metadata"` once at your entry point.

---

## Requirements

- **Node.js 18+**
- **Chromium for Playwright** — the weather forecast and spots are scraped with a headless browser. Install it once:
  ```bash
  npx playwright install chromium
  ```
  (Tide, hourly-wind, species, and moon data are pure HTTP/compute and don't need the browser.)

## Configuration (optional)

| Env var | Purpose |
| --- | --- |
| `FISHON_API_BASE_URL` | Run the MCP against a hosted FishOn HTTP API instead of scraping/fetching locally. The API routes wrap the **same** core functions, so results are identical. |
| `FISHRULES_CLIENT_ID`, `FISHRULES_API_KEY` | Optional override for the Fish Rules client id / api key. Not required — Fish Rules works out of the box (the public key is captured from the live site at runtime, with a baked-in fallback). Set these only to pin a specific pair. |

## How it works

All deterministic logic lives in this one package — the CLI, the MCP tools, and (in the
companion web app) the HTTP API routes are thin faces over the same functions, so they
can never drift. Data sources: FishWeather (weather scrape), NOAA CO-OPS (tides), NOAA
NWS gridpoints (hourly wind), ArcGIS + state/NOAA reef services and OpenStreetMap
(spots), Fish Rules (species + regulations + photos, with OBIS + WoRMS as the
species fallback), Wikipedia + iNaturalist (descriptions/photos for the fallback).

## License

MIT
