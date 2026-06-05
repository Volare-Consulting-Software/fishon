# FishOn — Fishing Forecast & Tides

A Node.js tool for fishing forecasts. Combines 7-day wind, wave, and weather data from [FishWeather](https://fishweather.com) with NOAA tide predictions and moon phase calculations. Provide a location and it finds the nearest stations automatically. Available as a CLI, Node.js library, and MCP server for Claude Code.

## Data Captured

**Weather forecast** (per day, AM and PM):

- **Peak Wind Speed** (mph) and **Gust Speed** (mph)
- **Wind Direction** (compass bearing and degrees, where the wind is blowing **from**)
- **Wave Height** (ft)
- **Air Temperature** (°F)
- **Cloud Cover** (%) and **Rain Chance** (%)

**Tides** (per day, from NOAA):

- **High/Low tide times** and **heights** (ft, MLLW datum)
- Sourced from the nearest NOAA tide prediction station

**Moon phase** (per day):

- **Phase name**: New Moon, Waxing Crescent, First Quarter, Waxing Gibbous, Full Moon, Waning Gibbous, Last Quarter, Waning Crescent
- **Illumination %**: 0% (new) to 100% (full)

## Install from npm

```bash
npm install -g @volare-consulting/fishon
npx playwright install chromium
fishon "southport, nc"
```

Or use via `npx` without installing:

```bash
npx @volare-consulting/fishon "key west, fl"
```

## Setup (from source)

Requires [Node.js](https://nodejs.org/) (v18+).

```bash
git clone https://github.com/volare-consulting-software/fishon.git
cd fishon
npm install
npx playwright install chromium
```

### Build

```bash
npm run build
```

## Usage

```bash
npm run forecast -- <location> [options]
```

### Examples

```bash
# Full fishing forecast (weather + tides + moon)
npm run forecast -- "southport, nc"

# Tides only (no weather scraping — fast)
npm run forecast -- "southport, nc" --tides

# JSON output (useful for piping to other tools)
npm run forecast -- "key west, fl" --json

# Tides as JSON
npm run forecast -- "key west, fl" --tides --json

# Show the browser window while scraping (for debugging)
npm run forecast -- "outer banks" --visible
```

### Options

| Flag        | Description                                       |
|-------------|---------------------------------------------------|
| `--tides`   | Show only NOAA tide predictions (no weather)      |
| `--json`    | Output as JSON instead of formatted text           |
| `--visible` | Show the browser window during scraping            |
| `--mcp`     | Start as an MCP server (for Claude Code)           |

### Sample Output — Full Forecast

```
Searching for stations near "southport, nc"...
Found station: Cape Fear Pilot (ID: 54114)

Cape Fear Pilot - 7 Day Forecast
Tides: Southport (NOAA 8659084)
Fetched: 4/7/2026, 11:11:08 AM

--- Tue 2026-04-07 | Waning Gibbous 72% ---
    Tides: H4.5ft@00:00 L0.7ft@06:22 H3.5ft@12:18 L0.6ft@18:15
  AM  Wind 12 mph (g14) SW (220°)       Waves 2.5ft  59°F  Cloud 100%  Rain 0%
  PM  Wind 25 mph (g31) SW (228°)       Waves 4.6ft  65°F  Cloud 100%  Rain 0%
--- Wed 2026-04-08 | Waning Gibbous 62% ---
    Tides: H4.3ft@00:49 L0.8ft@07:11 H3.4ft@13:09 L0.7ft@19:05
  AM  Wind 27 mph (g36) SSW (211°)      Waves 5.7ft  51°F  Cloud  67%  Rain 0%
  PM  Wind 25 mph (g28) SW (220°)       Waves 5.9ft  57°F  Cloud  67%  Rain 0%
--- Fri 2026-04-10 | Last Quarter 41% ---
    Tides: H4.2ft@02:40 L0.9ft@09:09 H3.4ft@15:09 L0.8ft@21:10
  AM  Wind 16 mph (g19) SSW (204°)      Waves 4.3ft  55°F  Cloud  15%  Rain 0%
  PM  Wind 11 mph (g12) SW (214°)       Waves 3.3ft  64°F  Cloud  11%  Rain 0%
```

### Sample Output — Tides Only

```
Fetching tides near "southport, nc"...

Tide Predictions — Southport (NOAA 8659084)
Fetched: 4/7/2026, 11:13:34 AM

2026-04-07
  High 4.5 ft  @ 00:00
  Low  0.7 ft  @ 06:22
  High 3.5 ft  @ 12:18
  Low  0.6 ft  @ 18:15
2026-04-08
  High 4.3 ft  @ 00:49
  Low  0.8 ft  @ 07:11
  High 3.4 ft  @ 13:09
  Low  0.7 ft  @ 19:05
```

## How It Works

### Weather Forecast

1. Searches `fishweather.com/windlist/<location>` for nearby weather stations
2. Selects the first free station (skips PRO/PLUS stations that require a paid subscription)
3. Navigates to that station's spot page and switches to the 7 Day forecast view
4. Extracts wind speed, gust, direction, wave height, temperature, cloud cover, and rain chance for each AM/PM period
5. Reverses the raw wind direction by 180° so it represents where the wind is blowing **from**

### Tides

1. Geocodes the location to lat/lng using the ArcGIS geocoder (free, no key)
2. Finds the nearest NOAA tide prediction station from the full station list (3,400+ stations)
3. Fetches high/low tide predictions from the NOAA CO-OPS API (free, no key)

### Moon Phase

Calculates moon phase and illumination for each day using an astronomical algorithm based on the synodic month. No external API needed.

### Moon Phase for Fishing

Moon phase is included because it affects fish behavior. Around a **Full Moon**, fish tend to feed more actively at night due to increased visibility. The day after a full moon, you can often wait to head out until later in the morning since the fish were up feeding late.

## Architecture

Uses [tsyringe](https://github.com/microsoft/tsyringe) for dependency injection with interface-based services.

```
src/
  types/              — TypeScript types and enums (one file per type)
  interfaces/         — Service interfaces and DI tokens
  services/
    forecastService   — Orchestrator (combines weather + tides + moon)
    weatherScraper    — FishWeather scraping (Playwright browser, station search)
    tideProvider      — NOAA tides (geocode, find station, fetch predictions)
    moonPhaseProvider — Moon phase calculator (pure math)
    geocoder          — ArcGIS geocoding
    httpClient        — HTTPS client
    logger            — Console logger
  formatters/         — Output formatting (shared by CLI and MCP)
  config.ts           — Centralized configuration (API URLs, timeouts)
  container.ts        — DI container registration
  main.ts             — CLI entry point
  mcpServer.ts        — MCP server entry point
test/
  testContainer.ts    — Shared test helper for DI mock registration
  *.test.ts           — Unit tests (vitest + moq.ts)
```

## MCP Server (Claude Code Integration)

This package runs as an [MCP](https://modelcontextprotocol.io/) server, exposing tools that Claude Code can call directly.

### Register with Claude Code

**Via npm (recommended):**

```bash
claude mcp add --transport stdio fishon -- npx @volare-consulting/fishon --mcp
```

**Via local source (this repo):**

The project root `.mcp.json` is already configured. After setup, restart Claude Code and the tools will be available automatically.

**Manual `.mcp.json`:**

```json
{
  "mcpServers": {
    "fishon": {
      "type": "stdio",
      "command": "npx",
      "args": ["@volare-consulting/fishon", "--mcp"]
    }
  }
}
```

### Available Tools

| Tool             | Description                                                  |
|------------------|--------------------------------------------------------------|
| `get_forecast`   | Full 7-day fishing forecast: wind, waves, weather, tides, and moon phase. Takes a `location` parameter. |
| `get_tides`      | NOAA high/low tide predictions only. Takes a `location` parameter and optional `days` (default 7). Fast — no browser needed. |

### Example Prompts in Claude Code

> "What's the wind forecast for Key West this week?"

> "Should I go fishing in Southport this Saturday?"

> "When is high tide in Wrightsville Beach tomorrow?"

Claude will call the appropriate tool and use the data to give you a complete answer.

## Troubleshooting

- **Forecast table did not load** — The site may be blocking headless browsers. Try running with `--visible` to see what's happening. A `debug-screenshot.png` is saved automatically on failure.
- **No free stations found** — All nearby stations may require a Pro/Plus subscription. Try a different or broader location search.
- **Tide data missing** — If NOAA tide data fails to load, the full forecast still works — tides will be omitted with a warning. Use `--tides` separately to debug.
