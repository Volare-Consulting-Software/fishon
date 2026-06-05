import { NextRequest, NextResponse } from "next/server";
import {
  container,
  TOKENS,
  type IGeocoder,
  type ISpeciesProvider,
  type ISpeciesEnrichmentProvider,
} from "@volare-consulting/fishon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_COUNT = 6;

export async function GET(request: NextRequest) {
  const location = request.nextUrl.searchParams.get("location");
  if (!location) {
    return NextResponse.json(
      { error: "location query parameter is required" },
      { status: 400 }
    );
  }
  const namesParam = request.nextUrl.searchParams.get("names");
  const names = namesParam
    ? namesParam.split(",").map((name) => name.trim().toLowerCase())
    : [];

  try {
    const geocoder = container.resolve<IGeocoder>(TOKENS.IGeocoder);
    const speciesProvider = container.resolve<ISpeciesProvider>(
      TOKENS.ISpeciesProvider
    );
    const enrichment = container.resolve<ISpeciesEnrichmentProvider>(
      TOKENS.ISpeciesEnrichmentProvider
    );

    const [geo, species] = await Promise.all([
      geocoder.geocode(location),
      speciesProvider.getSpecies(location),
    ]);

    const selected =
      names.length > 0
        ? species.filter((fish) => names.includes(fish.commonName.toLowerCase()))
        : species.slice(0, DEFAULT_COUNT);

    const profiles = await enrichment.enrich(selected, geo);
    return NextResponse.json(profiles);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
