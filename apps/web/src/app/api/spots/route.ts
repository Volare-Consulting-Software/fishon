import { NextRequest, NextResponse } from "next/server";
import {
  container,
  TOKENS,
  type IFishingSpotProvider,
} from "@volare-consulting/fishon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const location = request.nextUrl.searchParams.get("location");
  if (!location) {
    return NextResponse.json({ error: "location is required" }, { status: 400 });
  }
  const radiusMiles =
    Number(request.nextUrl.searchParams.get("radiusMiles") ?? 50) || 50;
  try {
    const result = await container
      .resolve<IFishingSpotProvider>(TOKENS.IFishingSpotProvider)
      .getSpots(location, radiusMiles);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
