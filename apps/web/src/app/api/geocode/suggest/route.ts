import { NextRequest, NextResponse } from "next/server";
import {
  container,
  TOKENS,
  type Geocoder,
} from "@volare-consulting/fishon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 3) return NextResponse.json([]);
  try {
    const suggestions = await container
      .resolve<Geocoder>(TOKENS.Geocoder)
      .suggest(q);
    return NextResponse.json(suggestions);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
