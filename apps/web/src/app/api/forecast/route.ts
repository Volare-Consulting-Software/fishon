import { NextRequest, NextResponse } from "next/server";
import {
  container,
  ForecastService,
} from "@volare-consulting/fishon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const location = request.nextUrl.searchParams.get("location");
  if (!location) {
    return NextResponse.json({ error: "location is required" }, { status: 400 });
  }
  try {
    const result = await container.resolve(ForecastService).getForecast(location);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
