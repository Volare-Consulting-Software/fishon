import { NextRequest, NextResponse } from "next/server";
import {
  container,
  TOKENS,
  type IGeocoder,
  type IMarineHourlyProvider,
} from "@volare-consulting/fishon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const location = request.nextUrl.searchParams.get("location");
  if (!location) {
    return NextResponse.json({ error: "location is required" }, { status: 400 });
  }
  try {
    const geo = await container
      .resolve<IGeocoder>(TOKENS.IGeocoder)
      .geocode(location);
    const result = await container
      .resolve<IMarineHourlyProvider>(TOKENS.IMarineHourlyProvider)
      .getHourlyWind(geo.lat, geo.lng);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
