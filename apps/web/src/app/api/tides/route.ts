import { NextRequest, NextResponse } from "next/server";
import {
  container,
  TOKENS,
  type ITideProvider,
} from "@volare-consulting/fishon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const location = request.nextUrl.searchParams.get("location");
  if (!location) {
    return NextResponse.json({ error: "location is required" }, { status: 400 });
  }
  const days = Number(request.nextUrl.searchParams.get("days") ?? 7) || 7;
  try {
    const result = await container
      .resolve<ITideProvider>(TOKENS.ITideProvider)
      .getTides(location, days);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
