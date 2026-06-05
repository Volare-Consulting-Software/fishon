import { ForecastResult } from "../types/forecastResult";
import { TidePrediction, TideResult } from "../types/tide";

export function formatTides(tides: TidePrediction[]): string {
  if (tides.length === 0) return "";
  return tides
    .map((t) => {
      const time = t.time.split(" ")[1] ?? "";
      return `${t.type[0]}${t.height.toFixed(1)}ft@${time}`;
    })
    .join(" ");
}

export function formatForecastTable(result: ForecastResult): string {
  let output = `\n${result.station} - 7 Day Forecast\n`;
  if (result.tideStation) {
    output += `Tides: ${result.tideStation.name} (NOAA ${result.tideStation.id})\n`;
  }
  output += `Fetched: ${new Date().toLocaleString()}\n`;

  let prevDay = "";
  for (const row of result.forecast) {
    const isNewDay = row.day !== prevDay;
    prevDay = row.day;

    if (isNewDay) {
      const moon = `${row.moonPhase} ${row.moonIllumination}%`;
      const tideStr = formatTides(row.tides);
      output += `\n--- ${row.day} ${row.date} | Last Night: ${moon} ---\n`;
      if (tideStr) output += `    Tides: ${tideStr}\n`;
    }

    const dir = `${row.windDirCompass} (${row.windDirDeg}\u00B0)`;
    output += `  ${row.period.padEnd(2)}  Wind ${String(row.windSpeed).padStart(2)} mph (g${String(row.gust).padStart(2)}) ${dir.padEnd(14)}  Waves ${String(row.waveHeight)}ft  ${String(row.tempF)}\u00B0F  Cloud ${String(row.cloudPct).padStart(3)}%  Rain ${String(row.precipPct)}%\n`;
  }

  return output;
}

export function formatTideReport(result: TideResult): string {
  let output = `\nTide Predictions \u2014 ${result.station.name} (NOAA ${result.station.id})\n`;
  output += `Fetched: ${new Date().toLocaleString()}\n\n`;

  for (const [date, tides] of Object.entries(result.byDate)) {
    output += `${date}\n`;
    for (const t of tides) {
      const time = t.time.split(" ")[1] ?? "";
      output += `  ${t.type.padEnd(4)} ${t.height.toFixed(1)} ft  @ ${time}\n`;
    }
  }

  return output;
}
