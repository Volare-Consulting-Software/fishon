import { ForecastResult } from "../types/forecastResult";
import { TidePrediction, TideResult } from "../types/tide";
import { FishingSpot } from "../types/fishingSpot";
import { FishSpecies } from "../types/fishSpecies";
import { SpeciesProfile } from "../types/speciesProfile";

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

export function formatSpotsReport(spots: FishingSpot[]): string {
  if (spots.length === 0) return "No nearby fishing spots or structures found.";
  let output = `\nNearby fishing spots & structures (${spots.length})\n`;
  for (const s of spots) {
    const depth = s.depthFeet !== undefined ? ` · ${s.depthFeet} ft` : "";
    const material = s.material ? ` · ${s.material}` : "";
    output += `  ${s.kind.padEnd(16)} ${s.name} — ${s.distanceMiles.toFixed(1)} mi${depth}${material} (${s.source})\n`;
    output += `      ${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}\n`;
  }
  return output;
}

export function formatSpeciesReport(species: FishSpecies[]): string {
  if (species.length === 0) return "No species records found for this area.";
  let output = `\nFish you can target nearby (${species.length})\n`;
  for (const s of species) {
    const tags: string[] = [];
    if (s.waterType) tags.push(s.waterType);
    if (s.prohibited) tags.push("no-harvest");
    else if (s.bagLimit !== null && s.bagLimit !== undefined)
      tags.push(`bag ${s.bagLimit}`);
    const suffix = tags.length ? ` [${tags.join(", ")}]` : "";
    output += `  ${s.commonName} (${s.scientificName})${suffix}\n`;
  }
  return output;
}

export function formatSpeciesProfilesReport(profiles: SpeciesProfile[]): string {
  if (profiles.length === 0) return "No species profiles available.";
  let output = `\nSpecies profiles (${profiles.length})\n`;
  for (const p of profiles) {
    output += `\n${p.commonName} (${p.scientificName}) — edibility: ${p.edibility}\n`;
    if (p.regulation) {
      const r = p.regulation;
      const unit = r.sizeUnit ?? "in";
      const bag = r.bagLimit !== null ? `bag ${r.bagLimit}` : "no bag limit";
      const sizes: string[] = [];
      if (r.minSize !== null) sizes.push(`min ${r.minSize}${unit}`);
      if (r.maxSize !== null) sizes.push(`max ${r.maxSize}${unit}`);
      if (r.minSlotSize !== null && r.maxSlotSize !== null)
        sizes.push(`slot ${r.minSlotSize}-${r.maxSlotSize}${unit}`);
      if (r.measurementName) sizes.push(`(${r.measurementName})`);
      const status =
        r.status === "prohibited"
          ? "NO HARVEST"
          : r.status === "out-of-season"
            ? "OUT OF SEASON"
            : "open";
      const detail = [bag, ...sizes].filter(Boolean).join(" · ");
      output += `  ${status} · ${detail} (${r.locationName})\n`;
    }
    if (p.summary) output += `  ${p.summary}\n`;
    output += `  Regulations: ${p.regulationsLabel} — ${p.regulationsUrl}\n`;
  }
  return output;
}
