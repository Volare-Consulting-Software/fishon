import { NextRequest, NextResponse } from "next/server";
import {
  container,
  TOKENS,
  type SpeciesProvider,
} from "@volare-consulting/fishon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Regulations change slowly; cache the area list ~1 day (browser + CDN) and
// serve stale for a week while revalidating.
const CACHE_CONTROL =
  "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800";

export async function GET(request: NextRequest) {
  const location = request.nextUrl.searchParams.get("location");
  if (!location) {
    return NextResponse.json({ error: "location is required" }, { status: 400 });
  }
  try {
    const result = await container
      .resolve<SpeciesProvider>(TOKENS.SpeciesProvider)
      .getSpecies(location);
    return NextResponse.json(result, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
