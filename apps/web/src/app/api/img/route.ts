import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Same-origin proxy for fish photos so they can be cached immutably at the
// edge/browser ("forever") instead of re-fetched from iNaturalist/Fish Rules on
// every load. Hosts are allow-listed to prevent the route being an open proxy.
const ALLOWED_HOSTS = new Set([
  "inaturalist-open-data.s3.amazonaws.com",
  "static.inaturalist.org",
  "app.fishrulesapp.com",
]);

function isAllowed(host: string): boolean {
  return ALLOWED_HOSTS.has(host) || host.endsWith(".inaturalist.org");
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("u");
  if (!raw) {
    return NextResponse.json({ error: "u is required" }, { status: 400 });
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }
  if (url.protocol !== "https:" || !isAllowed(url.hostname)) {
    return NextResponse.json({ error: "host not allowed" }, { status: 400 });
  }

  try {
    const upstream = await fetch(url, {
      headers: { "User-Agent": "fishon/1.2 (+https://github.com/volare-consulting-software/fishon)" },
      // Let the platform cache the upstream fetch too.
      cache: "force-cache",
    });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "upstream error" }, { status: 502 });
    }
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
        // Images are content-addressed and never change → cache forever.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
