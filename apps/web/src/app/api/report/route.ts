import { NextRequest, NextResponse } from "next/server";
import { createOrchestrator } from "@/logic/createOrchestrator";
import { FishingTripRequest } from "@/types/fishingTripRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  let body: FishingTripRequest;
  try {
    body = (await request.json()) as FishingTripRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.location || !Array.isArray(body.dates) || body.dates.length === 0) {
    return NextResponse.json(
      { error: "location and at least one date are required" },
      { status: 400 }
    );
  }

  try {
    const reports = await createOrchestrator().buildReports({
      location: body.location,
      dates: body.dates,
      timesOfDay: body.timesOfDay ?? [],
      methods: body.methods ?? [],
      interestedSpecies: body.interestedSpecies ?? [],
    });
    return NextResponse.json(reports);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
